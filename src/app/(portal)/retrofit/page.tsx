"use client";

import Link from "next/link";
import { useState } from "react";
import { BUILT_FROM_PLAN, LEGACY_URL, useRetrofit } from "@/lib/retrofit/client";
import type { Finding, ToolRec } from "@/lib/retrofit/types";
import { useStore } from "@/lib/store";

const sev: Record<Finding["severity"], [string, string]> = {
  blocker: ["Blocker", "bg-deny-soft text-deny border-deny"],
  gap: ["Gap", "bg-human-soft text-human border-human"],
  note: ["Note", "bg-panel-2 text-muted border-line"],
};
const kind: Record<ToolRec["kind"], [string, string]> = {
  read: ["read", "bg-brand-soft text-brand"],
  write: ["write · proposal", "bg-ok-soft text-ok"],
  gated: ["gated · human click", "bg-human-soft text-human"],
};

export default function RetrofitPage() {
  const { url, setUrl, status, error, report, run } = useRetrofit();
  const log = useStore((s) => s.log);
  const [tab, setTab] = useState<"findings" | "tools" | "code" | "pages">("findings");
  const [copied, setCopied] = useState(false);

  const isLegacy = report && report.url.replace(/\/$/, "") === LEGACY_URL;

  const onRun = async (live = false) => {
    log({ actor: "member", summary: `Analyze ${url}${live ? " (live)" : ""}` });
    try {
      const r = await run(url, live);
      log({ actor: "system", summary: `Readiness ${r.score.value}/100 (${r.score.grade}) · ${r.findings.length} findings · ${r.tools.length} tools recommended` });
    } catch {
      /* shown inline */
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">Overturn Retrofit</div>
        <h1 className="mt-1 text-2xl font-semibold">Turn any website into one people and their agents use together.</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Paste a URL. Retrofit reads the site’s forms, tables, documents and submission instructions, scores its agent-readiness,
          lists the gaps, and recommends a WebMCP tool inventory — reads free, writes as proposals, consequential steps gated behind a
          human click — with generated <code className="font-mono text-xs">registerTool</code> code to drop in. The Larkspur appeals portal on this site is that plan, built.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onRun(false);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="min-w-[280px] flex-1 rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
          aria-label="Site URL"
        />
        <button type="submit" disabled={status === "running"} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {status === "running" ? "Analyzing…" : "Analyze"}
        </button>
        <button type="button" onClick={() => setUrl(LEGACY_URL)} className="text-xs text-muted underline-offset-2 hover:underline">
          use the legacy portal
        </button>
        {report?.mode === "fixture" && (
          <button type="button" onClick={() => void onRun(true)} className="text-xs text-muted underline-offset-2 hover:underline">
            cached result · re-run live
          </button>
        )}
      </form>
      {error && <div className="rounded-md border border-deny bg-deny-soft px-3 py-2 text-sm text-deny">{error}</div>}
      <p className="text-[11px] text-muted">Scans up to 8 same-origin pages in under 10 seconds. Only public pages; nothing is stored. Analyze sites you own.</p>

      {report && (
        <>
          <section className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-panel px-4 py-3 sm:col-span-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Agent-readiness</div>
              <div className={`mt-1 text-4xl font-semibold tabular-nums ${report.score.value < 50 ? "text-deny" : report.score.value < 85 ? "text-human" : "text-ok"}`}>
                {report.score.value}<span className="text-lg text-muted">/100 · {report.score.grade}</span>
              </div>
              <div className="mt-1 text-xs text-muted">{report.score.label}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:col-span-3">
              {[
                ["pages scanned", report.summary.pagesScanned],
                ["forms", report.summary.forms],
                ["tables / lists", report.summary.tables],
                ["documents (PDF)", report.summary.pdfs],
                ["offline channels", report.summary.offlineChannels],
                ["tools recommended", report.tools.length],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border border-line bg-panel px-3 py-2">
                  <div className="text-2xl font-semibold tabular-nums">{v}</div>
                  <div className="text-[11px] text-muted">{l}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(["findings", "tools", "code", "pages"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md border px-3 py-1.5 ${tab === t ? "border-brand bg-brand-soft text-brand" : "border-line bg-panel text-muted"}`}>
                {t === "findings" ? `Findings · ${report.findings.length}` : t === "tools" ? `Recommended tools · ${report.tools.length}` : t === "code" ? "Generated code" : `Pages · ${report.pages.length}`}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-muted">
              {report.origin} · {new Date(report.scannedAt).toLocaleString()} · {report.mode === "fixture" ? "cached" : `${report.elapsedMs} ms`}
            </span>
            <a
              href={`data:text/markdown;charset=utf-8,${encodeURIComponent(report.markdown)}`}
              download="agent-readiness-report.md"
              className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Download report (.md)
            </a>
          </div>

          {tab === "findings" && (
            <section className="space-y-3">
              {report.findings.map((f) => (
                <div key={f.id} className="rounded-lg border border-line bg-panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${sev[f.severity][1]}`}>{sev[f.severity][0]}</span>
                    <span className="font-medium">{f.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{f.detail}</p>
                  <p className="mt-1 text-sm"><span className="font-semibold text-brand">Fix:</span> {f.fix}</p>
                  {f.evidence.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[12px] text-muted">
                      {f.evidence.slice(0, 4).map((e, i) => (
                        <li key={i}><span className="font-mono">{e.page}</span> — “{e.snippet}”</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {tab === "tools" && (
            <section className="overflow-x-auto rounded-lg border border-line bg-panel">
              <table className="w-full text-sm">
                <thead className="bg-panel-2 text-left text-[11px] uppercase tracking-wide text-muted">
                  <tr><th className="px-3 py-2">Tool</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">What it does</th><th className="px-3 py-2">From</th>{isLegacy && <th className="px-3 py-2">Built as</th>}</tr>
                </thead>
                <tbody>
                  {report.tools.map((t) => (
                    <tr key={t.name} className="border-t border-line align-top">
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{t.name}</td>
                      <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${kind[t.kind][1]}`}>{kind[t.kind][0]}</span></td>
                      <td className="px-3 py-2">{t.description}<div className="mt-1 text-[11px] text-muted">inputs: {Object.keys(t.inputSchema.properties).join(", ") || "none"} · {t.why}</div></td>
                      <td className="px-3 py-2 text-xs text-muted"><span className="font-mono">{t.source.page}</span><br />{t.source.affordance}</td>
                      {isLegacy && <td className="px-3 py-2 text-xs">{BUILT_FROM_PLAN[t.name] ? <span className="text-ok">✓ {BUILT_FROM_PLAN[t.name]}</span> : <span className="text-muted">—</span>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "code" && (
            <section className="rounded-lg border border-line bg-panel">
              <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
                <span className="font-mono">webmcp-tools.js · {report.tools.length} tools · {report.generatedCode.split("\n").length} lines</span>
                <span className="flex gap-3">
                  <button
                    onClick={() => { void navigator.clipboard?.writeText(report.generatedCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="underline-offset-2 hover:underline"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <a href={`data:text/javascript;charset=utf-8,${encodeURIComponent(report.generatedCode)}`} download="webmcp-tools.js" className="underline-offset-2 hover:underline">Download</a>
                </span>
              </div>
              <pre className="max-h-[520px] overflow-auto p-4 font-mono text-[12px] leading-relaxed">{report.generatedCode}</pre>
            </section>
          )}

          {tab === "pages" && (
            <section className="overflow-x-auto rounded-lg border border-line bg-panel">
              <table className="w-full text-sm">
                <thead className="bg-panel-2 text-left text-[11px] uppercase tracking-wide text-muted">
                  <tr><th className="px-3 py-2">Page</th><th className="px-3 py-2">Forms</th><th className="px-3 py-2">Tables</th><th className="px-3 py-2">Pairs</th><th className="px-3 py-2">PDFs</th><th className="px-3 py-2">Signals</th></tr>
                </thead>
                <tbody>
                  {report.pages.map((p) => (
                    <tr key={p.url} className="border-t border-line align-top">
                      <td className="px-3 py-2 text-xs"><span className="font-mono">{new URL(p.url).pathname}</span><br /><span className="text-muted">{p.title || p.error}</span></td>
                      <td className="px-3 py-2 tabular-nums">{p.forms.length}</td>
                      <td className="px-3 py-2 tabular-nums">{p.tables.length}</td>
                      <td className="px-3 py-2 tabular-nums">{p.detailPairs}</td>
                      <td className="px-3 py-2 tabular-nums">{p.links.pdf.length}</td>
                      <td className="px-3 py-2 text-xs text-muted">{[...p.textSignals.fax, ...p.textSignals.mail, ...p.textSignals.cannotSubmit, ...p.textSignals.printSign, ...p.textSignals.phoneOnly].slice(0, 2).join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {isLegacy && (
            <section className="rounded-lg border border-brand bg-brand-soft/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand">This plan, built</div>
              <p className="mt-1 text-sm">
                We ran Retrofit on the legacy portal, then built its recommendations into the agent-native portal on this site — 14 scoped tools, proposal→confirm gating, every call logged on the page.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <Link href="/denials/4471" className="rounded-md bg-brand px-3 py-1.5 font-semibold text-white">See it applied →</Link>
                <Link href="/legacy" className="rounded-md border border-line bg-panel px-3 py-1.5 text-muted">Open the legacy portal</Link>
                <Link href="/readiness" className="rounded-md border border-line bg-panel px-3 py-1.5 text-muted">Read the retrofit record</Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
