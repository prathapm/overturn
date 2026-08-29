import { type SubmitResult, useStore } from "./store";

/**
 * The only path that files an appeal. Called from the member's click on the on-page
 * "Sign & submit" card (and by Replay, which simulates that click and says so in the log).
 */
export async function submitAppealByMember(appealId: string): Promise<SubmitResult> {
  const s = useStore.getState();
  const appeal = s.appeals.find((a) => a.id === appealId);
  if (!appeal) throw new Error("appeal_not_found");
  const res = await fetch("/api/appeals/submit", {
    method: "POST",
    headers: { "content-type": "application/json", "x-overturn-confirm": "member-click" },
    body: JSON.stringify({
      appeal_id: appeal.id,
      denial_id: appeal.denialId,
      review_type: appeal.reviewType,
      summary: appeal.summary,
      sections: appeal.sections.map((x) => ({ criterion_id: x.criterionId, text: x.text })),
      attachments: s.attachments,
      confirmed_by_member: true,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `submit_failed_${res.status}`);
  }
  const result = (await res.json()) as SubmitResult;
  s.confirmSubmission(appeal.id, result);
  s.log({ actor: "plan", summary: `Appeal received — case ${result.caseNumber}`, detail: `Decision due ${new Date(result.decisionDueAt).toLocaleString()}` });
  return result;
}
