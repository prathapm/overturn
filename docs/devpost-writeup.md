# Overturn — Devpost submission text

**Tagline:** Turn any website into one people and their agents use together — analyze it, find the
gaps, recommend the WebMCP tools, generate the code, and prove it with the person still in charge.

## Why this use case is a strong fit for WebMCP

WebMCP lets a site say exactly what an agent may do. The catch is that every one of the hundreds of
millions of sites built for people clicking has to be retrofitted — by hand, page by page, with
judgment calls about what should be a read, what should be a proposal, and what must wait for a
human. Overturn is that process as a product.

**Overturn Retrofit** takes a URL, scans the site's forms, tables, documents, submission
instructions, session and headers, and produces an agent-readiness score, the blockers and gaps,
a recommended tool inventory (read / write-proposal / gated), and generated
`document.modelContext.registerTool()` code. Because it also exposes its *own* tools
(`analyze_site`, `get_readiness_report`, `list_recommended_tools`, `get_generated_code`), a
developer's agent can drive the retrofit itself.

To prove the loop closes, we picked the hardest common case: appealing a health-plan denial.
Only 11.5% of Medicare Advantage denials are contested, although 80.7% of appeals win (KFF,
Jan 2026) — because the denial is a PDF, the criteria aren't on the portal, the form is six pages,
and submission is by fax. We ran Retrofit on a fictional plan's legacy portal, built the plan it
produced, and shipped the result on the same site.

## How it creates a better user experience

**For a site owner:** paste a URL, get a plan instead of a guess — what blocks agents today
(documents, offline channels, hidden rules, phone-only support, iframes, missing headers), which
tools to add, how to gate them, and the code to start from.

**For the person using the retrofitted site:** the agent does the reading, the mapping of evidence
to rules, the drafting and the deadline math — on the page, labelled, editable. The person does the
four things that are theirs: choose the records, say it in their own words, pick the urgency, sign.
`submit_appeal` never submits; it returns `pending_confirmation`, a Sign & submit card appears, and
only the person's click files the appeal — the server refuses any other path. Every tool call is
logged in an Activity panel. Nothing happens off-screen. That is the lesson that made developers
trust Cursor: not speed, but seeing every line and being able to change it.

## What people and agents can do together that was difficult or impossible before

Before: a member with a denial letter, a six-page form and a fax number — and an agent that can
read the PDF but cannot fax. The task stalls at the one honest wall.

Now: in one sitting, on one page, the member and her agent go from denial to a filed appeal with a
case number and a decision clock. And the site owner got there from a ten-second analysis and a
generated plan rather than a blank page. The same pattern — structured reads, drafted proposals, one
human signature — applies to every claim-shaped dispute.

## How we implemented WebMCP

- **Analyzer** (`src/lib/retrofit/analyze.ts`): server-side crawl of up to 8 same-origin pages
  (SSRF-guarded: http(s) only, private ranges refused, redirects/size/time capped); deterministic
  heuristics turn forms, tables, detail pages, PDFs, fax/mail/"cannot be submitted online" text,
  cited policies, phone-only support, iframes, sign-in and headers into findings and a tool
  inventory; `generate.ts` emits the `registerTool` module and a Markdown report.
- **14 tools on the appeals portal**, registered with `document.modelContext.registerTool()`
  (imperative API, top-level page — the subset ChatGPT's browser supports), with
  `navigator.modelContext` as legacy fallback. A single `ToolRegistry` computes the tool set from
  the route *and* the appeal's status; one `AbortController` per tool; aborting unregisters.
- **Reads are free, writes are proposals, two gated commits.** `readOnlyHint` on reads; write
  tools render on the page; `submit_appeal` and `request_external_review` return
  `pending_confirmation` and the on-page click is the only path to the server
  (`403 human_confirmation_required` otherwise).
- **4 meta-tools on `/retrofit`** so an agent can run the analysis and read the plan.
- Descriptions under 500 characters, written so the flow order is discoverable; outputs capped at
  ~1.5K; headers `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`; per-visitor
  sandbox in `localStorage` so judges never collide.
- **Verified** with a Puppeteer WebMCP smoke test (Chrome 152, `--enable-features=WebMCP`) — 36
  checks covering the scoped surface across navigation, the hero flow through the tools, the gate,
  the analyzer, the guards and the meta-tools — and by hand in ChatGPT's desktop browser and Chrome.

All payers, clinics, people, records and numbers on the site are fictional. MIT licensed.
