"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivityPanel } from "./ActivityPanel";
import { ToolRegistry, WebMCPBadge } from "./ToolRegistry";
import { ReplayButton } from "./Replay";
import { useStore } from "@/lib/store";
import { payer } from "@/lib/seed";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hydrated = useStore((s) => s.hydrated);
  const member = useStore((s) => s.member);

  return (
    <div className="min-h-screen">
      <ToolRegistry />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold text-white">L</span>
            <span className="text-sm font-semibold leading-tight">
              {payer.name}
              <span className="block text-[11px] font-normal text-muted">Member portal · agent-native</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-4 text-sm md:flex">
            <Link href="/" className={pathname === "/" ? "font-semibold" : "text-muted hover:text-foreground"}>
              Home
            </Link>
            <Link href="/denials/4471" className={pathname.startsWith("/denials") ? "font-semibold" : "text-muted hover:text-foreground"}>
              Authorizations
            </Link>
            <Link href="/readiness" className={pathname.startsWith("/readiness") ? "font-semibold" : "text-muted hover:text-foreground"}>
              Readiness report
            </Link>
            <Link href="/legacy" className="text-muted hover:text-foreground">
              Legacy portal ↗
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ReplayButton />
            <WebMCPBadge />
            <span className="hidden text-sm text-muted sm:inline">{member.name}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">{hydrated ? children : <div className="text-sm text-muted">Loading your account…</div>}</main>
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <ActivityPanel />
        </div>
      </div>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-[11px] text-muted">
        Larkspur Health Plan, Ridgeway Orthopedic Associates, Maya Chen and every record here are fictional. Overturn is a
        WebMCP Challenge entry — <a className="underline" href="https://github.com/prathapm/overturn">source</a>.
      </footer>
    </div>
  );
}
