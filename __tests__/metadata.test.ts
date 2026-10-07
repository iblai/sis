import { describe, expect, it } from "vitest";

import {
  DEFAULT_GPA_SCALE,
  EMPTY_SIS_METADATA,
  currentTerm,
  newId,
  parseSisMetadata,
  sameRows,
} from "../lib/sis/metadata";

const v1 = {
  version: 1,
  school: { address: "1 Main St", phone: "555", timezone: "America/New_York" },
  years: [{ id: "y1", name: "2026–27", start: "2026-09-01", end: "2027-06-30" }],
  terms: [
    { id: "t1", yearId: "y1", name: "Fall", start: "2026-09-01", end: "2027-01-15" },
    { id: "t2", yearId: "y1", name: "Spring", start: "2027-01-16", end: "2027-06-30" },
  ],
  gradeLevels: [{ id: "g9", name: "Grade 9", order: 9, groupId: 12 }],
  periods: [{ id: "p1", name: "1st", startTime: "08:00", endTime: "08:50" }],
  rooms: [{ id: "r1", name: "101", capacity: 30 }],
  subjects: [{ id: "s1", name: "Math" }],
  sections: [
    {
      courseId: "course-v1:Org+Alg+Fall",
      termId: "t1",
      subjectId: "s1",
      gradeLevelId: "g9",
      roomId: "r1",
      periodId: "p1",
      days: ["mon", "wed", "nope"],
      credits: 1,
      seats: 25,
    },
  ],
  gpaScale: { A: 4, B: 3, C: "two" },
};

describe("parseSisMetadata", () => {
  it("is null for a missing block and for a non-object", () => {
    expect(parseSisMetadata(undefined)).toBeNull();
    expect(parseSisMetadata(null)).toBeNull();
    expect(parseSisMetadata("sis")).toBeNull();
    expect(parseSisMetadata([1, 2])).toBeNull();
  });

  it("keeps a v1 blob, dropping what is not typed as it should be", () => {
    const meta = parseSisMetadata(v1)!;
    expect(meta.version).toBe(1);
    expect(meta.school).toEqual(v1.school);
    expect(meta.years).toEqual(v1.years);
    expect(meta.terms).toHaveLength(2);
    expect(meta.gradeLevels[0]).toEqual({ id: "g9", name: "Grade 9", order: 9, groupId: 12 });
    expect(meta.periods[0]).toEqual(v1.periods[0]);
    expect(meta.rooms[0]).toEqual(v1.rooms[0]);
    expect(meta.subjects[0]).toEqual(v1.subjects[0]);
    expect(meta.sections[0].days).toEqual(["mon", "wed"]);
    expect(meta.sections[0].credits).toBe(1);
    expect(meta.gpaScale).toEqual({ A: 4, B: 3 });
  });

  it("drops garbage rows to defaults", () => {
    const meta = parseSisMetadata({
      school: "nope",
      years: [{ id: 1 }, "x", { id: "y", name: "Y", start: "2026-01-01", end: "2026-12-31" }],
      terms: "none",
      gradeLevels: [{ id: "g", name: "G", order: "ten" }],
      periods: [{ id: "p", name: "P" }],
      rooms: [{ id: "r", name: "R", capacity: "big" }],
      subjects: [{ id: "s" }],
      sections: [{ courseId: 5 }, { courseId: "c", days: "mon" }],
      gpaScale: "A",
    })!;
    expect(meta.school).toEqual({ address: undefined, phone: undefined, timezone: undefined });
    expect(meta.years).toHaveLength(1);
    expect(meta.terms).toEqual([]);
    expect(meta.gradeLevels[0].order).toBe(0);
    expect(meta.periods[0]).toEqual({ id: "p", name: "P", startTime: "", endTime: "" });
    expect(meta.rooms[0].capacity).toBeUndefined();
    expect(meta.subjects).toEqual([]);
    expect(meta.sections).toEqual([{ courseId: "c", days: undefined }]);
    expect(meta.gpaScale).toEqual(DEFAULT_GPA_SCALE);
  });

  it("throws on an unknown version", () => {
    expect(() => parseSisMetadata({ version: 2 })).toThrow(/version/);
  });

  it("accepts an empty object as a fresh school", () => {
    expect(parseSisMetadata({})).toEqual(EMPTY_SIS_METADATA);
  });
});

describe("currentTerm", () => {
  const terms = parseSisMetadata(v1)!.terms;
  it("finds the term that contains the day", () => {
    expect(currentTerm(terms, "2026-10-08")?.id).toBe("t1");
    expect(currentTerm(terms, "2027-03-01")?.id).toBe("t2");
  });
  it("falls back to the latest term that started", () => {
    expect(currentTerm(terms, "2027-09-01")?.id).toBe("t2");
    expect(currentTerm(terms, "2020-01-01")).toBeUndefined();
  });
});

describe("helpers", () => {
  it("compares rows structurally", () => {
    expect(sameRows([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(sameRows([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });
  it("makes short ids", () => {
    expect(newId()).toMatch(/^[0-9a-z-]{8}$/);
  });
});
