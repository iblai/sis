import { describe, expect, it } from "vitest";

import {
  courseRunParts,
  filterSections,
  joinSections,
  sortSections,
  upsertSection,
} from "../lib/sis/sections";
import { EMPTY_SIS_METADATA, type SisMetadata } from "../lib/sis/metadata";
import type { LmsCourse } from "../lib/sis/types";

const course = (id: string, name: string, start?: string): LmsCourse => ({
  id,
  course_id: id,
  name,
  org: "Org",
  number: id.split("+")[1] ?? "",
  run: id.split("+")[2] ?? "",
  start,
});

const meta: SisMetadata = {
  ...EMPTY_SIS_METADATA,
  terms: [
    { id: "t1", yearId: "y", name: "Fall", start: "2026-09-01", end: "2027-01-15" },
    { id: "t2", yearId: "y", name: "Spring", start: "2027-01-16", end: "2027-06-30" },
  ],
  subjects: [{ id: "s1", name: "Math" }],
  gradeLevels: [{ id: "g9", name: "Grade 9", order: 9 }],
  rooms: [{ id: "r1", name: "101" }],
  periods: [{ id: "p1", name: "1st", startTime: "08:00", endTime: "08:50" }],
  sections: [
    {
      courseId: "course-v1:Org+Alg+Fall",
      termId: "t1",
      subjectId: "s1",
      gradeLevelId: "g9",
      roomId: "r1",
      periodId: "p1",
    },
    { courseId: "course-v1:Org+Bio+Spring", termId: "t2" },
  ],
};

const courses = [
  course("course-v1:Org+Alg+Fall", "Algebra"),
  course("course-v1:Org+Bio+Spring", "Biology"),
  course("course-v1:Org+Art+Open", "Art", "2026-01-01"),
];

describe("courseRunParts", () => {
  it("splits a course key", () => {
    expect(courseRunParts("course-v1:Org+Alg+Fall")).toEqual({
      org: "Org",
      number: "Alg",
      run: "Fall",
    });
    expect(courseRunParts("Org/Alg/Fall")).toBeNull();
  });
});

describe("joinSections", () => {
  it("attaches the section row and its lookups", () => {
    const rows = joinSections(courses, meta);
    expect(rows[0].term?.name).toBe("Fall");
    expect(rows[0].subject?.name).toBe("Math");
    expect(rows[0].gradeLevel?.name).toBe("Grade 9");
    expect(rows[0].room?.name).toBe("101");
    expect(rows[0].period?.name).toBe("1st");
    expect(rows[1].term?.name).toBe("Spring");
    expect(rows[1].subject).toBeUndefined();
    expect(rows[2].section).toBeUndefined();
  });
  it("works without metadata", () => {
    expect(joinSections(courses, null).every((r) => !r.section)).toBe(true);
  });
});

describe("filterSections and sortSections", () => {
  const rows = joinSections(courses, meta);
  it("filters by term, subject, level and text", () => {
    expect(filterSections(rows, { termId: "t1" }).map((r) => r.course.name)).toEqual(["Algebra"]);
    expect(filterSections(rows, { subjectId: "s1" })).toHaveLength(1);
    expect(filterSections(rows, { gradeLevelId: "g9" })).toHaveLength(1);
    expect(filterSections(rows, { query: "bio" }).map((r) => r.course.name)).toEqual(["Biology"]);
    expect(filterSections(rows, { query: "ART" })).toHaveLength(1);
    expect(filterSections(rows, {})).toHaveLength(3);
  });
  it("sorts by term start descending, then name", () => {
    expect(sortSections(rows).map((r) => r.course.name)).toEqual(["Biology", "Algebra", "Art"]);
  });
});

describe("upsertSection", () => {
  it("replaces or adds by course id without mutating", () => {
    const next = upsertSection(meta.sections, { courseId: "course-v1:Org+Alg+Fall", termId: "t2" });
    expect(next[0].termId).toBe("t2");
    expect(meta.sections[0].termId).toBe("t1");
    expect(upsertSection(meta.sections, { courseId: "new" })).toHaveLength(3);
  });
});
