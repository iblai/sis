import { describe, expect, it } from "vitest";

import {
  attendanceDays,
  eachDay,
  monthRange,
  secondsByDay,
  summarize,
  weekRange,
  weekdayOf,
} from "../lib/sis/attendance";

describe("calendar helpers", () => {
  it("knows weekdays in UTC", () => {
    expect(weekdayOf("2026-10-05")).toBe("mon");
    expect(weekdayOf("2026-10-11")).toBe("sun");
  });
  it("lists the days of a window and tolerates garbage", () => {
    expect(eachDay("2026-02-27", "2026-03-02")).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
    expect(eachDay("nope", "2026-03-02")).toEqual([]);
  });
  it("builds month and week ranges", () => {
    expect(monthRange(2026, 2)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange(2028, 2)).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(weekRange("2026-10-08")).toEqual({ start: "2026-10-05", end: "2026-10-11" });
    expect(weekRange("2026-10-11")).toEqual({ start: "2026-10-05", end: "2026-10-11" });
  });
});

describe("secondsByDay", () => {
  it("reads both AXD shapes", () => {
    expect(
      secondsByDay({ "2026-10-05T00:00:00Z": 120, "2026-10-06": "30" } as unknown as Record<
        string,
        number
      >),
    ).toEqual({
      "2026-10-05": 120,
      "2026-10-06": 30,
    });
    expect(secondsByDay([{ date: "2026-10-05", count: 5 }])).toEqual({ "2026-10-05": 5 });
    expect(secondsByDay(null)).toEqual({});
    expect(secondsByDay(undefined)).toEqual({});
  });
});

describe("attendanceDays", () => {
  const range = { start: "2026-10-05", end: "2026-10-11" };
  it("marks present, absent on meeting days of the term, and no school elsewhere", () => {
    const days = attendanceDays(
      { "2026-10-05": 600, "2026-10-10": 60 },
      { days: ["mon", "wed", "fri"] },
      { start: "2026-09-01", end: "2026-12-20" },
      range,
    );
    expect(days.map((d) => d.status)).toEqual([
      "present",
      "no-school",
      "absent",
      "no-school",
      "absent",
      "present",
      "no-school",
    ]);
    expect(days[0].seconds).toBe(600);
  });
  it("treats every day in the window as a school day without a term or meeting days", () => {
    const days = attendanceDays({}, undefined, undefined, range);
    expect(days.every((d) => d.status === "absent")).toBe(true);
  });
  it("is no school outside the term", () => {
    const days = attendanceDays(
      {},
      { days: [] },
      { start: "2027-01-01", end: "2027-06-01" },
      range,
    );
    expect(days.every((d) => d.status === "no-school")).toBe(true);
  });
});

describe("summarize", () => {
  it("counts present and absent and rates them", () => {
    const days = attendanceDays(
      { "2026-10-05": 1 },
      undefined,
      { start: "2026-10-01", end: "2026-10-31" },
      { start: "2026-10-05", end: "2026-10-08" },
    );
    expect(summarize(days)).toEqual({ present: 1, absent: 3, rate: 0.25 });
    expect(summarize([])).toEqual({ present: 0, absent: 0, rate: null });
  });
});
