import { ALL_TOOL_NAMES } from "@/lib/tools";

const blockers = [
  ["The denial is a PDF", "Reason code, policy cited and the appeal deadline lived inside a two-page letter. An agent had to OCR and guess.", "get_denial returns the structured determination; get_deadlines returns the clocks."],
  ["The plan's criteria were not on the portal", "Members were told a policy number and nothing else. Meeting criteria you cannot see is luck.", "get_coverage_criteria returns the policy's itemized criteria and which records on file support each one."],
  ["Submission channel was fax or mail", "No browser agent can action a fax number. This is where every 'before' run stalls.", "submit_appeal → pending_confirmation → the member's click posts the appeal and receives a case number."],
  ["A six-page PDF form", "Free-text sections with no structure; no way to know when it is complete.", "draft_appeal / update_appeal_section write one argument per criterion; check_completeness scores it."],
  ["No way to see what an agent did", "Trust requires visibility. A chatbot that 'handles it' hides the work.", "Every tool call is logged on the page; agent-written text is labelled and editable."],
];

export default function ReadinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent-readiness report · Larkspur member portal</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">
          What blocked agents in the legacy portal, what changed, and how consequential actions were gated. This is the retrofit
          record — the process that turns an existing portal into one people and their agents can use together.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[["5", "blockers found"], [String(ALL_TOOL_NAMES.length), "tools added"], ["2", "gated writes (member click required)"]].map(([n, l]) => (
          <div key={l} className="rounded-lg border border-line bg-panel px-4 py-3">
            <div className="text-3xl font-semibold text-brand tabular-nums">{n}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-lg border border-line bg-panel">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2">Blocker</th><th className="px-4 py-2">Why it mattered</th><th className="px-4 py-2">What changed</th></tr>
          </thead>
          <tbody>
            {blockers.map(([b, w, c]) => (
              <tr key={b} className="border-t border-line align-top">
                <td className="px-4 py-3 font-medium">{b}</td>
                <td className="px-4 py-3 text-muted">{w}</td>
                <td className="px-4 py-3">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Design rules applied</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li><b>Scoped surface.</b> Tools register with the page and the appeal’s state: reads everywhere, drafting tools in the workspace, status tools after filing.</li>
          <li><b>Reads are free, writes are proposals.</b> Reads carry <code className="font-mono text-xs">readOnlyHint</code>. Write tools render a proposal the member can edit; nothing is sent.</li>
          <li><b>Two gated commits.</b> <code className="font-mono text-xs">submit_appeal</code> and <code className="font-mono text-xs">request_external_review</code> return <i>pending_confirmation</i>; only the member’s click reaches the server, which refuses anything else.</li>
          <li><b>Human-only by design.</b> Attaching records, editing the draft, choosing standard vs. expedited, signing.</li>
          <li><b>Visible work.</b> Every call is logged on the page; agent-written text is labelled and editable — the member sees the diff before it ships.</li>
          <li><b>Budgets.</b> Descriptions under 500 characters, outputs under 1,500; the same session and cookies as the member.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Tools</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ALL_TOOL_NAMES.map((n) => <code key={n} className="rounded bg-panel-2 px-2 py-0.5 font-mono text-xs">{n}</code>)}
        </div>
      </section>
    </div>
  );
}
