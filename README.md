# Overturn

**An agent-native health-plan appeals portal.** Your agent does the paperwork on the plan's own
site; you make the four decisions that are actually yours.

Entry for [The WebMCP Challenge](https://webmcp.devpost.com/) (OpenAI, Sep 2026).
Live: **https://overturn-one.vercel.app** · Legacy "before" version: **https://overturn-one.vercel.app/legacy** · Video: **VIDEO_URL**

> Every payer, clinic, member, record, policy and number on the site is fictional and synthetic.
> Larkspur Health Plan does not exist.

## The problem, in three numbers

In Medicare Advantage alone in 2024 there were ~53 million prior-authorization decisions.
7.7% were denied. **Only 11.5% of those denials were appealed — and 80.7% of appeals won.**
About 3.6 million winnable denials a year are never contested, because appealing is paperwork:
a PDF letter, a six-page form, a fax number.
(KFF analysis of CMS-reported data, Jan 2026.)

Since Jan 1 2026, CMS-0057-F requires plans to decide prior auths in 7 days (72 hours expedited)
and, by Jan 1 2027, to expose a structured prior-authorization API. The plan side is being forced
to become machine-readable. Overturn is what the member's side of that should look like.

## What it is

One Next.js site, two modes, no login, no database.

| Mode | What you see |
|---|---|
| `/` **agent-native** | Member home → denial detail → appeal workspace → Sign & submit → case status. 14 WebMCP tools, scoped to the page and the appeal's state. |
| `/legacy` **before** | Same denial. Letter is a PDF, the appeal form is a six-page PDF, submission is by fax or mail. No tools. |

Open `/` in a browser with WebMCP support and ask your agent: *"Help me appeal this denial."*
No agent handy? Press **▶ Replay Maya's session** in the header — it replays the tool calls the
agent makes and the clicks Maya makes.

## The principle: visible work, human commit

- The agent's draft is rendered **on the page**, labelled *drafted by your agent*, and every
  section is editable. The member sees the diff before it ships (the Cursor lesson).
- **Reads are free** (`readOnlyHint`). **Writes are proposals** the page renders.
- **Two gated commits.** `submit_appeal` and `request_external_review` return
  `pending_confirmation` and show a confirm card. Only the member's click calls the server, and the
  server refuses anything else (`403 human_confirmation_required`).
- **Human-only by design:** attaching records, editing the draft, choosing standard vs. expedited,
  signing.
- **Every tool call is logged on the page** in the Activity panel.

## The tools

Registered with `document.modelContext.registerTool()` (imperative API, top-level page — the
subset ChatGPT's browser supports). The surface follows the member:

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

Descriptions are under 500 characters and written so an agent can discover the order
(`get_denial` → `get_coverage_criteria` → `start_appeal` → `draft_appeal` → `check_completeness`
→ `submit_appeal`). Outputs are capped at ~1.5K characters.

## How WebMCP is implemented

- `src/lib/webmcp.ts` — registration layer: `document.modelContext ?? navigator.modelContext`,
  one `AbortController` per tool (aborting unregisters), duplicate-safe under StrictMode/HMR,
  every `execute` logged and capped.
- `src/lib/tools/index.ts` — the 14 tool definitions and `toolsForRoute()`, which computes the
  tool set from the route **and** the appeal's status. `SCOPE_MODE` flips between scoped and
  register-everything.
- `src/components/ToolRegistry.tsx` — mounted once in the portal layout; re-registers when the
  route or an appeal's status changes.
- `src/app/api/appeals/submit/route.ts` — the only endpoint that files an appeal; requires the
  human-click marker.
- `next.config.ts` — `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.
- State is a per-visitor sandbox in `localStorage` (zustand + persist). Judges never collide.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Test with an agent:

- **ChatGPT desktop app** (judges' environment): press Cmd/Ctrl+Shift+B, open the URL, look for
  *Site tools* in the address bar, then ask *"Help me appeal this denial."*
- **Chrome 149+**: enable `chrome://flags/#enable-webmcp-testing`, relaunch, open the URL. DevTools
  → Application → WebMCP lists the tools and lets you run them by hand.

Automated smoke test (Puppeteer + Chrome 151+ with `--enable-features=WebMCP`): drives the hero
flow through the registered tools and asserts that `submit_appeal` alone never files an appeal.

```bash
npm run build && PORT=3100 npm start &
CHROME=/usr/bin/google-chrome BASE_URL=http://localhost:3100 node tests/smoke.mjs
```

## Honest limits

- Larkspur is a fictional payer; the "plan side" (case numbers, decisions) is simulated. In
  production the submit route would sit on the plan's FHIR Prior Authorization API (CMS-0057-F).
- The spec has no tool-level confirmation API today; the proposal → confirm protocol is designed
  into the app and enforced server-side, not by the agent.
- The agent still sees the DOM and can click instead of calling tools. Tools are additive.

## Repo map

```
src/app/(portal)/        agent-native portal (home, denials/[id], appeals/[id], readiness)
src/app/legacy/          the "before" portal
src/app/api/appeals/     stateless submission endpoint
src/lib/                 seed data, store, tools, webmcp layer, completeness, replay
tests/smoke.mjs          WebMCP smoke test
docs/                    design spec, readiness report, Devpost write-up, video script
```

MIT — see [LICENSE](LICENSE).
