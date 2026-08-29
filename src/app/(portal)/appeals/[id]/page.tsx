"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { evaluateCompleteness } from "@/lib/completeness";
import { appealWindow, decisionClock, fmtDate, fmtDateTime } from "@/lib/dates";
import { policy } from "@/lib/seed";
import { submitAppealByMember } from "@/lib/submit";
import { useStore } from "@/lib/store";

export default function AppealPage() {
  const params = useParams<{ id: string }>();
  const appeal = useStore((s) => s.appeals.find((a) => a.id === params.id));
  const denial = useStore((s) => s.denials.find((d) => d.id === appeal?.denialId));
  if (!appeal || !denial) {
    return (
      <div className="text-sm text-muted">
        No appeal {params.id}. <Link href="/denials/4471" className="underline">Go to the denial</Link> to start one.
      </div>
    );
  }
  return appeal.caseNumber ? <CaseView appealId={appeal.id} /> : <Workspace appealId={appeal.id} />;
}

/* ------------------------------------------------------------------ */

function Workspace({ appealId }: { appealId: string }) {
  const appeal = useStore((s) => s.appeals.find((a) => a.id === appealId))!;
  const denial = useStore((s) => s.denials.find((d) => d.id === appeal.denialId))!;
  const records = useStore((s) => s.records);
  const attachments = useStore((s) => s.attachments);
  const attach = useStore((s) => s.attach);
  const detach = useStore((s) => s.detach);
  const updateSection = useStore((s) => s.updateSection);
  const setReviewType = useStore((s) => s.setReviewType);
  const cancelPending = useStore((s) => s.cancelPending);
  const log = useStore((s) => s.log);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeness = evaluateCompleteness(appeal, attachments, policy, records);
  const w = appealWindow(denial.decidedOn);
  const hasDraft = appeal.sections.length > 0;

  const onMemberEdit = (criterionId: string, text: string) => {
    const before = appeal.sections.find((s) => s.criterionId === criterionId)?.text ?? "";
    if (before === text) return;
    updateSection(appealId, criterionId, text, "member");
    log({ actor: "member", summary: `Edited the argument for ${criterionId}` });
    const c = evaluateCompleteness(useStore.getState().appeals.find((a) => a.id === appealId), useStore.getState().attachments, policy, records);
    log({ actor: "system", summary: `Completeness re-checked after your edit: ${c.score}` });
  };

  const onSign = async () => {
    setBusy(true);
    setError(null);
    try {
      log({ actor: "member", summary: "Clicked Sign & submit" });
      await submitAppealByMember(appealId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted">
          <Link href="/" className="hover:underline">Home</Link> / <Link href={`/denials/${denial.id}`} className="hover:underline">Authorization {denial.id}</Link> / Appeal
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Appeal {appeal.id} · {denial.service}</h1>
        <div className="mt-1 text-sm text-muted">
          Denied {fmtDate(denial.decidedOn)} · {denial.reasonCode} {denial.reasonText} · appeal window day {w.dayOf} of {w.windowDays}, closes {fmtDate(w.closes)}
        </div>
      </div>

      {appeal.status === "pending_confirmation" && (
        <div className="pulse-soft rounded-lg border-2 border-human bg-human-soft p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-human">Your agent is ready to submit</div>
          <p className="mt-1 text-sm">
            Appeal {appeal.id} for {denial.service}, <b>{appeal.reviewType}</b> review (decision within {decisionClock[appeal.reviewType]}),
            {" "}{attachments.length} record{attachments.length === 1 ? "" : "s"} attached, {completeness.score} criteria evidenced.
            Nothing has been sent. Review the draft below, then sign.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={onSign} disabled={busy || !completeness.complete} className="rounded-md bg-human px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Submitting…" : "Sign & submit to Larkspur"}
            </button>
            <button onClick={() => { cancelPending(appealId); log({ actor: "member", summary: "Not yet — kept editing" }); }} className="text-sm text-muted underline-offset-2 hover:underline">
              Not yet
            </button>
            {error && <span className="text-sm text-deny">{error}</span>}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        {/* Draft */}
        <section className="space-y-3">
          <div className="rounded-lg border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Appeal letter</div>
              {hasDraft && (
                <span className="rounded border border-brand bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                  drafted by your agent · you can edit anything
                </span>
              )}
            </div>
            {!hasDraft ? (
              <p className="mt-3 text-sm text-muted">
                No draft yet. Ask your agent to draft the appeal against Larkspur’s criteria — or write it yourself below. Each criterion gets its own argument.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed">{appeal.summary}</p>
            )}
          </div>

          {policy.criteria.map((c) => {
            const section = appeal.sections.find((s) => s.criterionId === c.id);
            const assessment = completeness.criteria.find((x) => x.id === c.id)!;
            return (
              <div key={c.id} className="rounded-lg border border-line bg-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-sm">
                    <span className="mr-2 font-mono text-xs text-muted">{c.id}</span>
                    <span className="font-medium">{c.text}</span>
                  </div>
                  <StatusPill status={assessment.status} />
                </div>
                <textarea
                  key={`${c.id}-${section?.author}-${section?.updatedAt}`}
                  defaultValue={section?.text ?? ""}
                  placeholder={`Argument for ${c.id} — cite records by title. Evidence needed: ${c.evidence}`}
                  onBlur={(e) => onMemberEdit(c.id, e.target.value)}
                  rows={section?.text ? Math.min(6, Math.max(2, Math.ceil(section.text.length / 110))) : 2}
                  className={`mt-2 w-full rounded-md border p-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-brand ${
                    section?.author === "agent" ? "border-brand/50 bg-brand-soft/30" : section?.author === "member" ? "border-human/60 bg-human-soft/30" : "border-line bg-panel"
                  }`}
                />
                {section && (
                  <div className="mt-1 text-[11px] text-muted">
                    {section.author === "agent" ? "Written by your agent" : "Edited by you"} · {fmtDateTime(section.updatedAt)}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Right rail */}
        <section className="space-y-3">
          <div className="rounded-lg border border-human bg-panel p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-human">Your records · attach what supports the appeal</div>
            <p className="mt-1 text-[11px] text-muted">Attaching is your action — your agent can only ask.</p>
            <ul className="mt-2 space-y-2">
              {records.map((r) => {
                const on = attachments.includes(r.id);
                return (
                  <li key={r.id} className="flex items-start gap-2 text-sm">
                    <button
                      onClick={() => {
                        if (on) { detach(r.id); log({ actor: "member", summary: `Removed: ${r.title}` }); }
                        else { attach(r.id); log({ actor: "member", summary: `Attached: ${r.title}` }); }
                      }}
                      className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${on ? "bg-ok-soft text-ok" : "bg-human text-white"}`}
                    >
                      {on ? "✓ Attached" : "Attach"}
                    </button>
                    <span>
                      <span className="font-medium">{r.title}</span>
                      <span className="block text-[11px] text-muted">{r.source} · {r.pages} p · supports {r.supports.join(", ")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-brand bg-panel p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">Completeness · {completeness.score}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {completeness.criteria.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{c.id}</span>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
            {completeness.nextSteps.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                {completeness.nextSteps.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-human bg-panel p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-human">Review type · your choice</div>
            {(["standard", "expedited"] as const).map((t) => (
              <label key={t} className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="review"
                  checked={appeal.reviewType === t}
                  onChange={() => { setReviewType(appealId, t, undefined, "member"); log({ actor: "member", summary: `Chose ${t} review` }); }}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium capitalize">{t}</span> — decision within {decisionClock[t]}
                  {t === "expedited" && <span className="block text-[11px] text-muted">When waiting could seriously harm your health.</span>}
                </span>
              </label>
            ))}
            {appeal.reviewReason && (
              <div className="mt-2 rounded border border-brand/40 bg-brand-soft/40 p-2 text-[12px]">
                <span className="font-semibold text-brand">Agent’s reason:</span> {appeal.reviewReason}
                {appeal.reviewChosenBy === "agent" && <span className="block text-[11px] text-muted">Proposed by your agent — the choice is yours.</span>}
              </div>
            )}
          </div>

          {appeal.status === "draft" && (
            <div>
              <button
                onClick={() => { useStore.getState().markPendingConfirmation(appealId); log({ actor: "member", summary: "Asked to review and sign" }); }}
                disabled={!completeness.complete}
                className="w-full rounded-md border border-human px-4 py-2 text-sm font-semibold text-human disabled:opacity-40"
              >
                Review &amp; sign
              </button>
              {!completeness.complete && (
                <p className="mt-1.5 text-[11px] text-muted">
                  Signing unlocks when all 5 criteria are complete ({completeness.score} now): each needs an argument of at least a
                  sentence or two <em>and</em> an attached record that supports it. Ask your agent to draft it, or write it yourself.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "complete" | "needs_evidence" | "needs_argument" | "too_short" | "missing" }) {
  const map = {
    complete: ["Complete", "bg-ok-soft text-ok"],
    needs_evidence: ["Needs a record", "bg-human-soft text-human"],
    needs_argument: ["Needs an argument", "bg-brand-soft text-brand"],
    too_short: ["Argument too short", "bg-brand-soft text-brand"],
    missing: ["Missing", "bg-deny-soft text-deny"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

/* ------------------------------------------------------------------ */

function CaseView({ appealId }: { appealId: string }) {
  const appeal = useStore((s) => s.appeals.find((a) => a.id === appealId))!;
  const denial = useStore((s) => s.denials.find((d) => d.id === appeal.denialId))!;
  const attachments = useStore((s) => s.attachments);
  const records = useStore((s) => s.records);
  const advanceClock = useStore((s) => s.advanceClock);
  const cancelExternalPending = useStore((s) => s.cancelExternalPending);
  const confirmExternalReview = useStore((s) => s.confirmExternalReview);
  const log = useStore((s) => s.log);

  const statusLabel: Record<string, string> = {
    submitted: "Received",
    under_review: "Under review",
    overturned: "Overturned — approved",
    upheld: "Upheld",
    external_review_pending: "Upheld · external review pending your confirmation",
    external_review_requested: "External review requested",
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted"><Link href="/" className="hover:underline">Home</Link> / Appeals / {appeal.caseNumber}</div>
        <h1 className="mt-1 text-2xl font-semibold">Case {appeal.caseNumber} · {denial.service}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${appeal.status === "overturned" ? "bg-ok-soft text-ok" : appeal.status === "upheld" || appeal.status.startsWith("external") ? "bg-deny-soft text-deny" : "bg-brand-soft text-brand"}`}>
            {statusLabel[appeal.status] ?? appeal.status}
          </span>
          <span className="text-muted">
            {appeal.reviewType} review · received {appeal.submittedAt && fmtDateTime(appeal.submittedAt)} · decision due {appeal.decisionDueAt && fmtDateTime(appeal.decisionDueAt)}
          </span>
        </div>
      </div>

      {appeal.decision && (
        <div className={`rounded-lg border p-4 ${appeal.decision.outcome === "overturned" ? "border-ok bg-ok-soft/50" : "border-deny bg-deny-soft/50"}`}>
          <div className="text-xs font-semibold uppercase tracking-wide">Decision · {fmtDateTime(appeal.decision.at)}</div>
          <p className="mt-1 text-sm">{appeal.decision.note}</p>
        </div>
      )}

      {appeal.status === "external_review_pending" && (
        <div className="pulse-soft rounded-lg border-2 border-human bg-human-soft p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-human">Your agent prepared an external-review request</div>
          <p className="mt-1 text-sm">An Independent Review Organization will re-decide the case. Nothing has been sent.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => { const c = `IRO-${Math.floor(100000 + Math.random() * 899999)}`; log({ actor: "member", summary: "Confirmed external review request" }); confirmExternalReview(appealId, c); log({ actor: "plan", summary: `External review opened — ${c}` }); }}
              className="rounded-md bg-human px-4 py-2 text-sm font-semibold text-white"
            >
              Request external review
            </button>
            <button onClick={() => cancelExternalPending(appealId)} className="text-sm text-muted underline-offset-2 hover:underline">Not now</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-panel p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Timeline</div>
          <ol className="mt-2 space-y-2 text-sm">
            {appeal.timeline.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-28 shrink-0 text-xs text-muted tabular-nums">{fmtDateTime(t.at)}</span>
                <span>{t.event}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-lg border border-line bg-panel p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">What was filed</div>
          <p className="mt-2 text-sm">{appeal.summary}</p>
          <ul className="mt-2 text-xs text-muted">
            {appeal.sections.map((s) => <li key={s.criterionId}>{s.criterionId} · {s.author === "member" ? "edited by Maya" : "drafted by agent"} · {s.text.length} chars</li>)}
          </ul>
          <div className="mt-2 text-xs text-muted">
            Attachments: {attachments.map((id) => records.find((r) => r.id === id)?.title.split(",")[0]).join("; ")}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
        <span className="font-semibold">Demo control — Larkspur’s side of the clock.</span>{" "}
        {appeal.status === "submitted" && <button className="underline" onClick={() => { advanceClock(appealId); log({ actor: "plan", summary: "Case moved to clinical review" }); }}>Advance: clinical review begins</button>}
        {appeal.status === "under_review" && (
          <>
            <button className="underline" onClick={() => { advanceClock(appealId, "overturned"); log({ actor: "plan", summary: "Decision issued: overturned" }); }}>Decide: overturned</button>
            {" · "}
            <button className="underline" onClick={() => { advanceClock(appealId, "upheld"); log({ actor: "plan", summary: "Decision issued: upheld" }); }}>Decide: upheld</button>
          </>
        )}
        {(appeal.status === "overturned" || appeal.status === "external_review_requested") && <span>Case closed on the plan’s side.</span>}
        {appeal.status === "upheld" && <span>Ask your agent to request an external review, or do it yourself: <button className="underline" onClick={() => useStore.getState().markExternalPending(appealId)}>prepare request</button>.</span>}
      </section>
    </div>
  );
}
