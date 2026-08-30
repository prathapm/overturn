import { create } from "zustand";
import type { Report } from "./types";

export const LEGACY_URL = "https://overturn-one.vercel.app/legacy";

type RetrofitState = {
  url: string;
  status: "idle" | "running" | "done" | "error";
  error: string | null;
  report: Report | null;
  setUrl: (u: string) => void;
  run: (url?: string, live?: boolean) => Promise<Report>;
};

export const useRetrofit = create<RetrofitState>()((set, get) => ({
  url: LEGACY_URL,
  status: "idle",
  error: null,
  report: null,
  setUrl: (url) => set({ url }),
  run: async (url, live = false) => {
    const target = (url ?? get().url).trim();
    set({ status: "running", error: null, url: target });
    const res = await fetch("/api/retrofit/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: target, live }),
    });
    const body = (await res.json().catch(() => ({}))) as Report & { error?: string };
    if (!res.ok || body.error) {
      const msg = body.error ?? `analysis_failed_${res.status}`;
      set({ status: "error", error: msg });
      throw new Error(msg);
    }
    set({ status: "done", report: body });
    return body;
  },
}));

/** Maps the tools Retrofit recommends for the legacy portal to the ones actually built in this repo. */
export const BUILT_FROM_PLAN: Record<string, string> = {
  get_account_context: "get_member_context",
  list_claims_authorizations: "list_denials",
  get_prior_authorization: "get_denial",
  get_determination_letter: "get_denial (structured)",
  get_decision_criteria: "get_coverage_criteria",
  draft_appeal: "draft_appeal · update_appeal_section",
  check_appeal_completeness: "check_completeness",
  submit_appeal: "submit_appeal (gated)",
  get_appeal_status: "get_appeal_status · get_deadlines",
  draft_lhp_member: "draft_appeal (typed sections)",
};
