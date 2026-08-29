"use client";

import { useEffect } from "react";
import { useStore } from "./store";

/**
 * Minimal WebMCP registration layer.
 *
 * - Uses `document.modelContext` (current spec) with `navigator.modelContext` as the legacy fallback.
 * - One AbortController per tool; aborting the signal unregisters the tool (the spec removed unregisterTool()).
 * - A module-level registry prevents duplicate-name rejections under React StrictMode / HMR.
 * - Every execute call is logged to the on-page activity panel and output is capped at ~1.5K chars.
 */

export type ToolDef = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  readOnly?: boolean;
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
};

type ModelContextLike = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
      execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => Promise<void> | void;
};

export const OUTPUT_CHAR_BUDGET = 1500;

export function getModelContext(): ModelContextLike | null {
  if (typeof document === "undefined") return null;
  const d = document as unknown as { modelContext?: ModelContextLike };
  const n = navigator as unknown as { modelContext?: ModelContextLike };
  const mc = d.modelContext ?? n.modelContext ?? null;
  return mc && typeof mc.registerTool === "function" ? mc : null;
}

export function hasWebMCP(): boolean {
  return getModelContext() !== null;
}

const registry = new Map<string, AbortController>();

function summarizeInput(input: Record<string, unknown>): string {
  const keys = Object.keys(input ?? {});
  if (!keys.length) return "";
  return keys
    .map((k) => {
      const v = input[k];
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}=${s.length > 40 ? s.slice(0, 40) + "…" : s}`;
    })
    .join(", ");
}

function capOutput(value: unknown): unknown {
  const s = JSON.stringify(value);
  if (s.length <= OUTPUT_CHAR_BUDGET) return value;
  return { truncated: true, preview: s.slice(0, OUTPUT_CHAR_BUDGET - 60) + "…" };
}

/** Execute a tool the way the browser would, logging it. Used by the registry wrapper and by Replay. */
export async function runTool(tool: ToolDef, input: Record<string, unknown>, actor: "agent" | "member" = "agent") {
  const log = useStore.getState().log;
  let output: unknown;
  try {
    output = capOutput(await tool.execute(input ?? {}));
  } catch (err) {
    output = { error: err instanceof Error ? err.message : String(err) };
  }
  const outStr = JSON.stringify(output);
  log({
    actor,
    tool: tool.name,
    summary: `${tool.name}(${summarizeInput(input)})`,
    detail: outStr.length > 240 ? outStr.slice(0, 240) + "…" : outStr,
  });
  return output;
}

async function register(tool: ToolDef) {
  const mc = getModelContext();
  if (!mc) return;
  const prev = registry.get(tool.name);
  if (prev) prev.abort();
  const controller = new AbortController();
  registry.set(tool.name, controller);
  try {
    await mc.registerTool(
      {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
        annotations: { readOnlyHint: !!tool.readOnly },
        execute: async (input) => runTool(tool, input ?? {}, "agent"),
      },
      { signal: controller.signal },
    );
  } catch (err) {
    // Duplicate names or schema problems surface here; keep the page working regardless.
    console.warn(`[webmcp] registerTool(${tool.name}) failed:`, err);
  }
}

function unregister(name: string) {
  const c = registry.get(name);
  if (c) {
    c.abort();
    registry.delete(name);
  }
}

/** Register a set of tools; anything previously registered but not in the set is unregistered. */
export function useWebMCPTools(tools: ToolDef[], enabled: boolean) {
  const key = tools.map((t) => t.name).join("|");
  useEffect(() => {
    if (!enabled) return;
    const wanted = new Set(tools.map((t) => t.name));
    for (const name of Array.from(registry.keys())) {
      if (!wanted.has(name)) unregister(name);
    }
    for (const t of tools) void register(t);
    // Intentionally no cleanup on dependency change: the next run diffs the set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
}

export function registeredToolNames(): string[] {
  return Array.from(registry.keys()).sort();
}
