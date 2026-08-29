"use client";

import { useRouter } from "next/navigation";
import { replaySession } from "@/lib/replay";
import { useStore } from "@/lib/store";

export function ReplayButton() {
  const router = useRouter();
  const replaying = useStore((s) => s.replaying);
  return (
    <button
      disabled={replaying}
      onClick={() => {
        // ?pace=<ms> slows the replay for screen recordings.
        const pace = Number(new URLSearchParams(window.location.search).get("pace")) || undefined;
        void replaySession((p) => router.push(p), pace);
      }}
      className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
      title="Replays the tool calls Maya's agent made and the clicks Maya made — for browsers without an agent attached"
    >
      {replaying ? "Replaying…" : "▶ Replay Maya's session"}
    </button>
  );
}
