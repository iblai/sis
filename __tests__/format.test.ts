import { describe, expect, it } from "vitest";

import {
  avatarColor,
  displayName,
  formatDate,
  formatDateTime,
  formatDay,
  formatDuration,
  formatPercent,
  formatRelative,
  initials,
  toDate,
  truncate,
  roleOf,
} from "../lib/sis/format";

describe("dates", () => {
  it("formats in the given locale and dashes nothing", () => {
    expect(formatDate("2026-09-03T12:00:00.000Z", "en-US")).toBe("Sep 3, 2026");
    expect(formatDate("2026-09-03T12:00:00.000Z", "fr-FR")).toBe("3 sept. 2026");
    expect(formatDateTime("2026-09-03T12:30:00.000Z", "en-US")).toContain("Sep 3, 2026");
    expect(formatDate(null, "en-US")).toBe("—");
    expect(formatDate("not a date", "en-US")).toBe("—");
    expect(toDate("")).toBeNull();
  });
  it("formats a plain day without a timezone shift", () => {
    expect(formatDay("2026-09-03", "en-US")).toBe("Sep 3, 2026");
    expect(formatDay("2026-9-3", "en-US")).toBe("—");
    expect(formatDay(undefined, "en-US")).toBe("—");
  });
  it("picks the largest fitting relative unit", () => {
    const now = new Date("2026-09-03T12:00:00.000Z");
    expect(formatRelative("2026-09-01T12:00:00.000Z", "en-US", now)).toBe("2 days ago");
    expect(formatRelative("2026-09-03T14:00:00.000Z", "en-US", now)).toBe("in 2 hours");
    expect(formatRelative("2026-09-03T12:00:10.000Z", "en-US", now)).toBe("now");
    expect(formatRelative(undefined, "en-US", now)).toBe("—");
  });
});

describe("numbers", () => {
  it("formats ratios as percentages", () => {
    expect(formatPercent(0.873, "en-US")).toBe("87%");
    expect(formatPercent(0.873, "en-US", 1)).toBe("87.3%");
    expect(formatPercent(null, "en-US")).toBe("—");
    expect(formatPercent(Number.NaN, "en-US")).toBe("—");
  });
  it("formats durations", () => {
    expect(formatDuration(3725)).toBe("1h 02m");
    expect(formatDuration(720)).toBe("12m");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(-1)).toBe("—");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("names", () => {
  it("builds initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Ada")).toBe("AD");
    expect(initials("   ")).toBe("?");
    expect(initials(null)).toBe("?");
  });
  it("picks a display name from whatever is there", () => {
    expect(displayName({ full_name: "Ada L", username: "ada" })).toBe("Ada L");
    expect(displayName({ name: "Ada", username: "ada" })).toBe("Ada");
    expect(displayName({ first_name: "Ada", last_name: "Lovelace" })).toBe("Ada Lovelace");
    expect(displayName({ username: "ada" })).toBe("ada");
    expect(displayName({ email: "ada@example.org" })).toBe("ada@example.org");
    expect(displayName({})).toBe("");
  });
  it("is stable and bounded for avatar colors", () => {
    expect(avatarColor("acme")).toBe(avatarColor("acme"));
    expect(avatarColor(undefined)).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("truncates", () => {
    expect(truncate("short")).toBe("short");
    expect(truncate("abcdefgh", 4)).toBe("abc…");
    expect(truncate(null)).toBe("");
  });
});

describe("roleOf", () => {
  it("reads the school role off the link flags", () => {
    expect(roleOf({ is_admin: true, is_staff: true })).toBe("admin");
    expect(roleOf({ is_staff: true })).toBe("teacher");
    expect(roleOf({})).toBe("student");
  });
});
