import type { Section, Term } from "./metadata";

/**
 * The letter for a 0–1 ratio under edX cutoffs (`{A: 0.9, B: 0.8, …}`): the
 * highest cutoff the ratio reaches, else the lowest letter when the policy has
 * one, else null. Only for class rollups — a student's own letter comes from
 * the LMS (`course_grade.letter_grade`).
 */
export function letterGrade(percent: number, cutoffs: Record<string, number>): string | null {
  const entries = Object.entries(cutoffs).filter(([, v]) => Number.isFinite(v));
  if (!entries.length || !Number.isFinite(percent)) return null;
  const reached = entries.filter(([, cut]) => percent >= cut).sort((a, b) => b[1] - a[1]);
  if (reached.length) return reached[0][0];
  return null;
}

export interface GpaEntry {
  letter: string | null | undefined;
  credits?: number;
}

export interface GpaResult {
  /** Null when nothing counted. */
  gpa: number | null;
  credits: number;
  /** Sections skipped: no letter, no credits, or a letter outside the scale. */
  excluded: number;
}

/** Σ(points × credits) / Σ credits over the sections with a letter on the scale and credits. */
export function gpa(entries: readonly GpaEntry[], scale: Record<string, number>): GpaResult {
  let points = 0;
  let credits = 0;
  let excluded = 0;
  for (const e of entries) {
    const letter = e.letter?.toUpperCase();
    const value = letter ? scale[letter] : undefined;
    if (value === undefined || !e.credits || e.credits <= 0) {
      excluded++;
      continue;
    }
    points += value * e.credits;
    credits += e.credits;
  }
  return { gpa: credits ? Math.round((points / credits) * 100) / 100 : null, credits, excluded };
}

/** The GPA of one term from the student's letters per course. */
export function termGpa(
  term: Pick<Term, "id">,
  sections: readonly Section[],
  letters: Readonly<Record<string, string | null | undefined>>,
  scale: Record<string, number>,
): GpaResult {
  return gpa(
    sections
      .filter((s) => s.termId === term.id)
      .map((s) => ({ letter: letters[s.courseId], credits: s.credits })),
    scale,
  );
}

/** Mean of the finite ratios, null when none. */
export function average(values: readonly (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
