"use client";

import Link from "next/link";
import { appealWindow, fmtDate } from "@/lib/dates";
import { useStore } from "@/lib/store";

export default function Home() {
  const member = useStore((s) => s.member);
  const denials = useStore((s) => s.denials);
  const appeals = useStore((s) => s.appeals);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Good to see you, {member.firstName}.</h1>
        <p className="text-sm text-muted">
          {member.plan} · Member ID {member.id} · Plan year {member.planYear}
        </p>
      </div>

      <section className="rounded-lg border border-line bg-panel">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold">Needs your attention</div>
        <ul>
          {denials.map((d) => {
            const w = appealWindow(d.decidedOn);
            const appeal = appeals.find((a) => a.denialId === d.id);
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-deny-soft px-2 py-0.5 text-xs font-semibold text-deny">Denied</span>
                    <span className="font-medium">{d.service}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    Prior authorization {d.id} · decided {fmtDate(d.decidedOn)} · reason {d.reasonCode}: {d.reasonText}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    Appeal window: day {w.dayOf} of {w.windowDays} — closes {fmtDate(w.closes)}
                  </div>
                </div>
                {appeal ? (
                  <Link href={`/appeals/${appeal.id}`} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white">
                    {appeal.caseNumber ? `Appeal ${appeal.caseNumber}` : "Continue appeal"}
                  </Link>
                ) : (
                  <Link href={`/denials/${d.id}`} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white">
                    Review denial
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Coverage", "Larkspur Select PPO · deductible met 62%"],
          ["Claims", "3 processed this month · no balance due"],
          ["Care team", "Dr. Adaeze Okafor · Cedar Grove Family Medicine"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-line bg-panel px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{t}</div>
            <div className="mt-1 text-sm">{d}</div>
          </div>
        ))}
      </section>

      <p className="text-sm text-muted">
        Using an agent? This portal exposes site tools. Ask it: <em>“Help me appeal this denial.”</em>
      </p>
    </div>
  );
}
