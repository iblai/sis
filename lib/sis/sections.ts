import type { LmsCourse } from "./types";
import type { GradeLevel, Period, Room, Section, SisMetadata, Subject, Term } from "./metadata";

/** An LMS course run joined with the school's section data and its teachers. */
export interface SectionRow {
  course: LmsCourse;
  section?: Section;
  term?: Term;
  subject?: Subject;
  gradeLevel?: GradeLevel;
  room?: Room;
  period?: Period;
}

export interface SectionFilters {
  termId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  query?: string;
}

/** `course-v1:ORG+NUMBER+RUN` → its parts, or null for anything else. */
export function courseRunParts(
  courseId: string,
): { org: string; number: string; run: string } | null {
  const m = courseId.match(/^course-v1:([^+]+)\+([^+]+)\+([^+]+)$/);
  return m ? { org: m[1], number: m[2], run: m[3] } : null;
}

export function joinSections(
  courses: readonly LmsCourse[],
  meta: SisMetadata | null,
): SectionRow[] {
  const byId = <T extends { id: string }>(rows: readonly T[]) =>
    new Map(rows.map((r) => [r.id, r]));
  const sections = new Map((meta?.sections ?? []).map((s) => [s.courseId, s]));
  const terms = byId(meta?.terms ?? []);
  const subjects = byId(meta?.subjects ?? []);
  const levels = byId(meta?.gradeLevels ?? []);
  const rooms = byId(meta?.rooms ?? []);
  const periods = byId(meta?.periods ?? []);
  return courses.map((course) => {
    const section = sections.get(course.id);
    return {
      course,
      section,
      term: section?.termId ? terms.get(section.termId) : undefined,
      subject: section?.subjectId ? subjects.get(section.subjectId) : undefined,
      gradeLevel: section?.gradeLevelId ? levels.get(section.gradeLevelId) : undefined,
      room: section?.roomId ? rooms.get(section.roomId) : undefined,
      period: section?.periodId ? periods.get(section.periodId) : undefined,
    };
  });
}

/** Client-side filters over the bounded run list — the one stated exception to server-side lists. */
export function filterSections(rows: readonly SectionRow[], f: SectionFilters): SectionRow[] {
  const q = f.query?.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!f.termId || r.section?.termId === f.termId) &&
      (!f.subjectId || r.section?.subjectId === f.subjectId) &&
      (!f.gradeLevelId || r.section?.gradeLevelId === f.gradeLevelId) &&
      (!q ||
        r.course.name.toLowerCase().includes(q) ||
        r.course.id.toLowerCase().includes(q) ||
        (r.course.number ?? "").toLowerCase().includes(q)),
  );
}

/** Sort: term start descending, then course name. */
export function sortSections(rows: readonly SectionRow[]): SectionRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.term?.start ?? a.course.start ?? "";
    const tb = b.term?.start ?? b.course.start ?? "";
    if (ta !== tb) return ta < tb ? 1 : -1;
    return a.course.name.localeCompare(b.course.name);
  });
}

/** Replace or add one section row; the list is written whole afterwards. */
export function upsertSection(sections: readonly Section[], next: Section): Section[] {
  const i = sections.findIndex((s) => s.courseId === next.courseId);
  if (i < 0) return [...sections, next];
  const out = [...sections];
  out[i] = next;
  return out;
}
