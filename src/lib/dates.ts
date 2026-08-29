import {
  APPEAL_WINDOW_DAYS,
  EXPEDITED_DECISION_HOURS,
  STANDARD_DECISION_DAYS,
} from "./seed";

const DAY = 24 * 60 * 60 * 1000;

/** Parse ISO strings; date-only strings ("2026-08-17") are treated as local calendar dates, not UTC midnight. */
export function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

export function addDays(iso: string, days: number): Date {
  return new Date(parseDate(iso).getTime() + days * DAY);
}

export function addHours(iso: string, hours: number): Date {
  return new Date(parseDate(iso).getTime() + hours * 60 * 60 * 1000);
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function appealWindow(decidedOn: string, now = new Date()) {
  const closes = addDays(decidedOn, APPEAL_WINDOW_DAYS);
  const dayOf = Math.max(1, Math.floor((now.getTime() - parseDate(decidedOn).getTime()) / DAY));
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
