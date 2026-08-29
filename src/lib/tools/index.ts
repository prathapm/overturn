import { evaluateCompleteness } from "../completeness";
import { appealWindow, decisionClock, decisionDue, fmtDate, fmtDateTime } from "../dates";
import { payer, policy, records as allRecords } from "../seed";
import { type Appeal, useStore } from "../store";
import type { ToolDef } from "../webmcp";

/**
 * Scope mode:
 *  - "route": tools appear and disappear with the page and the appeal's state (the design intent).
 *  - "all":   every tool is registered at boot and out-of-step tools explain what to do first.
 * Flip to "all" if the judging agent does not re-observe tools registered after navigation.
 */
export const SCOPE_MODE: "route" | "all" = "route";

export type ToolContext = {
  navigate: (path: string) => void;
};

const S = () => useStore.getState();

function notAvailable(step: string, doFirst: string) {
  return { available: false, reason: `Not available at this step (${step}).`, do_first: doFirst };
}

function findDenial(id: unknown) {
  const denialId = String(id ?? "").replace(/^PA-2026-00/, "") || "4471";
  return S().denials.find((d) => d.id === denialId);
}

function findAppeal(id: unknown): Appeal | undefined {
  const appealId = String(id ?? "");
  return S().appeals.find((a) => a.id === appealId) ?? S().appeals[0];
}

function appealSummary(a: Appeal) {
  return {
    appeal_id: a.id,
    denial_id: a.denialId,
    status: a.status,
    review_type: a.reviewType,
    case_number: a.caseNumber ?? null,
    sections: a.sections.map((s) => ({ criterion_id: s.criterionId, author: s.author, chars: s.text.length })),
  };
}

// ---------- always available ----------

export const alwaysTools = (): ToolDef[] => [
  {
    name: "get_member_context",
    description:
      "Who is signed in and where things stand: member name and plan, open prior-authorization denials, active appeals with status, and the appeal window. Call this first to orient, then get_denial for details.",
    readOnly: true,
    inputSchema: { type: "object", properties: {} },
    execute: () => {
      const s = S();
      return {
        member: { name: s.member.name, member_id: s.member.id, plan: s.member.plan },
        payer: payer.name,
        denials: s.denials.map((d) => {
          const w = appealWindow(d.decidedOn);
          const appeal = s.appeals.find((a) => a.denialId === d.id);
          return {
            denial_id: d.id,
            service: d.service,
            decided_on: d.decidedOn,
            reason_code: d.reasonCode,
            appeal_window: `day ${w.dayOf} of ${w.windowDays}, closes ${fmtDate(w.closes)}`,
            appeal_status: appeal?.status ?? "not_started",
            appeal_id: appeal?.id ?? null,
          };
        }),
        next: s.appeals.length ? "Open the appeal with get_appeal_status or continue drafting." : "Call get_denial with the denial_id to read the denial.",
      };
    },
  },
  {
    name: "list_denials",
    description:
      "List the member's prior-authorization denials: denial_id, service, decision date, reason code and text, and whether an appeal exists. Use get_denial for the full structured detail of one denial.",
    readOnly: true,
    inputSchema: { type: "object", properties: {} },
    execute: () => {
      const s = S();
      return s.denials.map((d) => ({
        denial_id: d.id,
        auth_number: d.authNumber,
        service: d.service,
        decided_on: d.decidedOn,
        reason_code: d.reasonCode,
        reason: d.reasonText,
        policy_id: d.policyId,
        appeal_status: s.appeals.find((a) => a.denialId === d.id)?.status ?? "not_started",
      }));
    },
  },
  {
    name: "get_deadlines",
    description:
      "The deadlines that matter: the 180-day window to appeal each denial (which day we are on, when it closes) and the plan's decision clocks once an appeal is filed (7 calendar days standard, 72 hours expedited). Includes any filed appeal's decision-due time.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: { denial_id: { type: "string", description: "Optional denial id, e.g. 4471" } },
    },
    execute: ({ denial_id }) => {
      const s = S();
      const denials = denial_id ? s.denials.filter((d) => d.id === String(denial_id)) : s.denials;
      return denials.map((d) => {
        const w = appealWindow(d.decidedOn);
        const appeal = s.appeals.find((a) => a.denialId === d.id);
        return {
          denial_id: d.id,
          denied_on: d.decidedOn,
          appeal_window: { day: w.dayOf, of: w.windowDays, days_left: w.daysLeft, closes: fmtDate(w.closes) },
          decision_clock_after_filing: decisionClock,
          filed_appeal: appeal?.submittedAt
            ? { case_number: appeal.caseNumber, received: fmtDateTime(appeal.submittedAt), decision_due: appeal.decisionDueAt ? fmtDateTime(appeal.decisionDueAt) : null }
            : null,
        };
      });
    },
  },
];

// ---------- denial page ----------

export const denialTools = (ctx: ToolContext): ToolDef[] => [
  {
    name: "get_denial",
    description:
      "Structured detail of one denial: service and CPT, request and decision dates, reason code and text, the medical policy cited, ordering provider, who decided, and an excerpt of the letter. Next: get_coverage_criteria to see the policy's itemized criteria the appeal must meet.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: { denial_id: { type: "string", description: "Denial id, e.g. 4471" } },
      required: ["denial_id"],
    },
    execute: ({ denial_id }) => {
      const d = findDenial(denial_id);
      if (!d) return { error: "denial_not_found" };
      const w = appealWindow(d.decidedOn);
      return {
        denial_id: d.id,
        auth_number: d.authNumber,
        service: d.service,
        cpt: d.cpt,
        requested_on: d.requestedOn,
        decided_on: d.decidedOn,
        reason_code: d.reasonCode,
        reason: d.reasonText,
        policy_cited: d.policyId,
        ordering_provider: `${d.orderingProvider.name}, ${d.orderingProvider.specialty}, ${d.orderingProvider.practice}`,
        decided_by: d.decider,
        appeal_window: `day ${w.dayOf} of ${w.windowDays}; closes ${fmtDate(w.closes)}`,
        letter_excerpt: d.letter[2],
        next: "get_coverage_criteria",
      };
    },
  },
  {
    name: "get_coverage_criteria",
    description:
      "The plan's own medical-policy criteria for a denial, itemized with ids (C1–C5), the kind of evidence that satisfies each, and which of the member's records on file support each criterion. Use these criterion ids when drafting with draft_appeal.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: { denial_id: { type: "string", description: "Denial id, e.g. 4471" } },
      required: ["denial_id"],
    },
    execute: ({ denial_id }) => {
      const d = findDenial(denial_id);
      if (!d) return { error: "denial_not_found" };
      const attachments = S().attachments;
      return {
        policy_id: policy.id,
        title: policy.title,
        criteria: policy.criteria.map((c) => ({
          id: c.id,
          criterion: c.text,
          evidence_needed: c.evidence,
          records_on_file: allRecords
            .filter((r) => r.supports.includes(c.id))
            .map((r) => ({ record_id: r.id, title: r.title, attached: attachments.includes(r.id) })),
        })),
        next: "start_appeal, then draft_appeal with one argument per criterion id",
      };
    },
  },
  {
    name: "start_appeal",
    description:
      "Create an appeal draft for a denial and open the appeal workspace on the page. Reversible; nothing is sent to the plan. Returns the appeal_id to use with draft_appeal and check_completeness.",
    inputSchema: {
      type: "object",
      properties: { denial_id: { type: "string", description: "Denial id, e.g. 4471" } },
      required: ["denial_id"],
    },
    execute: ({ denial_id }) => {
      const d = findDenial(denial_id);
      if (!d) return { error: "denial_not_found" };
      const appeal = S().startAppeal(d.id);
      S().log({ actor: "system", summary: `Appeal ${appeal.id} opened for denial ${d.id}` });
      ctx.navigate(`/appeals/${appeal.id}`);
      return { appeal_id: appeal.id, status: appeal.status, opened: `/appeals/${appeal.id}`, next: "draft_appeal" };
    },
  },
];

// ---------- appeal workspace ----------

export const workspaceTools = (): ToolDef[] => [
  {
    name: "draft_appeal",
    description:
      "Propose the appeal: a 1–2 sentence summary and one argument per policy criterion (use criterion ids from get_coverage_criteria; cite the member's records by title). The draft is rendered on the page labelled 'drafted by your agent' for the member to edit — it is NOT sent. Then call check_completeness.",
    inputSchema: {
      type: "object",
      properties: {
        appeal_id: { type: "string", description: "Appeal id from start_appeal, e.g. A-4471" },
        summary: { type: "string", description: "One or two sentences: why the denial should be overturned" },
        sections: {
          type: "array",
          description: "One entry per criterion",
          items: {
            type: "object",
            properties: {
              criterion_id: { type: "string", description: "C1..C5" },
              argument: { type: "string", description: "The argument for this criterion, citing records by title" },
            },
            required: ["criterion_id", "argument"],
          },
        },
      },
      required: ["appeal_id", "summary", "sections"],
    },
    execute: ({ appeal_id, summary, sections }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found", do_first: "start_appeal" };
      if (a.status !== "draft" && a.status !== "pending_confirmation") return notAvailable(a.status, "The appeal is already filed; use get_appeal_status.");
      const secs = (Array.isArray(sections) ? sections : []) as { criterion_id: string; argument: string }[];
      S().setDraft(
        a.id,
        String(summary ?? ""),
        secs.map((x) => ({ criterionId: String(x.criterion_id), text: String(x.argument ?? "") })),
        "agent",
      );
      const c = evaluateCompleteness(findAppeal(a.id), S().attachments, policy, allRecords);
      return { status: "proposed", rendered: "on page, editable by the member", completeness: c.score, next_steps: c.nextSteps };
    },
  },
  {
    name: "update_appeal_section",
    description:
      "Revise one criterion's argument in the draft, for example after the member attaches a record or edits text. Rendered on the page; not sent. Re-run check_completeness afterwards.",
    inputSchema: {
      type: "object",
      properties: {
        appeal_id: { type: "string" },
        criterion_id: { type: "string", description: "C1..C5" },
        argument: { type: "string" },
      },
      required: ["appeal_id", "criterion_id", "argument"],
    },
    execute: ({ appeal_id, criterion_id, argument }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found" };
      if (a.status !== "draft" && a.status !== "pending_confirmation") return notAvailable(a.status, "The appeal is already filed.");
      S().updateSection(a.id, String(criterion_id), String(argument ?? ""), "agent");
      return { status: "proposed", criterion_id, rendered: "on page" };
    },
  },
  {
    name: "list_attachments",
    description:
      "Records the member has attached to the appeal, and records on file that are available but not yet attached (with the criteria each supports). Attaching is a human action: ask the member to click Attach on the page.",
    readOnly: true,
    inputSchema: { type: "object", properties: { appeal_id: { type: "string" } } },
    execute: () => {
      const s = S();
      return {
        attached: allRecords.filter((r) => s.attachments.includes(r.id)).map((r) => ({ record_id: r.id, title: r.title, supports: r.supports })),
        available_not_attached: allRecords
          .filter((r) => !s.attachments.includes(r.id))
          .map((r) => ({ record_id: r.id, title: r.title, supports: r.supports, summary: r.summary })),
        how_to_attach: "Member clicks Attach next to the record on the page.",
      };
    },
  },
  {
    name: "check_completeness",
    description:
      "Evaluate the draft against the plan's criteria: for each criterion, whether an argument exists and whether an attached record evidences it. Returns the score, what is missing, and exactly what to ask the member to do. Re-run after any edit or attachment; required before submit_appeal.",
    readOnly: true,
    inputSchema: { type: "object", properties: { appeal_id: { type: "string" } }, required: ["appeal_id"] },
    execute: ({ appeal_id }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found", do_first: "start_appeal" };
      const c = evaluateCompleteness(a, S().attachments, policy, allRecords);
      return {
        complete: c.complete,
        score: c.score,
        criteria: c.criteria.map((x) => ({ id: x.id, status: x.status, argument: x.argument, evidence: x.evidence, attached: x.attachedRecords, available: x.availableRecords })),
        next_steps: c.nextSteps,
        review_type: a.reviewType,
        ready_to_submit: c.complete,
      };
    },
  },
  {
    name: "set_review_type",
    description:
      "Propose standard review (decided in 7 calendar days) or expedited review (72 hours; appropriate when waiting could seriously harm health, e.g. worsening symptoms documented) with a one-sentence reason. The member confirms the choice on the page.",
    inputSchema: {
      type: "object",
      properties: {
        appeal_id: { type: "string" },
        review_type: { type: "string", enum: ["standard", "expedited"] },
        reason: { type: "string", description: "One sentence" },
      },
      required: ["appeal_id", "review_type"],
    },
    execute: ({ appeal_id, review_type, reason }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found" };
      if (a.status !== "draft" && a.status !== "pending_confirmation") return notAvailable(a.status, "The appeal is already filed.");
      const rt = review_type === "expedited" ? "expedited" : "standard";
      S().setReviewType(a.id, rt, reason ? String(reason) : undefined, "agent");
      return { status: "proposed", review_type: rt, decision_clock: decisionClock[rt], member_confirms: "on page" };
    },
  },
  {
    name: "submit_appeal",
    description:
      "Request submission of the appeal to Larkspur. This does NOT file it: it returns pending_confirmation and shows a 'Sign & submit' card on the page — only the member's click files the appeal and returns a case number. Call check_completeness first; incomplete appeals are refused.",
    inputSchema: { type: "object", properties: { appeal_id: { type: "string" } }, required: ["appeal_id"] },
    execute: ({ appeal_id }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found" };
      if (a.status !== "draft" && a.status !== "pending_confirmation") return notAvailable(a.status, "Already filed; use get_appeal_status.");
      const c = evaluateCompleteness(a, S().attachments, policy, allRecords);
      if (!c.complete) return { status: "refused", reason: `Appeal is ${c.score} complete.`, next_steps: c.nextSteps };
      S().markPendingConfirmation(a.id);
      return {
        status: "pending_confirmation",
        message: "A Sign & submit card is now showing on the page. Ask the member to review and click it. Nothing has been sent.",
        review_type: a.reviewType,
        decision_clock: decisionClock[a.reviewType],
      };
    },
  },
];

// ---------- after submission ----------

export const afterTools = (): ToolDef[] => [
  {
    name: "get_appeal_status",
    description:
      "Status of a filed appeal: case number, received time, decision due, timeline, and the decision once issued. If the plan upheld its denial, request_external_review becomes available.",
    readOnly: true,
    inputSchema: { type: "object", properties: { appeal_id: { type: "string" } } },
    execute: ({ appeal_id }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found" };
      if (!a.caseNumber) return { ...appealSummary(a), filed: false, next: "The appeal is not filed yet; see check_completeness / submit_appeal." };
      return {
        ...appealSummary(a),
        filed: true,
        received: a.submittedAt ? fmtDateTime(a.submittedAt) : null,
        decision_due: a.decisionDueAt ? fmtDateTime(a.decisionDueAt) : null,
        decision: a.decision ? { outcome: a.decision.outcome, at: fmtDateTime(a.decision.at), note: a.decision.note } : null,
        external_review_case: a.externalReviewCase ?? null,
        timeline: a.timeline.map((t) => `${fmtDateTime(t.at)} — ${t.event}`),
      };
    },
  },
  {
    name: "request_external_review",
    description:
      "If the plan upheld its denial, prepare a request for independent external review by an Independent Review Organization. Returns pending_confirmation and shows a confirm card on the page; only the member's click sends it.",
    inputSchema: { type: "object", properties: { appeal_id: { type: "string" } }, required: ["appeal_id"] },
    execute: ({ appeal_id }) => {
      const a = findAppeal(appeal_id);
      if (!a) return { error: "appeal_not_found" };
      if (a.status === "external_review_pending") return { status: "pending_confirmation", message: "Confirm card already showing." };
      if (a.status !== "upheld") return notAvailable(a.status, "External review is only available after the plan upholds its denial.");
      S().markExternalPending(a.id);
      return { status: "pending_confirmation", message: "A confirm card is showing on the page. Ask the member to click 'Request external review'." };
    },
  },
];

// ---------- scoping ----------

export function toolsForRoute(pathname: string, ctx: ToolContext): ToolDef[] {
  const s = S();
  const all = [...alwaysTools(), ...denialTools(ctx), ...workspaceTools(), ...afterTools()];
  if (SCOPE_MODE === "all") return all;

  const tools: ToolDef[] = [...alwaysTools()];
  if (/^\/denials\/[^/]+/.test(pathname)) tools.push(...denialTools(ctx));
  const m = pathname.match(/^\/appeals\/([^/]+)/);
  if (m) {
    const appeal = s.appeals.find((a) => a.id === decodeURIComponent(m[1]));
    if (!appeal || appeal.status === "draft" || appeal.status === "pending_confirmation") {
      tools.push(...workspaceTools());
    } else {
      tools.push(...afterTools());
    }
  }
  return tools;
}

export const ALL_TOOL_NAMES = [
  "get_member_context", "list_denials", "get_deadlines",
  "get_denial", "get_coverage_criteria", "start_appeal",
  "draft_appeal", "update_appeal_section", "list_attachments", "check_completeness", "set_review_type", "submit_appeal",
  "get_appeal_status", "request_external_review",
];

export { decisionDue };
