import { NextResponse } from "next/server";
import { decisionDue } from "@/lib/dates";

/**
 * Stateless submission endpoint.
 *
 * The WebMCP tool `submit_appeal` never calls this route. Only the member's click on the
 * on-page "Sign & submit" card does, and it carries the human-confirmation marker.
 * In production this would be bound to the authenticated member session and the plan's
 * FHIR Prior Authorization API (CMS-0057-F).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const confirmed = body.confirmed_by_member === true && req.headers.get("x-overturn-confirm") === "member-click";
  if (!confirmed) {
    return NextResponse.json(
      { error: "human_confirmation_required", message: "Appeals are filed only by the member's click on the page." },
      { status: 403 },
    );
  }

  const appealId = String(body.appeal_id ?? "");
  const denialId = String(body.denial_id ?? "");
  const reviewType = body.review_type === "expedited" ? "expedited" : "standard";
  const sections = Array.isArray(body.sections) ? body.sections : [];
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (!appealId || !denialId || sections.length === 0 || attachments.length === 0) {
    return NextResponse.json({ error: "incomplete_appeal" }, { status: 422 });
  }

  const receivedAt = new Date().toISOString();
  const caseNumber = `LHP-A-${String(20000 + Math.floor(Math.random() * 79999))}`;
  const due = decisionDue(receivedAt, reviewType).toISOString();

  return NextResponse.json({
    caseNumber,
    receivedAt,
    decisionDueAt: due,
    timeline: [
      { at: receivedAt, event: `Appeal received by Larkspur Member Appeals — case ${caseNumber} (${reviewType} review)` },
    ],
  });
}
