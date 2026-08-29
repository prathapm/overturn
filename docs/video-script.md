# Overturn — demo video script (target 2:50)

Record in the ChatGPT desktop app's built-in browser (Cmd/Ctrl+Shift+B) at the live URL, with the
Activity panel visible. Screen only, one voice per segment, no music under speech. Record the
legacy run first so the numbers in the final frame are real.

## 0:00–0:30 — Rajani (the problem)

*[Title card: 53 million requests. 11.5% appealed. 81% of appeals win.]*

"In Medicare Advantage alone, plans made fifty-three million prior-authorization decisions last
year. When they said no, only eleven and a half percent of people appealed — and eighty-one percent
of those appeals won. Millions of winnable denials are never contested, because appealing is
paperwork: a PDF letter, a six-page form, a fax number.

Since January, federal rule CMS-0057-F forces plans to decide in seven days and to expose their
prior-auth process as an API by 2027. The plan side is being made machine-readable by law.
Nobody is building the member's side. So we did."

## 0:30–1:00 — Prathap (the bridge)

*[Cut to the legacy portal, /legacy/denials/4471, in the ChatGPT browser.]*

"I've spent years on the other side of disputes like this. I've watched what happens to a claim
nobody files: nothing. Here's Maya. Her orthopedist ordered a knee MRI. Her plan denied it —
'conservative therapy not documented' — after she'd done eight weeks of physical therapy.

Watch her agent try the portal as it exists today."

*[Agent prompt: "Help me appeal this denial." Let it run ~15 s: it opens the PDF, finds Form
LHP-402, then reaches the fax number. Overlay: steps, seconds.]*

"It reads the letter. It finds the form. And it stops — at a fax number. No agent can fax.

The lesson we took from Cursor is that people trust a tool that shows its work and lets them change
it. In healthcare, that isn't a nice-to-have. It's the whole product."

## 1:00–2:35 — Chitral (the demo)

*[Switch to /denials/4471 in the agent-native mode. Point at the Site tools indicator.]*

"Same portal. Same data. Now it has site tools."

*[Prompt: "Help me appeal this denial."]*

"The agent reads the structured denial and the plan's own criteria — five of them. It opens the
appeal and drafts one argument per criterion, citing Maya's records by name."

*[Workspace appears; draft renders with the 'drafted by your agent' label; Activity panel scrolls.]*

"The draft is on the page, labelled, editable. Completeness says zero of five — because nothing is
attached yet, and attaching is Maya's job."

*[Click Attach on the PT notes, the ortho note, the medication history. Completeness climbs.]*

"Maya changes one sentence to say it her way."

*[Edit C2. Activity shows 'Edited the argument for C2' and 'Completeness re-checked'.]*

"The agent sees the edit, re-checks, and proposes expedited review — her symptoms are documented as
worsening. Her call. Then it asks to submit."

*[The Sign & submit card pulses.]*

"It cannot submit. It can only ask. Maya signs."

*[Click Sign & submit. Case number appears; decision due in 72 hours; tools in the address bar
change to status tools.]*

"Case number. Seventy-two-hour clock. And the tool surface just changed — drafting tools are gone,
status tools are in."

## 2:35–2:55 — Rajani (the close)

*[Side-by-side: legacy — N steps, M:SS, stalled at fax · Overturn — 9 tool calls, 0:48, filed.]*

"Before: stalled at a fax machine. After: a filed appeal in one sitting, with the human touching
only the four decisions that were hers. Every plan must expose this by 2027. Overturn is what their
portal should look like when they do."

*[Team card: Prathap · Rajani · Chitral. Overturn. MIT. Repo URL.]*

## Recording checklist

- [ ] Legacy run recorded first; real step count and time written into the final frame.
- [ ] Reset the sandbox (Activity panel → Reset) before the hero take.
- [ ] Activity panel visible throughout the hero take.
- [ ] Audio levels checked; no names of real payers, employers, or products.
- [ ] Under 3:00. Public on YouTube. Link pasted into README and Devpost.
