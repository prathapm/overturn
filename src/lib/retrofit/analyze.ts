import "server-only";
import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";
import { generateCode, generateMarkdown } from "./generate";
import type { Evidence, Finding, FormScan, PageScan, Report, SchemaProp, TableScan, ToolRec } from "./types";

/**
 * Overturn Retrofit — agent-readiness analyzer.
 *
 * Fetches a handful of same-origin pages, reads their affordances (forms, tables, documents,
 * submission instructions, session, iframes, headers) and turns them into findings and a
 * recommended WebMCP tool inventory. Deterministic heuristics; no LLM in the loop.
 */

export const LIMITS = { pages: 8, perPageMs: 3500, totalMs: 8000, bytes: 1_000_000, redirects: 3, concurrency: 4 };

export class AnalyzeError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// ---------- URL safety ----------

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return false;
}

export async function assertSafeUrl(u: URL, allowLocal: boolean): Promise<void> {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new AnalyzeError("Only http(s) URLs can be analyzed.");
  const host = u.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  if (local) {
    if (allowLocal) return;
    throw new AnalyzeError("Local addresses are not allowed.");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) throw new AnalyzeError("Internal hostnames are not allowed.");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new AnalyzeError("Private network addresses are not allowed.");
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new AnalyzeError(`Could not resolve ${host}.`, 422);
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new AnalyzeError("That hostname resolves to a private address.");
}

// ---------- fetching ----------

type Fetched = { status: number; html: string; headers: Headers; finalUrl: string };

async function fetchPage(url: string, allowLocal: boolean): Promise<Fetched> {
  let current = url;
  for (let hop = 0; hop <= LIMITS.redirects; hop++) {
    const u = new URL(current);
    await assertSafeUrl(u, allowLocal);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), LIMITS.perPageMs);
    try {
      const res = await fetch(u, {
        redirect: "manual",
        signal: ac.signal,
        headers: { "user-agent": "OverturnRetrofit/0.1 (+https://overturn-one.vercel.app/retrofit)", accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc) return { status: res.status, html: "", headers: res.headers, finalUrl: u.toString() };
        current = new URL(loc, u).toString();
        continue;
      }
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("html") && !ct.includes("xml")) return { status: res.status, html: "", headers: res.headers, finalUrl: u.toString() };
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          chunks.push(value);
          size += value.length;
          if (size >= LIMITS.bytes) {
            await reader.cancel().catch(() => {});
            break;
          }
        }
      }
      const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
      return { status: res.status, html, headers: res.headers, finalUrl: u.toString() };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AnalyzeError("Too many redirects.");
}

// ---------- page scanning ----------

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const snip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function grab(text: string, re: RegExp, max = 3): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(re)) {
    out.add(snip(norm(m[0])));
    if (out.size >= max) break;
  }
  return Array.from(out);
}

export function scanHtml(html: string, url: string, headers: Headers | null, status: number): PageScan {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;
  $("script, style, noscript, template, svg").remove();
  $("p, li, td, th, h1, h2, h3, h4, h5, dt, dd, div, tr, br, section, article, label, option").each((_, el) => { $(el).append(" "); });
  const text = norm($("body").text() || "");
  const prevHeading = (el: cheerio.Cheerio<import("domhandler").Element>) => {
    const inside = el.find("legend, h1, h2, h3").first().text();
    if (inside) return norm(inside);
    const prev = el.prevAll("h1, h2, h3, h4").first().text() || el.closest("section, article, fieldset, div").find("h1, h2, h3").first().text();
    return norm(prev || $("h1").first().text() || $("title").text());
  };

  const forms: FormScan[] = [];
  $("form").each((_, f) => {
    const el = $(f);
    const fields: FormScan["fields"] = [];
    el.find("input, select, textarea").each((_, i) => {
      const it = $(i);
      const type = (it.attr("type") ?? (i.tagName === "select" ? "select" : i.tagName === "textarea" ? "textarea" : "text")).toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
      const id = it.attr("id");
      const label = norm((id && $(`label[for="${id}"]`).text()) || it.closest("label").text() || it.attr("placeholder") || it.attr("aria-label") || it.attr("name") || type);
      const options = i.tagName === "select" ? it.find("option").map((_, o) => norm($(o).text())).get().filter(Boolean).slice(0, 12) : undefined;
      fields.push({ name: it.attr("name") ?? id ?? label, type, label, options, required: it.attr("required") !== undefined });
    });
    const submit = el.find('button[type="submit"], input[type="submit"], button:not([type])').first();
    const submitLabel = norm(submit.attr("value") || submit.text() || "Submit");
    const isSearch = fields.some((x) => x.type === "search" || /search|query|^q$/i.test(x.name) || /search/i.test(x.label)) || /search/i.test(el.attr("role") ?? "");
    forms.push({
      action: el.attr("action") ?? "",
      method: (el.attr("method") ?? "get").toLowerCase(),
      heading: prevHeading(el),
      submitLabel,
      fields,
      hasFile: fields.some((x) => x.type === "file"),
      hasPassword: fields.some((x) => x.type === "password"),
      isSearch,
    });
  });

  const tables: TableScan[] = [];
  let detailPairs = $("dl dt").length;
  $("table").each((_, t) => {
    const el = $(t);
    const headers = el.find("thead th, tr:first-child th").map((_, h) => norm($(h).text())).get().filter(Boolean);
    const rows = el.find("tbody tr").length || Math.max(0, el.find("tr").length - (headers.length ? 1 : 0));
    const cols = el.find("tr").first().find("td, th").length;
    if (headers.length >= 2 && rows >= 1) tables.push({ heading: prevHeading(el), headers, rows });
    else if (cols === 2) detailPairs += el.find("tr").length;
  });

  const links = { total: 0, sameOrigin: 0, pdf: [] as string[], mailto: [] as string[], tel: [] as string[], downloads: [] as string[] };
  $("a[href]").each((_, a) => {
    const href = ($(a).attr("href") ?? "").trim();
    const label = norm($(a).text()) || href;
    links.total++;
    if (href.startsWith("mailto:")) links.mailto.push(label);
    else if (href.startsWith("tel:")) links.tel.push(label);
    else {
      try {
        const abs = new URL(href, url);
        if (abs.origin === origin) links.sameOrigin++;
        if (/\.pdf(\?|$)/i.test(abs.pathname)) links.pdf.push(label);
        else if ($(a).attr("download") !== undefined || /\.(docx?|xlsx?|zip|csv)(\?|$)/i.test(abs.pathname)) links.downloads.push(label);
      } catch {
        /* ignore */
      }
    }
  });

  const textSignals = {
    fax: grab(text, /\bfax(?:ed|ing)?\b[^.]{0,90}/gi),
    mail: grab(text, /\b(?:mail (?:it|the form|this|to)|by mail|p\.?o\.? box)\b[^.]{0,90}/gi),
    cannotSubmit: grab(text, /(?:cannot|can't|unable to|may not) be (?:submitted|completed|filed|processed) (?:online|through this (?:web)?site|electronically)[^.]{0,60}|not available online[^.]{0,60}/gi),
    phoneOnly: grab(text, /\bcall (?:us|member services|customer service|the plan)[^.]{0,80}?(?:\d{3}[-.\s]\d{3}[-.\s]\d{4}|\(\d{3}\)\s?\d{3}[-.\s]\d{4})[^.]{0,60}/gi),
    printSign: grab(text, /(?:download and print|print (?:and|,)|wet signature|in blue or black ink|notari[sz]ed|original signature)[^.]{0,80}/gi),
    rules: grab(text, /(?:see|refer to) (?:the )?(?:attached|enclosed)[^.]{0,60}|\bpolicy\s+[A-Z]{2,}-[A-Z0-9-]+[^.]{0,60}|(?:medical|coverage|eligibility) (?:policy|criteria|guidelines?)[^.]{0,60}/gi),
  };

  const pagination = $('a[rel="next"], a:contains("Next"), a:contains("›"), a:contains("»")').length > 0 || /[?&](page|p|offset|start)=\d+/.test($("a[href]").map((_, a) => $(a).attr("href") ?? "").get().join(" "));

  return {
    url,
    status,
    title: norm($("title").first().text()),
    h1: norm($("h1").first().text()),
    forms,
    tables,
    detailPairs,
    links,
    iframes: $("iframe").length,
    textSignals,
    hasModelContext: /modelContext|\btoolname=/.test(html),
    objectHint: objectOf(text),
    headers: { originAgentCluster: headers?.get("origin-agent-cluster") ?? null, permissionsPolicy: headers?.get("permissions-policy") ?? null },
    pagination,
  };
}

// ---------- crawl ----------

function normalizeUrl(u: URL): string {
  u.hash = "";
  let s = u.toString();
  if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
  return s;
}

function extractLinks(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  const origin = new URL(base).origin;
  const out: string[] = [];
  $("a[href]").each((_, a) => {
    const href = ($(a).attr("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    try {
      const abs = new URL(href, base);
      if (abs.origin !== origin) return;
      if (/\.(pdf|png|jpe?g|gif|svg|css|js|zip|docx?|xlsx?|mp4|ico)(\?|$)/i.test(abs.pathname)) return;
      if (/logout|signout|sign-out/i.test(abs.pathname)) return;
      out.push(normalizeUrl(abs));
    } catch {
      /* ignore */
    }
  });
  return Array.from(new Set(out));
}

async function crawl(rootUrl: string, allowLocal: boolean): Promise<PageScan[]> {
  const started = Date.now();
  const root = normalizeUrl(new URL(rootUrl));
  const rootPath = new URL(root).pathname.replace(/\/$/, "");
  const rootDepth = rootPath.split("/").filter(Boolean).length;
  const queue: string[] = [root];
  const seen = new Set<string>([root]);
  const pages: PageScan[] = [];

  const worker = async () => {
    while (queue.length && pages.length + LIMITS.concurrency <= LIMITS.pages + LIMITS.concurrency - 1 && Date.now() - started < LIMITS.totalMs) {
      const url = queue.shift();
      if (!url || pages.length >= LIMITS.pages) return;
      try {
        const f = await fetchPage(url, allowLocal);
        const scan = f.html ? scanHtml(f.html, f.finalUrl, f.headers, f.status) : { ...scanHtml("", f.finalUrl, f.headers, f.status), error: "non-HTML response" };
        pages.push(scan);
        if (f.html && pages.length < LIMITS.pages) {
          for (const l of extractLinks(f.html, f.finalUrl)) {
            const lp = new URL(l).pathname;
            const depth = lp.split("/").filter(Boolean).length;
            const inScope = !rootPath || lp === rootPath || lp.startsWith(rootPath + "/");
            if (inScope && !seen.has(l) && depth <= rootDepth + 2 && seen.size < LIMITS.pages * 4) {
              seen.add(l);
              queue.push(l);
            }
          }
        }
      } catch (err) {
        if (err instanceof AnalyzeError && pages.length === 0) throw err;
        pages.push({ ...scanHtml("", url, null, 0), error: err instanceof Error ? err.message : String(err) });
      }
    }
  };
  // The root must be fetched first so its links seed the queue.
  await worker();
  await Promise.all(Array.from({ length: LIMITS.concurrency - 1 }, () => worker()));
  return pages;
}

// ---------- findings + tools ----------

const slug = (s: string, words = 3) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !/\d/.test(w) && !["the", "a", "an", "your", "my", "of", "to", "and", "or", "for", "this", "form", "pdf", "page"].includes(w))
    .slice(0, words)
    .join("_")
    .slice(0, 30) || "item";

function objectOf(text: string): string | null {
  const m = text.match(/\b(?:file|submit|request|start|make)\s+(?:an?|your|the)\s+([A-Za-z]+)(?:\s([a-z]+))?\b/);
  if (!m) return null;
  const stop = new Set(["and", "or", "to", "for", "online", "form", "request", "by", "with", "in", "on", "at", "within", "before", "after", "download", "print"]);
  const words = [m[1].toLowerCase(), ...(m[2] && !stop.has(m[2]) ? [m[2]] : [])];
  return slug(words.join(" "), 2) || null;
}

function schemaFromFields(fields: FormScan["fields"]): ToolRec["inputSchema"] {
  const properties: Record<string, SchemaProp> = {};
  const required: string[] = [];
  for (const f of fields.slice(0, 12)) {
    const key = slug(f.name || f.label, 3) || `field_${Object.keys(properties).length + 1}`;
    if (properties[key]) continue;
    const type: SchemaProp["type"] = f.type === "number" || f.type === "range" ? "number" : f.type === "checkbox" ? "boolean" : "string";
    properties[key] = { type, description: snip(f.label, 100), ...(f.options?.length ? { enum: f.options } : {}) };
    if (f.required) required.push(key);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}) };
}

function pushEvidence(list: Evidence[], page: string, snippet: string) {
  if (list.length < 6) list.push({ page, snippet: snip(snippet) });
}

export function derive(pages: PageScan[], origin: string): { findings: Finding[]; tools: ToolRec[] } {
  const findings: Finding[] = [];
  const tools: ToolRec[] = [];
  const names = new Set<string>();
  const add = (t: ToolRec) => {
    if (names.has(t.name) || tools.length >= 16) return;
    names.add(t.name);
    tools.push(t);
  };
  const siteName = slug(new URL(origin).hostname.split(".").slice(-2, -1)[0] ?? "site", 1);

  const ev = { pdf: [] as Evidence[], offline: [] as Evidence[], form: [] as Evidence[], rules: [] as Evidence[], phone: [] as Evidence[], iframe: [] as Evidence[], login: [] as Evidence[], pag: [] as Evidence[], existing: [] as Evidence[] };
  const objectName: string | null = pages.map((p) => p.objectHint).find((x): x is string => !!x) ?? null;
  let accountSignal = false;

  for (const p of pages) {
    const page = new URL(p.url).pathname || "/";
    const bodyText = [p.title, p.h1, ...p.textSignals.fax, ...p.textSignals.mail, ...p.textSignals.cannotSubmit, ...p.textSignals.printSign].join(" ");
    if (/member id|account|signed in|log ?out|my (claims|orders|account)/i.test(p.title + " " + p.h1 + " " + bodyText)) accountSignal = true;

    for (const l of p.links.pdf) {
      pushEvidence(ev.pdf, page, l);
      const isForm = /form|application|request|worksheet/i.test(l);
      if (isForm) {
        const formName = slug((l.split(/\s[—:–-]\s/).pop() ?? l).replace(/\b(form|request)\b/gi, ""), 2) || "form";
        if (objectName && formName.includes(objectName)) continue; // the offline-channel trio covers it
        add({ name: `draft_${formName}`, kind: "write", description: `Structured version of the "${snip(l, 60)}" PDF: propose field values; the page renders the draft for the user to edit. Nothing is submitted.`, inputSchema: { type: "object", properties: { fields: { type: "string", description: "JSON object of field values" } } }, source: { page, affordance: `PDF form link "${snip(l, 60)}"` }, why: "A PDF form is unusable by an agent; a typed draft tool is not." });
      } else {
        add({ name: `get_${slug(l, 2) || "document"}`, kind: "read", description: `Structured contents of "${snip(l, 60)}" — the fields an agent would otherwise have to extract from the PDF.`, inputSchema: { type: "object", properties: { id: { type: "string", description: "Document or reference id" } } }, source: { page, affordance: `PDF link "${snip(l, 60)}"` }, why: "Data trapped in a document becomes a read tool." });
      }
    }
    for (const s of [...p.textSignals.fax, ...p.textSignals.mail, ...p.textSignals.cannotSubmit, ...p.textSignals.printSign]) pushEvidence(ev.offline, page, s);
    for (const s of p.textSignals.phoneOnly) pushEvidence(ev.phone, page, s);
    if (p.iframes) pushEvidence(ev.iframe, page, `${p.iframes} iframe(s)`);
    if (p.pagination) pushEvidence(ev.pag, page, "pagination links");
    if (p.hasModelContext) pushEvidence(ev.existing, page, "document.modelContext / declarative tool attributes present");
    for (const s of p.textSignals.rules) pushEvidence(ev.rules, page, s);

    for (const t of p.tables) {
      add({ name: `list_${slug(t.heading || p.h1 || p.title, 2) || "items"}`, kind: "read", description: `List "${snip(t.heading || p.h1, 50)}" rows with columns ${t.headers.slice(0, 6).join(", ")}. Returns ids for detail tools.`, inputSchema: { type: "object", properties: { query: { type: "string", description: "Optional filter" }, ...(p.pagination ? { page: { type: "integer", description: "Page number" } } : {}) } }, source: { page, affordance: `table "${snip(t.heading, 40)}" (${t.rows} rows)` }, why: "A table is a list the agent should query, not scrape." });
    }
    if (p.detailPairs >= 3 && p.h1) {
      add({ name: `get_${slug(p.h1, 2) || "detail"}`, kind: "read", description: `Structured detail for "${snip(p.h1.replace(/[A-Z]{1,4}-?\d[\w-]*/g, "").trim(), 50)}": every label/value pair on the page, plus ids and dates.`, inputSchema: { type: "object", properties: { id: { type: "string", description: "Reference id" } }, required: ["id"] }, source: { page, affordance: `${p.detailPairs} label/value pairs` }, why: "Detail pages are read tools." });
    }
    for (const f of p.forms) {
      if (f.hasPassword) {
        pushEvidence(ev.login, page, `sign-in form (${f.fields.length} fields)`);
        continue;
      }
      if (f.isSearch) {
        add({ name: `search_${siteName}`, kind: "read", description: `Search ${siteName} the way the site's own search box does; returns matching items with ids.`, inputSchema: { type: "object", properties: { query: { type: "string", description: "Search terms" } }, required: ["query"] }, source: { page, affordance: "search form" }, why: "Search boxes are read tools." });
        continue;
      }
      if (f.fields.length === 0) continue;
      if (f.fields.length >= 4 || f.hasFile) pushEvidence(ev.form, page, `${f.heading || f.submitLabel}: ${f.fields.length} fields${f.hasFile ? ", file upload" : ""}`);
      const consequential = f.hasFile || f.fields.length >= 4 || /submit|file|apply|pay|sign|send|order|book|confirm|delete|cancel|request|checkout/i.test(f.submitLabel + " " + f.heading);
      add({ name: `${consequential ? "submit" : "propose"}_${slug(f.heading || f.submitLabel, 2) || "form"}`, kind: consequential ? "gated" : "write", description: consequential ? `Prepare "${snip(f.heading || f.submitLabel, 40)}" for submission from typed inputs. Returns pending_confirmation and shows a confirm card; only the user's click submits.` : `Fill "${snip(f.heading || f.submitLabel, 40)}" from typed inputs; the page renders the proposal for the user to review.`, inputSchema: schemaFromFields(f.fields), source: { page, affordance: `form "${snip(f.heading || f.submitLabel, 40)}" (${f.fields.length} fields)` }, why: consequential ? "Consequential writes are gated behind a human click." : "Writes are proposals rendered on the page." });
    }
  }

  // Offline channel → the gated submit + status + draft trio, named after the object the page talks about.
  if (ev.offline.length) {
    const obj = objectName ?? "request";
    add({ name: `draft_${obj}`, kind: "write", description: `Propose the ${obj.replace(/_/g, " ")} content, one section per requirement; rendered on the page labelled as agent-drafted, editable by the user. Not sent.`, inputSchema: { type: "object", properties: { summary: { type: "string" }, sections: { type: "string", description: "JSON array of {requirement, text}" } }, required: ["sections"] }, source: { page: ev.offline[0].page, affordance: "submission instructions" }, why: "Replace the paper/PDF form with a typed draft the user can edit." });
    add({ name: `check_${obj}_completeness`, kind: "read", description: `Evaluate the draft ${obj.replace(/_/g, " ")} against the site's stated requirements; returns what is missing and what to ask the user for.`, inputSchema: { type: "object", properties: {} }, source: { page: ev.offline[0].page, affordance: "requirements text" }, why: "Agents need a deterministic completeness signal before asking to submit." });
    add({ name: `submit_${obj}`, kind: "gated", description: `Request submission of the ${obj.replace(/_/g, " ")}. Does NOT submit: returns pending_confirmation and shows a Sign & submit card; only the user's click files it and returns a reference number.`, inputSchema: { type: "object", properties: { id: { type: "string" } } }, source: { page: ev.offline[0].page, affordance: ev.offline[0].snippet }, why: "The fax/mail step becomes an on-site, human-gated submission." });
    add({ name: `get_${obj}_status`, kind: "read", description: `Status of a submitted ${obj.replace(/_/g, " ")}: reference number, received time, decision due, timeline.`, inputSchema: { type: "object", properties: { id: { type: "string" } } }, source: { page: ev.offline[0].page, affordance: "no online status today" }, why: "Filed things need a status tool." });
  }
  if (ev.rules.length) {
    add({ name: "get_decision_criteria", kind: "read", description: "The rules or policy the decision cites, itemized with ids and the evidence that satisfies each — so an agent can argue against them point by point.", inputSchema: { type: "object", properties: { id: { type: "string", description: "Decision or reference id" } } }, source: { page: ev.rules[0].page, affordance: ev.rules[0].snippet }, why: "Decisions reference rules the user cannot see." });
  }
  if (accountSignal || ev.login.length) {
    add({ name: "get_account_context", kind: "read", description: "Who is signed in and where things stand: open items, deadlines, and what needs attention. Call first to orient.", inputSchema: { type: "object", properties: {} }, source: { page: "/", affordance: "signed-in session" }, why: "Tools inherit the session; the agent needs a starting point." });
  }
  if (ev.pag.length) {
    // Already handled with page params on list tools.
  }

  // ---- findings ----
  if (ev.pdf.length) findings.push({ id: "documents", severity: "blocker", title: "Data trapped in documents", detail: `${ev.pdf.length} PDF link(s). The facts an agent needs — reasons, ids, deadlines, rules — live inside documents it must download and guess from.`, fix: "Expose the same facts as read tools (get_…); keep the PDF for humans.", evidence: ev.pdf });
  if (ev.offline.length) findings.push({ id: "offline", severity: "blocker", title: "Offline submission channel", detail: "The consequential step is mail, fax, print-and-sign, or explicitly 'cannot be submitted online'. No browser agent can action it; every automated run stalls here.", fix: "Add a gated submit tool: returns pending_confirmation, the page shows a confirm card, only the user's click commits. Add a status tool for what was filed.", evidence: ev.offline });
  if (ev.rules.length) findings.push({ id: "rules", severity: "gap", title: "Decision rules referenced, not exposed", detail: "Pages cite a policy or 'see attached' without showing the criteria. Meeting rules you cannot read is luck.", fix: "Expose the cited criteria as a read tool (get_decision_criteria) itemized with ids.", evidence: ev.rules });
  if (ev.form.length) findings.push({ id: "forms", severity: "gap", title: "Long forms without structure", detail: "Multi-field or file-upload forms with no typed contract. Agents cannot tell what is required or when they are done.", fix: "Typed write tools with a schema per form; a completeness check; file attachment stays a human gesture.", evidence: ev.form });
  if (ev.phone.length) findings.push({ id: "phone", severity: "gap", title: "Phone-only channel with business hours", detail: "Questions and changes route to a phone number with hours. The agent's path ends at 'call us'.", fix: "Read tools for the answers the phone line gives (status, deadlines, requirements).", evidence: ev.phone });
  if (ev.iframe.length) findings.push({ id: "iframes", severity: "gap", title: "Content inside iframes", detail: "ChatGPT's browser ignores tools registered inside iframes (same- or cross-origin).", fix: "Register tools on the top-level document; move critical flows out of iframes.", evidence: ev.iframe });
  const headersOk = pages.some((p) => p.headers.originAgentCluster?.includes("?1") && /tools/.test(p.headers.permissionsPolicy ?? ""));
  if (!headersOk) findings.push({ id: "headers", severity: ev.existing.length ? "gap" : "note", title: "WebMCP headers not set", detail: "Origin-Agent-Cluster: ?1 and Permissions-Policy: tools=(self) were not seen. Registration fails in an origin-keyed cluster without them.", fix: "Send both headers on every page that registers tools.", evidence: [{ page: "/", snippet: `origin-agent-cluster: ${pages[0]?.headers.originAgentCluster ?? "—"}; permissions-policy: ${pages[0]?.headers.permissionsPolicy ?? "—"}` }] });
  if (ev.login.length) findings.push({ id: "session", severity: "note", title: "Signed-in session", detail: "There is a sign-in. WebMCP tools run as page JavaScript in the user's session — no new OAuth or API keys.", fix: "Keep authorization server-side; let tools inherit the session.", evidence: ev.login });
  if (ev.pag.length) findings.push({ id: "pagination", severity: "note", title: "Paginated lists", detail: "Lists span pages. Agents page through DOM slowly and lossily.", fix: "List tools take a page or query parameter.", evidence: ev.pag });
  if (ev.existing.length) findings.push({ id: "existing", severity: "note", title: "Already registers WebMCP tools", detail: "The site exposes document.modelContext tools or declarative tool attributes.", fix: "Audit scope, gating and description budgets; the checklist still applies.", evidence: ev.existing });
  if (!pages.some((p) => p.forms.length || p.tables.length || p.detailPairs >= 3)) findings.push({ id: "static", severity: "note", title: "Mostly static content", detail: "No forms, tables or detail pages were found in the scanned pages.", fix: "Expose the key content as read tools; add write tools where the site takes action.", evidence: [{ page: "/", snippet: `${pages.length} page(s) scanned` }] });

  const order: ToolRec["kind"][] = ["read", "write", "gated"];
  tools.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return { findings, tools };
}

export function scoreOf(findings: Finding[], existing: boolean): Report["score"] {
  let v = 100;
  for (const f of findings) v -= f.severity === "blocker" ? 22 : f.severity === "gap" ? 8 : f.id === "headers" ? 3 : 0;
  if (existing) v = Math.max(v, 70);
  if (findings.some((f) => f.id === "static")) v = Math.min(v, 60); // nothing to act on is not "ready"
  v = Math.max(5, Math.min(100, v));
  const grade = v >= 85 ? "A" : v >= 70 ? "B" : v >= 50 ? "C" : v >= 30 ? "D" : "F";
  const label = { A: "Agent-ready", B: "Nearly agent-ready", C: "Partially structured; agents can read but not act — or nothing here to act on yet", D: "Navigable, but the consequential steps are trapped", F: "Agents scrape and guess; the consequential step is offline" }[grade];
  return { value: v, grade, label };
}

export async function analyzeSite(inputUrl: string, opts: { allowLocal?: boolean } = {}): Promise<Report> {
  const started = Date.now();
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(inputUrl) ? inputUrl : `https://${inputUrl}`);
  } catch {
    throw new AnalyzeError("That is not a valid URL.");
  }
  const pages = await crawl(u.toString(), !!opts.allowLocal);
  if (!pages.length || pages.every((p) => p.error && !p.title)) throw new AnalyzeError("Could not fetch any HTML page at that address.", 422);
  const { findings, tools } = derive(pages, u.origin);
  const existing = pages.some((p) => p.hasModelContext);
  const headersOk = !findings.some((f) => f.id === "headers");
  const partial = {
    url: u.toString(),
    origin: u.origin,
    scannedAt: new Date().toISOString(),
    mode: "live" as const,
    elapsedMs: Date.now() - started,
    pages,
    summary: {
      pagesScanned: pages.filter((p) => !p.error).length,
      forms: pages.reduce((n, p) => n + p.forms.length, 0),
      tables: pages.reduce((n, p) => n + p.tables.length, 0),
      pdfs: pages.reduce((n, p) => n + p.links.pdf.length, 0),
      offlineChannels: pages.reduce((n, p) => n + p.textSignals.fax.length + p.textSignals.mail.length + p.textSignals.cannotSubmit.length + p.textSignals.printSign.length, 0),
      existingWebMCP: existing,
      headersOk,
    },
    score: scoreOf(findings, existing),
    findings,
    tools,
    generatedCode: generateCode(u.origin, tools),
  };
  return { ...partial, markdown: generateMarkdown(partial) };
}
