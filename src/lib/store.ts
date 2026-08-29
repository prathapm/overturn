import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { decisionDue } from "./dates";
import {
  type Denial,
  type MemberRecord,
  member as seedMember,
  seedState,
} from "./seed";

export type ReviewType = "standard" | "expedited";

export type AppealStatus =
  | "draft"
  | "pending_confirmation"
  | "submitted"
  | "under_review"
  | "overturned"
  | "upheld"
  | "external_review_pending"
  | "external_review_requested";

export type AppealSection = {
  criterionId: string;
  text: string;
  author: "agent" | "member";
  updatedAt: string;
};

export type TimelineEntry = { at: string; event: string };

export type Appeal = {
  id: string;
  denialId: string;
  createdAt: string;
  summary: string;
  sections: AppealSection[];
  reviewType: ReviewType;
  reviewReason?: string;
  reviewChosenBy?: "agent" | "member";
  status: AppealStatus;
  caseNumber?: string;
  submittedAt?: string;
  decisionDueAt?: string;
  decision?: { outcome: "overturned" | "upheld"; at: string; note: string };
  externalReviewCase?: string;
  timeline: TimelineEntry[];
};

export type ActivityEntry = {
  id: string;
  at: string;
  actor: "agent" | "member" | "plan" | "system";
  tool?: string;
  summary: string;
  detail?: string;
};

export type SubmitResult = {
  caseNumber: string;
  receivedAt: string;
  decisionDueAt: string;
  timeline: TimelineEntry[];
};

type Snapshot = ReturnType<typeof seedState>;

export type OverturnState = Snapshot & {
  hydrated: boolean;
  appeals: Appeal[];
  activity: ActivityEntry[];
  replaying: boolean;
  member: typeof seedMember;
  denials: Denial[];
  records: MemberRecord[];

  reset: () => void;
  log: (entry: Omit<ActivityEntry, "id" | "at">) => void;
  setReplaying: (on: boolean) => void;

  startAppeal: (denialId: string) => Appeal;
  setDraft: (
    appealId: string,
    summary: string,
    sections: { criterionId: string; text: string }[],
    author: "agent" | "member",
  ) => void;
  updateSection: (
    appealId: string,
    criterionId: string,
    text: string,
    author: "agent" | "member",
  ) => void;
  attach: (recordId: string) => void;
  detach: (recordId: string) => void;
  setReviewType: (
    appealId: string,
    reviewType: ReviewType,
    reason: string | undefined,
    by: "agent" | "member",
  ) => void;
  markPendingConfirmation: (appealId: string) => void;
  cancelPending: (appealId: string) => void;
  confirmSubmission: (appealId: string, result: SubmitResult) => void;
  advanceClock: (appealId: string, outcome?: "overturned" | "upheld") => void;
  markExternalPending: (appealId: string) => void;
  cancelExternalPending: (appealId: string) => void;
  confirmExternalReview: (appealId: string, externalCase: string) => void;
};

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function updateAppeal(
  appeals: Appeal[],
  id: string,
  fn: (a: Appeal) => Appeal,
): Appeal[] {
  return appeals.map((a) => (a.id === id ? fn(a) : a));
}

export const useStore = create<OverturnState>()(
  persist(
    (set, get) => ({
      ...seedState(),
      hydrated: false,
      appeals: [],
      activity: [],
      replaying: false,

      reset: () =>
        set({
          ...seedState(),
          appeals: [],
          activity: [
            {
              id: uid(),
              at: now(),
              actor: "system",
              summary: "Sandbox reset — fresh copy of Maya's account",
            },
          ],
          replaying: false,
        }),

      log: (entry) =>
        set((s) => ({
          activity: [...s.activity, { id: uid(), at: now(), ...entry }].slice(-200),
        })),

      setReplaying: (on) => set({ replaying: on }),

      startAppeal: (denialId) => {
        const existing = get().appeals.find((a) => a.denialId === denialId);
        if (existing) return existing;
        const appeal: Appeal = {
          id: `A-${denialId}`,
          denialId,
          createdAt: now(),
          summary: "",
          sections: [],
          reviewType: "standard",
          status: "draft",
          timeline: [{ at: now(), event: "Appeal draft created" }],
        };
        set((s) => ({ appeals: [...s.appeals, appeal] }));
        return appeal;
      },

      setDraft: (appealId, summary, sections, author) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) => ({
            ...a,
            summary,
            sections: sections.map((sec) => ({
              criterionId: sec.criterionId,
              text: sec.text,
              author,
              updatedAt: now(),
            })),
          })),
        })),

      updateSection: (appealId, criterionId, text, author) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) => {
            const exists = a.sections.some((x) => x.criterionId === criterionId);
            const sections = exists
              ? a.sections.map((x) =>
                  x.criterionId === criterionId
                    ? { ...x, text, author, updatedAt: now() }
                    : x,
                )
              : [...a.sections, { criterionId, text, author, updatedAt: now() }];
            return { ...a, sections };
          }),
        })),

      attach: (recordId) =>
        set((s) => ({
          attachments: s.attachments.includes(recordId)
            ? s.attachments
            : [...s.attachments, recordId],
        })),

      detach: (recordId) =>
        set((s) => ({ attachments: s.attachments.filter((r) => r !== recordId) })),

      setReviewType: (appealId, reviewType, reason, by) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) => ({
            ...a,
            reviewType,
            reviewReason: reason ?? a.reviewReason,
            reviewChosenBy: by,
          })),
        })),

      markPendingConfirmation: (appealId) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) =>
            a.status === "draft" ? { ...a, status: "pending_confirmation" } : a,
          ),
        })),

      cancelPending: (appealId) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) =>
            a.status === "pending_confirmation" ? { ...a, status: "draft" } : a,
          ),
        })),

      confirmSubmission: (appealId, result) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) => ({
            ...a,
            status: "submitted",
            caseNumber: result.caseNumber,
            submittedAt: result.receivedAt,
            decisionDueAt: result.decisionDueAt,
            timeline: [...a.timeline, ...result.timeline],
          })),
        })),

      advanceClock: (appealId, outcome) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) => {
            if (a.status === "submitted") {
              return {
                ...a,
                status: "under_review",
                timeline: [
                  ...a.timeline,
                  { at: now(), event: "Under clinical review — Larkspur medical director" },
                ],
              };
            }
            if (a.status === "under_review") {
              const result = outcome ?? "overturned";
              const note =
                result === "overturned"
                  ? "Denial overturned. MRI of the left knee (CPT 73721) is authorized. Authorization PA-2026-004471-R issued."
                  : "Denial upheld. The reviewer did not find the conservative-therapy requirement satisfied. You may request an independent external review.";
              return {
                ...a,
                status: result,
                decision: { outcome: result, at: now(), note },
                decisionDueAt: a.decisionDueAt ?? decisionDue(now(), a.reviewType).toISOString(),
                timeline: [
                  ...a.timeline,
                  { at: now(), event: result === "overturned" ? "Decision: overturned" : "Decision: upheld" },
                ],
              };
            }
            return a;
          }),
        })),

      markExternalPending: (appealId) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) =>
            a.status === "upheld" ? { ...a, status: "external_review_pending" } : a,
          ),
        })),

      cancelExternalPending: (appealId) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) =>
            a.status === "external_review_pending" ? { ...a, status: "upheld" } : a,
          ),
        })),

      confirmExternalReview: (appealId, externalCase) =>
        set((s) => ({
          appeals: updateAppeal(s.appeals, appealId, (a) => ({
            ...a,
            status: "external_review_requested",
            externalReviewCase: externalCase,
            timeline: [
              ...a.timeline,
              { at: now(), event: `External review requested — IRO case ${externalCase}` },
            ],
          })),
        })),
    }),
    {
      name: "overturn-sandbox-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        seededAt: s.seededAt,
        attachments: s.attachments,
        appeals: s.appeals,
        activity: s.activity,
      }),
    },
  ),
);

// `hydrated` is not persisted; flip it once localStorage has been read.
if (typeof window !== "undefined") {
  useStore.persist.onFinishHydration(() => useStore.setState({ hydrated: true }));
  if (useStore.persist.hasHydrated()) useStore.setState({ hydrated: true });
}

// Convenience selectors
export const selectAppealFor = (denialId: string) => (s: OverturnState) =>
  s.appeals.find((a) => a.denialId === denialId);
export const selectAppeal = (appealId: string) => (s: OverturnState) =>
  s.appeals.find((a) => a.id === appealId);
