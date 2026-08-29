"use client";

import { useEffect, useRef } from "react";
import { fmtDateTime } from "@/lib/dates";
import { useStore } from "@/lib/store";

const actorStyle: Record<string, string> = {
  agent: "bg-brand-soft text-brand border-brand",
  member: "bg-human-soft text-human border-human",
  plan: "bg-ok-soft text-ok border-ok",
  system: "bg-panel-2 text-muted border-line",
};

const actorLabel: Record<string, string> = {
  agent: "your agent",
  member: "you",
  plan: "Larkspur",
  system: "portal",
};

export function ActivityPanel() {
  const activity = useStore((s) => s.activity);
  const reset = useStore((s) => s.reset);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [activity.length]);

  return (
    <aside className="flex h-full flex-col rounded-lg border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Activity</div>
          <div className="text-xs text-muted">Everything your agent does here is shown here.</div>
        </div>
        <button
          onClick={() => {
            if (window.confirm("Reset the sandbox to a fresh copy of Maya's account?")) reset();
          }}
          className="text-xs text-muted underline-offset-2 hover:underline"
        >
          Reset
        </button>
      </div>
      <ol className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
        {activity.length === 0 && (
          <li className="text-xs text-muted">
            No activity yet. Open this page in a browser with WebMCP support and ask your agent to help — or press
            Replay.
          </li>
        )}
        {activity.map((e) => (
          <li key={e.id} className="rounded-md border border-line/70 p-2">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${actorStyle[e.actor]}`}>
                {actorLabel[e.actor]}
              </span>
              <span className="text-[11px] text-muted tabular-nums">{fmtDateTime(e.at)}</span>
            </div>
            <div className="mt-1 break-words font-mono text-[12px] leading-snug">{e.summary}</div>
            {e.detail && <div className="mt-1 break-words text-[11px] text-muted">{e.detail}</div>}
          </li>
        ))}
        <div ref={endRef} />
      </ol>
    </aside>
  );
}
