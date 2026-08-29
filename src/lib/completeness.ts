import type { Appeal } from "./store";
import { type MemberRecord, type Policy } from "./seed";

export type CriterionAssessment = {
  id: string;
  argument: "present" | "missing";
  evidence: "attached" | "available" | "none";
  attachedRecords: string[];
  availableRecords: string[];
  status: "complete" | "needs_evidence" | "needs_argument" | "too_short" | "missing";
};

export type Completeness = {
  complete: boolean;
  score: string; // "4 of 5"
  criteria: CriterionAssessment[];
  nextSteps: string[];
};

export function evaluateCompleteness(
  appeal: Appeal | undefined,
  attachments: string[],
  policy: Policy,
  records: MemberRecord[],
): Completeness {
  const criteria = policy.criteria.map<CriterionAssessment>((c) => {
    const section = appeal?.sections.find((s) => s.criterionId === c.id);
    const trimmed = section?.text.trim() ?? "";
    const hasArgument = trimmed.length > 20;
    const tooShort = trimmed.length > 0 && !hasArgument;
    const supporting = records.filter((r) => r.supports.includes(c.id));
    const attached = supporting.filter((r) => attachments.includes(r.id));
    const available = supporting.filter((r) => !attachments.includes(r.id));
    const evidence = attached.length ? "attached" : available.length ? "available" : "none";
    let status: CriterionAssessment["status"] = "missing";
    if (hasArgument && evidence === "attached") status = "complete";
    else if (hasArgument) status = "needs_evidence";
    else if (tooShort) status = "too_short";
    else if (evidence === "attached") status = "needs_argument";
    return {
      id: c.id,
      argument: hasArgument ? "present" : "missing",
      evidence,
      attachedRecords: attached.map((r) => r.id),
      availableRecords: available.map((r) => r.id),
      status,
    };
  });

  const completeCount = criteria.filter((c) => c.status === "complete").length;
  const nextSteps: string[] = [];
  for (const c of criteria) {
    if (c.status === "complete") continue;
    if (c.status === "too_short") nextSteps.push(`The argument for ${c.id} is too short — cite the record and the dates.`);
    else if (c.argument === "missing") nextSteps.push(`Write an argument for ${c.id}.`);
    if (c.evidence === "available") {
      const titles = c.availableRecords
        .map((id) => records.find((r) => r.id === id)?.title)
        .filter(Boolean);
      nextSteps.push(`Ask the member to attach: ${titles.join("; ")} (supports ${c.id}).`);
    }
    if (c.evidence === "none") nextSteps.push(`No record on file supports ${c.id}; ask the member or clinic for one.`);
  }

  return {
    complete: completeCount === criteria.length,
    score: `${completeCount} of ${criteria.length}`,
    criteria,
    nextSteps: Array.from(new Set(nextSteps)),
  };
}
