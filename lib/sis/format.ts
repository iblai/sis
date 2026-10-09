import { parseISO } from "date-fns";
import type { MemberRole } from "./types";

export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** `locale` is the active UI locale; `undefined` falls back to the browser's. */
export function formatDate(
  value?: string | null,
  locale?: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  const d = toDate(value);
  return d ? new Intl.DateTimeFormat(locale, options).format(d) : "—";
}

export function formatDateTime(value?: string | null, locale?: string) {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

/** A `YYYY-MM-DD` day, formatted in the locale without a timezone shift. */
export function formatDay(day?: string | null, locale?: string) {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 days ago", "in 2 hours", "now" — in the active locale. */
export function formatRelative(value?: string | null, locale?: string, now: Date = new Date()) {
  const d = toDate(value);
  if (!d) return "—";
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

/** A 0–1 ratio (the LMS's `percent`) as "87%"; an em dash for nothing. */
export function formatPercent(ratio?: number | null, locale?: string, digits = 0) {
  if (ratio === undefined || ratio === null || !Number.isFinite(ratio)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(ratio);
}

/** Seconds as "2h 05m" / "12m" / "45s". */
export function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  "#0058cc",
  "#00b0ef",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#059669",
  "#0891b2",
  "#4f46e5",
];

/** Stable brand-palette color for an entity, from its id or name. */
export function avatarColor(seed?: string | number | null) {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function truncate(s: string | undefined | null, max = 60) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** A user's display name from whatever the backend sent. */
export function displayName(u: {
  full_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const joined = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return u.full_name || u.name || joined || u.username || u.email || "";
}

/** What a member is to the school, from the platform link's flags: neither flag is a student. */
export function roleOf(u: { is_admin?: boolean; is_staff?: boolean }): MemberRole {
  return u.is_admin ? "admin" : u.is_staff ? "teacher" : "student";
}
