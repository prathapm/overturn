import {
  APPEAL_WINDOW_DAYS,
  EXPEDITED_DECISION_HOURS,
  STANDARD_DECISION_DAYS,
} from "./seed";

const DAY = 24 * 60 * 60 * 1000;

export function addDays(iso: string, days: number): Date {
  return new Date(new Date(iso).getTime() + days * DAY);
}

export function addHours(iso: string, hours: number): Date {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000);
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function appealWindow(decidedOn: string, now = new Date()) {
  const closes = addDays(decidedOn, APPEAL_WINDOW_DAYS);
  const dayOf = Math.max(1, Math.floor((now.getTime() - new Date(decidedOn).getTime()) / DAY));
  const daysLeft = Math.max(0, Math.ceil((closes.getTime() - now.getTime()) / DAY));
  return { closes, dayOf, daysLeft, windowDays: APPEAL_WINDOW_DAYS };
}

export function decisionDue(submittedAt: string, reviewType: "standard" | "expedited") {
  return reviewType === "expedited"
    ? addHours(submittedAt, EXPEDITED_DECISION_HOURS)
    : addDays(submittedAt, STANDARD_DECISION_DAYS);
}

export const decisionClock = {
  standard: `${STANDARD_DECISION_DAYS} calendar days`,
  expedited: `${EXPEDITED_DECISION_HOURS} hours`,
};
