"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { appealWindow, decisionClock, fmtDate } from "@/lib/dates";
import { policy } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function DenialPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const denial = useStore((s) => s.denials.find((d) => d.id === params.id));
  const records = useStore((s) => s.records);
  const attachments = useStore((s) => s.attachments);
  const appeal = useStore((s) => s.appeals.find((a) => a.denialId === params.id));
  const startAppeal = useStore((s) => s.startAppeal);
  const log = useStore((s) => s.log);

  if (!denial) return <div className="text-sm text-muted">No denial with id {params.id}.</div>;
  const w = appealWindow(denial.decidedOn);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted">
          <Link href="/" className="hover:underline">Home</Link> / Authorizations / {denial.id}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          Prior authorization {denial.id} · {denial.service}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-deny-soft px-2 py-0.5 text-xs font-semibold text-deny">Denied {fmtDate(denial.decidedOn)}</span>
          <span className="text-muted">CPT {denial.cpt} · requested {fmtDate(denial.requestedOn)} · {denial.orderingProvider.name}, {denial.orderingProvider.practice}</span>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-brand bg-brand-soft/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">Structured denial</div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Reason code</dt><dd className="font-medium">{denial.reasonCode} — {denial.reasonText}</dd>
            <dt className="text-muted">Policy cited</dt><dd>{denial.policyId}</dd>
            <dt className="text-muted">Decided by</dt><dd>{denial.decider}</dd>
            <dt className="text-muted">Appeal window</dt><dd>day {w.dayOf} of {w.windowDays} · closes {fmtDate(w.closes)}</dd>
            <dt className="text-muted">Decision clock</dt><dd>{decisionClock.standard} standard · {decisionClock.expedited} expedited</dd>
          </dl>
        </div>
        <div className="rounded-lg border border-brand bg-brand-soft/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">The plan’s own criteria · {policy.id}</div>
          <ol className="mt-2 space-y-1.5 text-sm">
            {policy.criteria.map((c) => {
              const supporting = records.filter((r) => r.supports.includes(c.id));
              return (
                <li key={c.id} className="flex gap-2">
                  <span className="font-mono text-xs text-muted">{c.id}</span>
                  <span>
                    {c.text}
                    <span className="block text-xs text-muted">
                      On file: {supporting.map((r) => r.title.split(",")[0]).join("; ") || "nothing yet"}
                      {supporting.some((r) => attachments.includes(r.id)) ? " (attached)" : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Denial letter</div>
        <div className="mt-2 max-w-prose space-y-2 text-sm leading-relaxed">
          {denial.letter.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {appeal ? (
          <Link href={`/appeals/${appeal.id}`} className="rounded-md bg-human px-4 py-2 text-sm font-semibold text-white">
            Open your appeal
          </Link>
        ) : (
          <button
            onClick={() => {
              const a = startAppeal(denial.id);
              log({ actor: "member", summary: "Started an appeal" });
              router.push(`/appeals/${a.id}`);
            }}
            className="rounded-md bg-human px-4 py-2 text-sm font-semibold text-white"
          >
            Start an appeal
          </button>
        )}
        <span className="text-sm text-muted">or ask your agent: “Help me appeal this denial.”</span>
      </div>
    </div>
  );
}
