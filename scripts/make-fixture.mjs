// Regenerates src/lib/retrofit/fixtures/legacy.json by running the analyzer (via the local API) on the deployed legacy portal.
//   PORT=3100 npm start &  node scripts/make-fixture.mjs
import fs from "node:fs";
const api = process.env.API ?? "http://localhost:3100/api/retrofit/analyze";
const url = process.env.TARGET ?? "https://overturn-one.vercel.app/legacy";
const res = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, live: true }) });
const report = await res.json();
if (!res.ok || report.error) throw new Error(`analysis failed: ${report.error ?? res.status}`);
fs.writeFileSync("src/lib/retrofit/fixtures/legacy.json", JSON.stringify(report, null, 2) + "\n");
console.log(`fixture: ${report.summary.pagesScanned} pages, score ${report.score.value} (${report.score.grade}), ${report.findings.length} findings, ${report.tools.length} tools, ${report.elapsedMs} ms`);
for (const t of report.tools) console.log(`  ${t.kind.padEnd(5)} ${t.name}`);
for (const f of report.findings) console.log(`  [${f.severity}] ${f.title}`);
