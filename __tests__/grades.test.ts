import { describe, expect, it } from "vitest";

import { average, gpa, letterGrade, termGpa } from "../lib/sis/grades";

const cutoffs = { A: 0.9, B: 0.8, C: 0.7, D: 0.6 };

describe("letterGrade", () => {
  it("picks the highest cutoff the ratio reaches", () => {
    expect(letterGrade(0.95, cutoffs)).toBe("A");
    expect(letterGrade(0.9, cutoffs)).toBe("A");
    expect(letterGrade(0.85, cutoffs)).toBe("B");
    expect(letterGrade(0.61, cutoffs)).toBe("D");
  });
  it("is null below every cutoff, with no cutoffs, or for a bad number", () => {
    expect(letterGrade(0.2, cutoffs)).toBeNull();
    expect(letterGrade(0.9, {})).toBeNull();
    expect(letterGrade(Number.NaN, cutoffs)).toBeNull();
    expect(letterGrade(0.9, { A: Number.NaN })).toBeNull();
  });
});

describe("gpa", () => {
  const scale = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  it("weights letters by credits and rounds to two places", () => {
    const r = gpa(
      [
        { letter: "A", credits: 1 },
        { letter: "b", credits: 0.5 },
        { letter: "C", credits: 2 },
      ],
      scale,
    );
    expect(r.credits).toBe(3.5);
    expect(r.gpa).toBe(Math.round(((4 + 1.5 + 4) / 3.5) * 100) / 100);
    expect(r.excluded).toBe(0);
  });
  it("excludes sections without a letter, credits or a known letter", () => {
    const r = gpa(
      [
        { letter: null, credits: 1 },
        { letter: "A" },
        { letter: "A", credits: 0 },
        { letter: "Z", credits: 1 },
        { letter: "B", credits: 1 },
      ],
      scale,
    );
    expect(r.excluded).toBe(4);
    expect(r.gpa).toBe(3);
  });
  it("is null when nothing counted", () => {
    expect(gpa([], scale)).toEqual({ gpa: null, credits: 0, excluded: 0 });
  });
});

describe("termGpa", () => {
  it("takes only the term's sections", () => {
    const sections = [
      { courseId: "c1", termId: "t1", credits: 1 },
      { courseId: "c2", termId: "t2", credits: 1 },
      { courseId: "c3", termId: "t1", credits: 1 },
    ];
    const r = termGpa({ id: "t1" }, sections, { c1: "A", c2: "F", c3: "B" }, { A: 4, B: 3, F: 0 });
    expect(r.gpa).toBe(3.5);
    expect(r.credits).toBe(2);
  });
});

describe("average", () => {
  it("averages the finite numbers and ignores the rest", () => {
    expect(average([0.5, null, undefined, Number.NaN, 1])).toBe(0.75);
    expect(average([])).toBeNull();
  });
});
