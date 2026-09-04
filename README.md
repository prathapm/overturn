# Overturn

**Analyze, Recommend, and Convert Any Website to WebMCP—in One Shot**

Identify readiness gaps, receive actionable recommendations, and automatically implement the changes needed for WebMCP.

Analyze a site → find the gaps → recommend the WebMCP tools → generate and apply the code → prove it, with the person still in charge.

Entry for [The WebMCP Challenge](https://webmcp.devpost.com/) (OpenAI, Sep 2026).

| | |
|---|---|
| **Retrofit any site** | https://overturn-one.vercel.app/retrofit |
| **The plan, built** (agent-native appeals portal) | https://overturn-one.vercel.app |
| **The "before"** (legacy portal) | https://overturn-one.vercel.app/legacy |
| **Retrofit record** | https://overturn-one.vercel.app/readiness |
| **Video** | https://youtu.be/ZpAkK57-Bm0 |

> Every payer, clinic, member, record, policy and number on the site is fictional and synthetic.
> Larkspur Health Plan does not exist.

## The idea

WebMCP lets a site say exactly what an agent may do — but every site built for people clicking has
to be retrofitted by hand, with judgment calls about what should be a read, what should be a
proposal, and what must wait for a human. Overturn is that process as a product:

1. **Analyze.** Paste a URL. Retrofit scans up to 8 same-origin pages and reads their affordances:
   forms, tables, detail pages, PDFs, fax/mail/"cannot be submitted online" instructions, cited
   policies, phone-only support, iframes, sign-in, WebMCP headers.
2. **Find the gaps.** A 0–100 agent-readiness score and findings by severity (blocker / gap / note),
   each with evidence and a fix.
3. **Recommend the tools.** A WebMCP tool inventory derived from what it found — reads, writes as
   proposals, consequential steps gated behind a human click — with input schemas.
4. **Generate the code.** A drop-in `webmcp-tools.js` that registers the inventory with
   `document.modelContext.registerTool()` (and a Markdown report).
5. **Prove it.** We ran Retrofit on a fictional health plan's legacy portal and built the plan it
   produced. The result is the agent-native appeals portal on the same site.

Retrofit exposes its own tools (`analyze_site`, `get_readiness_report`, `list_recommended_tools`,
`get_generated_code`), so a developer's agent can drive the retrofit itself.

## The case: appealing a health-plan denial

In Medicare Advantage alone in 2024: ~53M prior-authorization decisions, 7.7% denied, **only 11.5%
of denials appealed, 80.7% of appeals won** — ~3.6M winnable denials a year never contested,
because appealing is paperwork (KFF analysis of CMS-reported data, Jan 2026). Since Jan 1 2026,
CMS-0057-F requires 7-day decisions and, by Jan 1 2027, a structured prior-authorization API.

Retrofit's plan for the legacy portal (score 40/100): two blockers — *data trapped in documents*,
*offline submission channel* — two gaps — *decision rules referenced, not exposed*, *phone-only
support* — and nine recommended tools. The built portal has 14 tools, scoped to the page and the
appeal's state:

| Scope | Tool | Kind |
|---|---|---|
| always | `get_member_context`, `list_denials`, `get_deadlines` | read |
| denial page | `get_denial`, `get_coverage_criteria` | read |
| denial page | `start_appeal` | write, navigates to the workspace |
| workspace | `draft_appeal`, `update_appeal_section`, `set_review_type` | write → proposal on page |
| workspace | `list_attachments`, `check_completeness` | read |
| workspace | `submit_appeal` | **gated** → `pending_confirmation` |
| after filing | `get_appeal_status` | read |
| after filing | `request_external_review` | **gated** |

Open `/` in a browser with WebMCP support and ask your agent *"Help me appeal this denial."* No
agent handy? Press **▶ Replay Maya's session**.

## The principle: visible work, human commit

- The agent's draft is rendered **on the page**, labelled *drafted by your agent*, editable.
- **Reads are free** (`readOnlyHint`). **Writes are proposals** the page renders.
- **Gated commits.** `submit_appeal` and `request_external_review` return `pending_confirmation`
  and show a confirm card. Only the person's click calls the server; it refuses anything else
  (`403 human_confirmation_required`).
- **Human-only by design:** attaching records, editing the draft, choosing standard vs. expedited,
  signing.
- **Every tool call is logged on the page** (Activity panel).

## How WebMCP is implemented

- `src/lib/webmcp.ts` — registration layer: `document.modelContext ?? navigator.modelContext`,
  one `AbortController` per tool (aborting unregisters), duplicate-safe under StrictMode/HMR,
  every `execute` logged and capped at ~1.5K chars.
- `src/lib/tools/index.ts` — the tool definitions and `toolsForRoute()`, which computes the tool
  set from the route **and** the appeal's status. `SCOPE_MODE` flips to register-everything.
- `src/components/ToolRegistry.tsx` — mounted once; re-registers when the route or state changes.
- `src/lib/retrofit/analyze.ts` — the analyzer (server-side, SSRF-guarded: http(s) only, private
  ranges refused, ≤ 8 pages, ≤ 1 MB/page, ≤ 3.5 s/page, ≤ 3 redirects); `generate.ts` emits the
  code and report; `fixtures/legacy.json` is the committed plan for the legacy portal.
- `src/app/api/appeals/submit/route.ts` — the only endpoint that files an appeal; requires the
  human-click marker. `src/app/api/retrofit/analyze/route.ts` — the analyzer endpoint.
- `next.config.ts` — `Origin-Agent-Cluster: ?1`, `Permissions-Policy: tools=(self)`.
- State is a per-visitor sandbox in `localStorage`; no database.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Test with an agent:

- **ChatGPT desktop app** (judges' environment): Cmd/Ctrl+Shift+B, open the URL, look for *Site
  tools* in the address bar, then ask.
- **Chrome 149+**: `chrome://flags/#enable-webmcp-testing`, relaunch. DevTools → Application →
  WebMCP lists the tools and runs them by hand.

Smoke test (Puppeteer + Chrome 151+ with `--enable-features=WebMCP`), 36 checks — scoped surface
across navigation, the hero flow through the tools, the gate, the analyzer, the guards, the
meta-tools:

```bash
npm run build && PORT=3100 npm start &
CHROME=/usr/bin/google-chrome BASE_URL=http://localhost:3100 node tests/smoke.mjs
```

Regenerate the legacy-portal plan: `node scripts/make-fixture.mjs`. Rebuild the video:
`TTS=edge-tts python3 video/build.py`.

## Honest limits

- The analyzer is deterministic heuristics over server-fetched HTML: it does not execute
  JavaScript, so app-rendered pages show less. It produces a plan and code to start from; a
  developer (or coding agent) applies it. The Larkspur portal is the full loop applied by hand.
- Larkspur is fictional; the plan side (case numbers, decisions) is simulated.
- The spec has no tool-level confirmation API; the proposal → confirm protocol is designed into
  the app and enforced server-side. The agent still sees the DOM and can click instead of calling.

## Repo map

```
src/app/(portal)/        agent-native portal: home, denials/[id], appeals/[id], retrofit, readiness
src/app/legacy/          the "before" portal
src/app/api/             appeals/submit (gated), retrofit/analyze
src/lib/retrofit/        analyzer, generator, fixture, client state
src/lib/                 seed data, store, tools, webmcp layer, completeness, replay
tests/smoke.mjs          WebMCP smoke test
video/                   narration, slides, capture and build scripts
docs/                    design spec, readiness report, Devpost write-up, video script
```

MIT — see [LICENSE](LICENSE).
