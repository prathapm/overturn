import { NextResponse } from "next/server";
import { AnalyzeError, analyzeSite } from "@/lib/retrofit/analyze";
import legacyFixture from "@/lib/retrofit/fixtures/legacy.json";
import type { Report } from "@/lib/retrofit/types";

export const runtime = "nodejs";
export const maxDuration = 10;

const FIXTURE_URLS = new Set(["https://overturn-one.vercel.app/legacy", "https://overturn-one.vercel.app/legacy/"]);

function fixtureFor(url: string): Report | null {
  const fx = legacyFixture as unknown as Report;
  if (!fx || !fx.url) return null;
  return FIXTURE_URLS.has(url.trim()) ? { ...fx, mode: "fixture" } : null;
}

async function handle(url: string | null, live: boolean, allowLocal: boolean) {
  if (!url) return NextResponse.json({ error: "url_required" }, { status: 400 });
  if (!live) {
    const fx = fixtureFor(url);
    if (fx) return NextResponse.json(fx);
  }
  try {
    const report = await analyzeSite(url, { allowLocal });
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof AnalyzeError) return NextResponse.json({ error: err.message }, { status: err.status });
    // Timeouts on the platform: fall back to the fixture when we have one, otherwise report honestly.
    const fx = fixtureFor(url);
    if (fx) return NextResponse.json({ ...fx, mode: "fixture" });
    return NextResponse.json({ error: err instanceof Error ? err.message : "analysis_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  return handle(u.searchParams.get("url"), u.searchParams.get("live") === "1", process.env.NODE_ENV !== "production" || process.env.RETROFIT_ALLOW_LOCAL === "1");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; live?: boolean };
  return handle(body.url ?? null, !!body.live, process.env.NODE_ENV !== "production" || process.env.RETROFIT_ALLOW_LOCAL === "1");
}
