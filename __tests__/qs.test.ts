import { describe, expect, it } from "vitest";

import { qs } from "../lib/sis/qs";
import { isoDay, lastDays } from "../lib/sis/dates";
import { missingSeeds, seedFieldDefinitions } from "../lib/sis/seed";

describe("qs", () => {
  it("drops empties, repeats arrays and encodes", () => {
    expect(qs({ a: 1, b: "", c: null, d: undefined, role: ["Student", "Admin"], q: "a b" })).toBe(
      "?a=1&role=Student&role=Admin&q=a+b",
    );
    expect(qs({ role: [] })).toBe("");
    expect(qs({ role: ["", null] })).toBe("");
    expect(qs(undefined)).toBe("");
    expect(qs({ on: false })).toBe("?on=false");
  });
});

describe("dates", () => {
  it("formats ISO days and windows", () => {
    const now = new Date("2026-10-08T15:00:00Z");
    expect(isoDay(now)).toBe("2026-10-08");
    expect(lastDays(7, now)).toEqual({ start_date: "2026-10-02", end_date: "2026-10-08" });
    expect(isoDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("seed", () => {
  it("defines the twelve starting fields with the school's grade levels", () => {
    const seeds = seedFieldDefinitions(["Grade 9", "Grade 10"]);
    expect(seeds).toHaveLength(12);
    expect(seeds.find((f) => f.slug === "grade_level")?.choices).toEqual(["Grade 9", "Grade 10"]);
    expect(seeds.filter((f) => f.required).map((f) => f.slug)).toEqual([
      "student_id",
      "grade_level",
      "enrollment_status",
    ]);
  });
  it("only seeds what is missing", () => {
    expect(missingSeeds([{ slug: "student_id" }, { slug: "homeroom" }], [])).toHaveLength(10);
    expect(
      missingSeeds(
        seedFieldDefinitions([]).map((f) => ({ slug: f.slug! })),
        [],
      ),
    ).toEqual([]);
  });
});
