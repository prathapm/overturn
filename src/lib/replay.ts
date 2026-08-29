import { afterTools, alwaysTools, denialTools, workspaceTools } from "./tools";
import { useStore } from "./store";
import { runTool, type ToolDef } from "./webmcp";
import { submitAppealByMember } from "./submit";

export const cannedDraft = {
  summary:
    "Larkspur denied MRI of the left knee because conservative therapy was not documented. Ms. Chen completed eight weeks of supervised physical therapy with persistent symptoms, meets every criterion of policy LHP-MSK-014, and the result will determine whether she has surgery.",
  sections: [
    {
      criterion_id: "C1",
      argument:
        "Policy LHP-MSK-014 requires at least six weeks of conservative therapy. Ms. Chen completed 16 supervised physical therapy sessions over eight weeks (June 9 – August 4, 2026) plus a home exercise program, as documented in the Physical therapy progress notes, Jun 9 – Aug 4, 2026, following the referral in the Primary-care visit note, May 28, 2026.",
    },
    {
      criterion_id: "C2",
      argument:
        "Symptoms persisted after therapy: the PT discharge note records ongoing lateral joint-line pain and episodes of the knee giving way on stairs with no meaningful functional improvement, and the Orthopedic visit note, Aug 12, 2026 documents giving way while descending stairs.",
    },
    {
      criterion_id: "C3",
      argument:
        "Ms. Chen took naproxen 500 mg twice daily from June 2 to July 28, 2026, discontinued for stomach upset (Medication history, 2026), and has used acetaminophen as needed since.",
    },
    {
      criterion_id: "C4",
      argument:
        "Dr. Okafor's examination on August 12, 2026 found a positive McMurray test, mild effusion and lateral joint-line tenderness — findings suggestive of internal derangement (Orthopedic visit note, Aug 12, 2026).",
    },
    {
      criterion_id: "C5",
      argument:
        "Dr. Okafor's assessment is a suspected lateral meniscal tear; the MRI is ordered to confirm the tear and to plan arthroscopy, so the result directly determines surgical management (Orthopedic visit note, Aug 12, 2026).",
    },
  ],
};

export const memberEditC2 =
  "Symptoms persisted after therapy: the PT discharge note records ongoing lateral joint-line pain with no meaningful functional improvement, and the Orthopedic visit note, Aug 12, 2026 documents that her knee gives way when she goes down stairs — which is why she has stopped using the stairs at work.";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = (list: ToolDef[], name: string) => {
  const t = list.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} missing`);
  return t;
};

/** Replays Maya's session: the same tool calls an agent would make, plus Maya's own clicks, with pacing. */
export async function replaySession(navigate: (p: string) => void, pace = 1100) {
  const s = useStore.getState();
  s.reset();
  s.setReplaying(true);
  s.log({ actor: "system", summary: "Replay started — the agent's tool calls and Maya's clicks, as they happened" });
  const ctx = { navigate };
  try {
    await wait(pace);
    await runTool(pick(alwaysTools(), "get_member_context"), {});
    await wait(pace);
    navigate("/denials/4471");
    await wait(pace);
    await runTool(pick(denialTools(ctx), "get_denial"), { denial_id: "4471" });
    await wait(pace);
    await runTool(pick(denialTools(ctx), "get_coverage_criteria"), { denial_id: "4471" });
    await wait(pace);
    await runTool(pick(denialTools(ctx), "start_appeal"), { denial_id: "4471" });
    await wait(pace * 1.5);
    await runTool(pick(workspaceTools(), "draft_appeal"), { appeal_id: "A-4471", ...cannedDraft });
    await wait(pace);
    await runTool(pick(workspaceTools(), "check_completeness"), { appeal_id: "A-4471" });
    await wait(pace * 1.5);

    // Maya's turn: attach records (a human gesture) and edit one argument.
    const st = useStore.getState();
    st.attach("R1");
    st.log({ actor: "member", summary: "Attached: Physical therapy progress notes, Jun 9 – Aug 4, 2026" });
    await wait(pace * 0.8);
    st.attach("R2");
    st.log({ actor: "member", summary: "Attached: Orthopedic visit note, Aug 12, 2026" });
    await wait(pace * 0.8);
    st.attach("R3");
    st.log({ actor: "member", summary: "Attached: Medication history, 2026" });
    await wait(pace);
    st.updateSection("A-4471", "C2", memberEditC2, "member");
    st.log({ actor: "member", summary: "Edited the argument for C2 in her own words" });
    await wait(pace);

    // The agent notices the edit and the attachments, re-checks, and proposes expedited review.
    await runTool(pick(workspaceTools(), "check_completeness"), { appeal_id: "A-4471" });
    await wait(pace);
    await runTool(pick(workspaceTools(), "set_review_type"), {
      appeal_id: "A-4471",
      review_type: "expedited",
      reason: "The August 12 note documents worsening instability and a suspected tear awaiting surgical planning.",
    });
    await wait(pace);
    await runTool(pick(workspaceTools(), "submit_appeal"), { appeal_id: "A-4471" });
    await wait(pace * 2);

    // Maya signs.
    useStore.getState().log({ actor: "member", summary: "Clicked Sign & submit" });
    await submitAppealByMember("A-4471");
    await wait(pace);
    await runTool(pick(afterTools(), "get_appeal_status"), { appeal_id: "A-4471" });
    useStore.getState().log({ actor: "system", summary: "Replay finished" });
  } finally {
    useStore.getState().setReplaying(false);
  }
}
