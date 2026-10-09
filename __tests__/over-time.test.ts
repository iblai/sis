import { describe, expect, it } from "vitest";

import { byDay } from "../lib/sis/over-time";

describe("byDay", () => {
  it("reads both AXD shapes", () => {
    expect(
      byDay({ "2026-10-05T00:00:00Z": 120, "2026-10-06": "30" } as unknown as Record<
        string,
        number
      >),
    ).toEqual({ "2026-10-05": 120, "2026-10-06": 30 });
    expect(byDay([{ date: "2026-10-05", count: 5 }])).toEqual({ "2026-10-05": 5 });
    expect(byDay([{ date: "2026-10-05", count: Number.NaN }])).toEqual({ "2026-10-05": 0 });
    expect(byDay(null)).toEqual({});
    expect(byDay(undefined)).toEqual({});
  });
});
