# Overturn — design spec (2026-08-29)

Entry for The WebMCP Challenge (Devpost / OpenAI), deadline Wed Sep 3 2026 1:00 pm PDT.
Team: Prathap, Rajani, Chitral. Everything in this repo is personal work on personal devices.

## One line

Overturn turns a health-plan denial into a filed appeal in one sitting. The member's agent does
the paperwork on the plan's own portal; the member makes the four decisions that are actually
theirs.

## Why this, why now (sourced)

- Medicare Advantage 2024: ~53M prior-auth determinations, 7.7% denied (~4.1M), only 11.5% of
  denials appealed (~470K), 80.7% of appeals overturned (~380K). ~3.6M denials/yr never appealed.
  (KFF analysis of CMS-reported data, Jan 28 2026.)
- CMS-0057-F: 7-day standard / 72-hour expedited prior-auth decisions since Jan 1 2026; every
  covered payer must expose a FHIR Prior Authorization API by Jan 1 2027.
- AMA 2025 survey: 40 prior auths and 13 hours per physician per week.

## Product principle

Visible work, human commit. The agent's work is rendered on the page ("drafted by your agent"),
the member edits it inline, the agent reacts to the edit, and nothing consequential leaves the
portal without the member's click. Pair programming for paperwork.

## What ships

One Next.js site, two modes, no login, no database.

- **Agent-native portal** (`/`): member home → denial detail → appeal workspace → confirm →
  case status. 14 WebMCP tools registered on `document.modelContext`, scoped to the route the
  member is on. Reads carry `readOnlyHint`. Writes return a proposal that the page renders.
  `submit_appeal` and `request_external_review` return `pending_confirmation`; only the
  member's click calls the server.
- **Legacy mode** (`/legacy`): same data, no tools. Denial letter as PDF, 6-page appeal form as
  PDF, fax/mail submission instructions. Deliberately typical.
- **Replay** ("Replay Maya's session"): animates the same tool calls and state transitions for
  judges without ChatGPT site-tools access.
- **Readiness report** (`/readiness` + `docs/readiness-report.md`): what blocked agents in the
  legacy portal, what tools were added, how writes were gated.
- **Agent activity panel**: every tool call is logged and shown on the page (the trust feature).

## Fictional world

Larkspur Health Plan (payer), Ridgeway Orthopedic Associates (provider), Maya Chen (member,
34). Prior auth 4471: MRI of the left knee, denied Aug 17 2026, reason CT-03 "conservative
therapy not documented", policy LHP-MSK-014 (5 itemized criteria). Maya's records: 8 weeks of PT
notes, ortho visit note with exam findings, medication history, PCP note. Appeal window 180 days
(closes Feb 13 2027). Plan decides appeals in 7 calendar days (standard) or 72 hours
(expedited) — the plan's fictional SLA, modelled on the CMS-0057-F decision clocks.

## State

Per-visitor sandbox in `localStorage` (zustand + persist), seeded on first visit, resettable.
Server is stateless: `POST /api/appeals/submit` validates the payload, requires the
human-confirmation marker, returns a case number, received time, decision-due time, and the
initial timeline. Status progression after submission is simulated client-side ("advance the
plan's clock" demo control).

## Tools (name · kind · scope)

Always: `get_member_context` R · `list_denials` R · `get_deadlines` R
Denial page: `get_denial` R · `get_coverage_criteria` R · `start_appeal` W (navigates)
Workspace: `draft_appeal` W-proposal · `update_appeal_section` W-proposal ·
`list_attachments` R · `check_completeness` R · `set_review_type` W-proposal
Review: `submit_appeal` GATED
After submission: `get_appeal_status` R · `request_external_review` GATED

Human-only by design: attaching records (button click), editing the draft, choosing review type,
Sign & submit, external-review confirm.

## WebMCP implementation rules

- `const mc = document.modelContext ?? navigator.modelContext` — never the removed
  `provideContext`/`unregisterTool`.
- One `AbortController` per tool; abort on unmount and before re-registering (StrictMode/HMR).
- Register only after the sandbox is hydrated.
- Headers: `Origin-Agent-Cluster: ?1`, `Permissions-Policy: tools=(self)`.
- Descriptions ≤ 500 chars and written to make the flow order discoverable; outputs ≤ 1.5K chars.
- Scope mode is a single constant (`route` | `all`). If ChatGPT does not re-observe tools that
  register after navigation, flip to `all` and out-of-step tools return a "not available at this
  step" result.

## Verification

- Puppeteer smoke test against local Chrome 152 with `--enable-features=WebMCP`: lists tools,
  runs the hero flow through the tools, asserts that `submit_appeal` alone never yields a case
  number and the click does.
- Manual: ChatGPT desktop browser on the deployed URL (the judges' environment); Chrome with
  `chrome://flags/#enable-webmcp-testing` + DevTools → Application → WebMCP.

## Submission checklist

Public repo + MIT visible on GitHub (flip visibility Wednesday morning) · live URL · <3-min video
· four-part description · README with 10-minute reproduction.
