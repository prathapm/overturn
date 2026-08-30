/**
 * WebMCP smoke test — drives the hero flow through the page's registered tools the way a
 * browser agent would, using Puppeteer's WebMCP support (Chrome 151+ with --enable-features=WebMCP).
 *
 *   BASE_URL=http://localhost:3000 CHROME=/usr/bin/google-chrome node tests/smoke.mjs
 *
 * Asserts the two things that matter most:
 *   1. the scoped tool surface follows the member through the flow;
 *   2. submit_appeal alone never files an appeal — only the member's click does.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "/usr/bin/google-chrome";
const APPEAL = "A-4471";

const cannedDraft = {
  summary: "Ms. Chen completed eight weeks of physical therapy with persistent symptoms and meets every criterion of LHP-MSK-014.",
  sections: [
    { criterion_id: "C1", argument: "Sixteen supervised PT sessions over eight weeks (Physical therapy progress notes, Jun 9 – Aug 4, 2026)." },
    { criterion_id: "C2", argument: "Persistent giving way on stairs after therapy (Orthopedic visit note, Aug 12, 2026)." },
    { criterion_id: "C3", argument: "Naproxen 500 mg BID Jun 2 – Jul 28, stopped for GI upset (Medication history, 2026)." },
    { criterion_id: "C4", argument: "Positive McMurray, effusion, joint-line tenderness (Orthopedic visit note, Aug 12, 2026)." },
    { criterion_id: "C5", argument: "MRI ordered to confirm a meniscal tear and plan arthroscopy (Orthopedic visit note, Aug 12, 2026)." },
  ],
};

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${msg}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function toolNames(page) {
  const tools = await page.webmcp.tools();
  return tools.map((t) => t.name).sort();
}

async function call(page, name, input = {}) {
  const tools = await page.webmcp.tools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not registered (have: ${tools.map((t) => t.name).join(", ")})`);
  const res = await tool.execute(input);
  let out = res.output;
  try {
    out = JSON.parse(res.output);
  } catch {
    /* string output */
  }
  return { status: res.status, out };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--enable-features=WebMCP", "--no-sandbox", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") console.log("    [page]", m.text());
  });
  if (!page.webmcp) throw new Error("page.webmcp is undefined — Puppeteer/Chrome without WebMCP support");

  console.log("Home");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(500);
  let names = await toolNames(page);
  ok(names.includes("get_member_context") && names.includes("get_denial"), `home tools registered: ${names.join(", ")}`);
  ok(!names.includes("draft_appeal"), "workspace tools NOT registered on home (scoped surface)");
  const ctx = await call(page, "get_member_context");
  ok(ctx.out?.member?.name === "Maya Chen", "get_member_context returns Maya");

  console.log("Denial page");
  await page.goto(`${BASE}/denials/4471`, { waitUntil: "networkidle0" });
  await sleep(500);
  names = await toolNames(page);
  ok(names.includes("get_denial") && names.includes("start_appeal"), "denial tools registered");
  const den = await call(page, "get_denial", { denial_id: "4471" });
  ok(den.out?.reason_code === "CT-03", `get_denial reason ${den.out?.reason_code}`);
  const crit = await call(page, "get_coverage_criteria", { denial_id: "4471" });
  ok(crit.out?.criteria?.length === 5, "get_coverage_criteria returns 5 criteria");

  console.log("start_appeal → workspace");
  const start = await call(page, "start_appeal", { denial_id: "4471" });
  ok(start.out?.appeal_id === APPEAL, `start_appeal → ${start.out?.appeal_id}`);
  await sleep(1200);
  ok(page.url().includes(`/appeals/${APPEAL}`), `navigated to ${page.url()}`);
  names = await toolNames(page);
  ok(names.includes("draft_appeal") && names.includes("submit_appeal"), "workspace tools registered after navigation");
  ok(!names.includes("start_appeal"), "denial-page tools unregistered after leaving the page");

  const draft = await call(page, "draft_appeal", { appeal_id: APPEAL, ...cannedDraft });
  ok(draft.out?.status === "proposed", `draft_appeal → ${draft.out?.status}, completeness ${draft.out?.completeness}`);
  let comp = await call(page, "check_completeness", { appeal_id: APPEAL });
  ok(comp.out?.complete === false && comp.out?.score === "0 of 5", `check_completeness before attachments: ${comp.out?.score} (needs records)`);

  const refused = await call(page, "submit_appeal", { appeal_id: APPEAL });
  ok(refused.out?.status === "refused", "submit_appeal refused while incomplete");

  console.log("Member attaches records (clicks)");
  const attachButtons = await page.$$("button::-p-text(Attach)");
  ok(attachButtons.length >= 3, `${attachButtons.length} Attach buttons found`);
  for (const b of attachButtons.slice(0, 3)) {
    await b.click();
    await sleep(150);
  }
  comp = await call(page, "check_completeness", { appeal_id: APPEAL });
  ok(comp.out?.complete === true, `check_completeness after attachments: ${comp.out?.score}`);

  const rt = await call(page, "set_review_type", { appeal_id: APPEAL, review_type: "expedited", reason: "Worsening instability documented." });
  ok(rt.out?.review_type === "expedited", "set_review_type proposed expedited");

  console.log("Gated submit");
  const pend = await call(page, "submit_appeal", { appeal_id: APPEAL });
  ok(pend.out?.status === "pending_confirmation", `submit_appeal → ${pend.out?.status}`);
  const statusBefore = await call(page, "get_appeal_status", { appeal_id: APPEAL }).catch(() => null);
  ok(statusBefore === null || statusBefore.out?.filed === false, "no case number without the member's click");
  const caseTextBefore = await page.evaluate(() => document.body.innerText.includes("Case LHP-A-"));
  ok(!caseTextBefore, "page shows no case number yet");

  // The server refuses a direct call without the human marker.
  const direct = await page.evaluate(async () => {
    const r = await fetch("/api/appeals/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appeal_id: "A-4471", denial_id: "4471", sections: [{}], attachments: ["R1"] }) });
    return r.status;
  });
  ok(direct === 403, `server refuses submission without the member marker (HTTP ${direct})`);

  const sign = await page.$("button::-p-text(Sign & submit)");
  ok(!!sign, "Sign & submit card is showing");
  await sign.click();
  await page.waitForFunction(() => document.body.innerText.includes("Case LHP-A-"), { timeout: 8000 });
  await sleep(500);
  names = await toolNames(page);
  ok(names.includes("get_appeal_status") && !names.includes("draft_appeal"), "post-filing tools registered, drafting tools gone");
  const st = await call(page, "get_appeal_status", { appeal_id: APPEAL });
  ok(st.out?.filed === true && /^LHP-A-\d+$/.test(st.out?.case_number ?? ""), `get_appeal_status → ${st.out?.case_number}, due ${st.out?.decision_due}`);


  console.log("Retrofit platform");
  const fx = await page.evaluate(async () => {
    const r = await fetch("/api/retrofit/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: "https://overturn-one.vercel.app/legacy" }) });
    return r.json();
  });
  ok(fx.mode === "fixture" && fx.findings?.some((f) => f.id === "documents") && fx.findings?.some((f) => f.id === "offline"), `legacy analysis (fixture): score ${fx.score?.value}, findings ${fx.findings?.map((f) => f.id).join(",")}`);
  ok(fx.tools?.some((t) => t.name === "submit_appeal" && t.kind === "gated") && fx.tools?.some((t) => t.name === "draft_appeal"), `recommends the appeal trio: ${fx.tools?.map((t) => t.name).join(", ")}`);
  ok(typeof fx.generatedCode === "string" && fx.generatedCode.includes("registerTool") && fx.generatedCode.includes("submit_appeal"), "generated code registers the recommended tools");
  const guard = await page.evaluate(async () => (await fetch("/api/retrofit/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: "http://10.0.0.1/", live: true }) })).status);
  ok(guard === 400, `private-address URLs are refused (HTTP ${guard})`);

  await page.goto(`${BASE}/retrofit`, { waitUntil: "networkidle0" });
  await sleep(600);
  names = await toolNames(page);
  ok(names.includes("analyze_site") && names.includes("get_readiness_report") && !names.includes("draft_appeal"), `retrofit tools registered on /retrofit: ${names.join(", ")}`);
  const an = await call(page, "analyze_site", { url: "https://overturn-one.vercel.app/legacy" });
  ok(typeof an.out?.score?.value === "number" && an.out?.tools_recommended >= 5, `analyze_site → score ${an.out?.score?.value}, ${an.out?.tools_recommended} tools`);
  const rec = await call(page, "list_recommended_tools", {});
  ok(Array.isArray(rec.out) && rec.out.length >= 5, `list_recommended_tools → ${rec.out?.length}`);
  const code = await call(page, "get_generated_code", { tool_name: "submit_appeal" });
  ok(code.out?.kind === "gated", "get_generated_code(submit_appeal) → gated");
  const rendered = await page.evaluate(() => /agent-readiness/i.test(document.body.innerText));
  ok(rendered, "report rendered on the page");

  // Tool descriptions/outputs within budgets.
  await page.goto(`${BASE}/appeals/${APPEAL}`, { waitUntil: "networkidle0" });
  await sleep(400);
  const tools = await page.webmcp.tools();
  ok(tools.every((t) => (t.description ?? "").length <= 500), "all descriptions ≤ 500 chars");

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
