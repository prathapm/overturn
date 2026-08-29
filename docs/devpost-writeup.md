# Overturn — Devpost submission text

**Tagline:** Your agent does the paperwork on the plan's own portal. You make the four decisions
that are actually yours.

## Why this use case is a strong fit for WebMCP

Appealing a health-plan denial is the archetype of a task that is *possible* for a person and
*impossible* for an agent on today's web: the denial is a PDF, the plan's criteria are not on the
portal, the form is six pages of free text, and submission is by fax. Nobody appeals — only 11.5% of
Medicare Advantage denials are contested, though 80.7% of appeals win (KFF, Jan 2026).

WebMCP fixes exactly this shape of problem. The portal exposes the denial, the plan's own
criteria, the deadlines and the appeal itself as typed tools that run in the member's signed-in
session. The agent stops scraping and starts calling. And because the tools live *in the page*,
the member watches the work happen on the same screen — which is the only way a person should ever
trust an agent with a medical appeal.

Why now: since Jan 1 2026, CMS-0057-F forces plans to decide prior auths in 7 days and, by
Jan 1 2027, to expose a structured prior-authorization API. The plan side is being made
machine-readable by law. Overturn is the member's side.

## How it creates a better user experience

Overturn is one site in two modes. `/legacy` is the portal as it exists everywhere today.
`/` is the same portal made agent-native. In the agent-native mode:

- The agent reads the structured denial and the plan's itemized criteria, and drafts one argument
  per criterion, citing the member's records by title. The draft appears **on the page**, labelled
  *drafted by your agent*, and every sentence is editable.
- The member attaches records (a file picker needs a human gesture), edits the draft in her own
  words, and the agent notices the change and re-checks completeness.
- The agent proposes expedited review with a reason; the member chooses.
- `submit_appeal` never submits. It returns `pending_confirmation` and a **Sign & submit** card
  appears. Only the member's click files the appeal and returns a case number — and the server
  refuses any other path.
- Every tool call is logged in an Activity panel on the page. Nothing happens off-screen.

The product principle is the one that made developers trust Cursor: not that it is fast, but that
you see every line it writes and can change it. Pair programming for paperwork.

## What people and agents can do together that was difficult or impossible before

Before: a member with a denial letter, a six-page form and a fax number — and an agent that can read
the PDF but cannot fax. The task stalls at the one honest wall.

Now: in one sitting, on one page, the member and her agent get from denial to a filed appeal with a
case number and a decision clock. The agent does the reading, the mapping of evidence to criteria,
the drafting, the completeness checking and the deadline math. The member does the four things
that are hers: choose the records, say it in her own words, pick the urgency, sign. If the plan
upholds its denial, the agent prepares the external-review request and the member confirms it.

That division is not a limitation of the demo; it is the design, and in healthcare it is the law
(California SB 1120: only a clinician may make the denial decision).

## How we implemented WebMCP

- 14 tools registered with `document.modelContext.registerTool()` — imperative API, top-level
  page, the subset ChatGPT's browser supports. `navigator.modelContext` as legacy fallback.
- **State-scoped surface:** a single `ToolRegistry` computes the tool set from the route *and*
  the appeal's status. Denial-page tools unregister when you leave; drafting tools give way to
  status tools once the appeal is filed. One `AbortController` per tool; aborting unregisters.
- **Reads are free, writes are proposals:** reads carry `readOnlyHint`; write tools render a
  proposal on the page. Two gated commits (`submit_appeal`, `request_external_review`) return
  `pending_confirmation`; the on-page click is the only path to the server, which requires a
  human-confirmation marker and returns 403 otherwise.
- Descriptions under 500 characters, written so an agent discovers the flow order; outputs capped
  at ~1.5K characters. Headers `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.
- Per-visitor sandbox in `localStorage`, so judges never collide. Stateless submit endpoint.
- Verified with a Puppeteer WebMCP smoke test (Chrome 152, `--enable-features=WebMCP`) that drives
  the hero flow through the registered tools and asserts the gate holds, and by hand in ChatGPT's
  desktop browser and Chrome with the WebMCP flag.
- A **Replay** button animates the same tool calls and clicks for judges without an agent attached,
  and `/readiness` documents what blocked agents in the legacy portal and what changed — the
  retrofit record.

All names, records and numbers are fictional. MIT licensed.
