# Agent-readiness report — Larkspur member portal

The retrofit record: what blocked agents in the legacy portal (`/legacy`), what changed, and how
consequential actions were gated. Generated during the Overturn build (Aug 29 2026).

## Summary

| | |
|---|---|
| Blockers found | 5 |
| Tools added | 14 |
| Gated writes (member click required) | 2 (`submit_appeal`, `request_external_review`) |
| Human-only steps by design | 4 (attach records, edit draft, choose review type, sign) |

## Blockers → changes

| Blocker in the legacy portal | Why it mattered | What changed |
|---|---|---|
| The denial is a PDF | Reason code, policy cited and deadline lived in a two-page letter; an agent had to OCR and guess | `get_denial` returns the structured determination; `get_deadlines` returns the clocks |
| The plan's criteria were not on the portal | Members were told a policy number and nothing else | `get_coverage_criteria` returns the itemized criteria and which records on file support each |
| Submission was fax or mail | No browser agent can action a fax number — every "before" run stalls here | `submit_appeal` → `pending_confirmation` → the member's click posts and receives a case number |
| A six-page PDF form | Free text; no way to know when it is complete | `draft_appeal` / `update_appeal_section` write one argument per criterion; `check_completeness` scores it |
| No visibility of agent work | Trust requires seeing the work | Every tool call is logged on the page; agent-written text is labelled and editable |

## Design rules applied

1. **Scoped surface.** `toolsForRoute()` derives the tool set from the route and the appeal's
   status. Denial-page tools unregister on leaving; drafting tools give way to status tools once
   the appeal is filed.
2. **Reads are free, writes are proposals.** `readOnlyHint` on all reads. Write tools render on
   the page; nothing is sent.
3. **Two gated commits.** The tool returns `pending_confirmation`; the on-page click is the only
   path to `/api/appeals/submit`, which requires the human marker and returns 403 otherwise.
4. **Budgets.** Descriptions ≤ 500 chars, written so the flow order is discoverable; outputs
   capped at ~1.5K chars.
5. **Session.** Tools run as page JS in the member's signed-in context; headers
   `Origin-Agent-Cluster: ?1`, `Permissions-Policy: tools=(self)`.
6. **Failure isolation.** Registration failures are caught and logged; the portal keeps working
   for humans if the agent surface fails.

## Verification

- `tests/smoke.mjs` (Puppeteer, Chrome 152, `--enable-features=WebMCP`): 26 checks — scoped
  registration across navigation, the hero flow through the tools, the gate (no case number
  without the click; direct POST refused with 403), post-filing surface swap, description budgets.
- Manual: ChatGPT desktop browser, Chrome with `chrome://flags/#enable-webmcp-testing`.

## What a production retrofit adds

- Bind the submit route to the authenticated member and the plan's FHIR Prior Authorization API
  (CMS-0057-F, Jan 2027).
- Real record retrieval (provider access / HIE) behind the same human attach step.
- Origin-trial token for Chrome so members do not need the flag.
