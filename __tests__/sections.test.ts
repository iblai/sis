import { describe, expect, it } from "vitest";

import {
  courseRunParts,
  filterSections,
  fromEnrollment,
  fromStudioCourse,
  joinSections,
  sectionLabel,
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

describe("fromEnrollment", () => {
  const enrollment = (course_id: string, course_name: string) => ({
    created: "2026-09-01T00:00:00Z",
    mode: "audit",
    is_active: true,
    user: "jane",
    course_details: { course_id, course_name, course_start: "2026-09-01T00:00:00Z" },
  });
  it("maps a user's enrollment onto the course run it is in", () => {
    expect(fromEnrollment(enrollment("course-v1:Org+Alg+Fall", "Algebra"))).toEqual({
      id: "course-v1:Org+Alg+Fall",
      course_id: "course-v1:Org+Alg+Fall",
      name: "Algebra",
      org: "Org",
      number: "Alg",
      run: "Fall",
      start: "2026-09-01T00:00:00Z",
      end: undefined,
      hidden: false,
    });
  });
  it("falls back to the id as the name and leaves the parts empty for an old-style key", () => {
    const run = fromEnrollment(enrollment("Org/Alg/Fall", ""));
    expect(run.name).toBe("Org/Alg/Fall");
    expect(run.org).toBe("");
    expect(run.run).toBeUndefined();
  });
});

describe("fromStudioCourse", () => {
  it("maps a Studio course-home row onto the app's course run", () => {
    expect(
      fromStudioCourse({
        course_key: "course-v1:Org+Alg+Fall",
        display_name: "Algebra",
        org: "Org",
        number: "Alg",
        run: "Fall",
      }),
    ).toEqual({
      id: "course-v1:Org+Alg+Fall",
      course_id: "course-v1:Org+Alg+Fall",
      name: "Algebra",
      org: "Org",
      number: "Alg",
      run: "Fall",
      hidden: false,
    });
  });

  it("fills org, number and run from the key and hides archived or inactive runs", () => {
    const row = fromStudioCourse(
      { course_key: "course-v1:Org+Bio+Spring", display_name: "" },
      true,
    );
    expect(row).toMatchObject({
      name: "course-v1:Org+Bio+Spring",
      org: "Org",
      number: "Bio",
      run: "Spring",
      hidden: true,
    });
    expect(
      fromStudioCourse({ course_key: "x", display_name: "X", is_active: false }),
    ).toMatchObject({
      org: "",
      number: "",
      hidden: true,
    });
  });
});

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

describe("sectionLabel", () => {
  it("names the term, else the run, else the course alone", () => {
    const rows = joinSections(courses, meta);
    expect(sectionLabel(rows[0])).toBe(`${rows[0].course.name} · Fall`);
    expect(sectionLabel({ course: course("course-v1:Org+Alg+Spring", "Algebra") })).toBe(
      "Algebra · Spring",
    );
    expect(sectionLabel({ course: course("solo", "Art") })).toBe("Art");
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
