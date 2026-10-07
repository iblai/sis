import type { Section, Term, Weekday } from "./metadata";
import { WEEKDAYS } from "./metadata";

export type DayStatus = "present" | "absent" | "no-school";

export interface AttendanceDay {
  /** `YYYY-MM-DD`, UTC buckets as the AXD reports them. */
  date: string;
  status: DayStatus;
  seconds: number;
}

/** ISO day → weekday code, in UTC. */
export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
}

/** Every ISO day from `start` to `end` inclusive. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(last.getTime())) return out;
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** The first and last ISO day of a month (`month` 1–12). */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Monday–Sunday around an ISO day. */
export function weekRange(date: string): { start: string; end: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 6);
  return { start, end: d.toISOString().slice(0, 10) };
}

/** The AXD's over-time `data` as a day → seconds map, whichever shape it used. */
export function secondsByDay(
  data: Record<string, number> | { date: string; count: number }[] | null | undefined,
): Record<string, number> {
  if (!data) return {};
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((d) => [String(d.date).slice(0, 10), Number(d.count) || 0]));
  }
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k.slice(0, 10), Number(v) || 0]));
}

/**
 * Activity-derived attendance: present = time spent in the course that day;
 * absent = a school day of the term, on the section's meeting days, with
 * none; every other day is no school. Without a term or meeting days every
 * day in the window is a school day. What this cannot know — excused
 * absences, in-person time — the UI says.
 */
export function attendanceDays(
  overTime: Record<string, number>,
  section: Pick<Section, "days"> | undefined,
  term: Pick<Term, "start" | "end"> | undefined,
  range: { start: string; end: string },
): AttendanceDay[] {
  const days = section?.days?.length ? new Set(section.days) : null;
  return eachDay(range.start, range.end).map((date) => {
    const seconds = overTime[date] ?? 0;
    const inTerm = !term || (date >= term.start && date <= term.end);
    const meets = !days || days.has(weekdayOf(date));
    if (seconds > 0) return { date, status: "present", seconds };
    return { date, status: inTerm && meets ? "absent" : "no-school", seconds: 0 };
  });
}

export function summarize(days: readonly AttendanceDay[]): {
  present: number;
  absent: number;
  rate: number | null;
} {
  const present = days.filter((d) => d.status === "present").length;
  const absent = days.filter((d) => d.status === "absent").length;
  const total = present + absent;
  return { present, absent, rate: total ? present / total : null };
}
