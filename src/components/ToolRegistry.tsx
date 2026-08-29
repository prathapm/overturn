"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toolsForRoute } from "@/lib/tools";
import { useStore } from "@/lib/store";
import { hasWebMCP, registeredToolNames, useWebMCPTools } from "@/lib/webmcp";

/**
 * Registers the WebMCP tools that apply to the current page and the appeal's current state.
 * Re-runs when the route changes or when an appeal changes status (draft → filed), so the
 * tool surface the agent sees follows the member through the flow.
 */
export function ToolRegistry() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const statusKey = useStore((s) => s.appeals.map((a) => `${a.id}:${a.status}`).join(","));

  const tools = useMemo(
    () => toolsForRoute(pathname, { navigate: (p) => router.push(p) }),
    // statusKey is a deliberate dependency: the tool set is a function of appeal state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, statusKey, router],
  );

  useWebMCPTools(tools, hydrated);
  return null;
}

export function WebMCPBadge() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const statusKey = useStore((s) => s.appeals.map((a) => `${a.id}:${a.status}`).join(","));
  useEffect(() => {
    const t = setTimeout(() => {
      setSupported(hasWebMCP());
      setCount(registeredToolNames().length);
    }, 150);
    return () => clearTimeout(t);
  }, [pathname, statusKey]);
  if (supported === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        supported ? "border-brand text-brand bg-brand-soft" : "border-line text-muted bg-panel-2"
      }`}
      title={supported ? "This browser exposes document.modelContext" : "This browser has no WebMCP support; tools are still defined but no agent can see them"}
    >
      <span aria-hidden>⚡</span>
      {supported ? `Site tools · ${count}` : "WebMCP not detected"}
    </span>
  );
}
