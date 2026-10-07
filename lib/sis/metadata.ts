/**
 * The school's own data — years, terms, grade levels, periods, rooms,
 * subjects, section assignments, the GPA scale — lives in the platform's
 * public metadata under `sis` (`/api/core/orgs/{key}/metadata/`). The DM
 * merges dicts recursively and REPLACES arrays, so every list here is written
 * whole and never as a map (a map could never drop a key).
 */

export const SIS_METADATA_VERSION = 1;

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface SchoolYear {
  id: string;
  name: string;
  /** ISO dates, `YYYY-MM-DD`. */
  start: string;
  end: string;
}

export interface Term {
  id: string;
  yearId: string;
  name: string;
  start: string;
  end: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  order: number;
  /** The DM user group that is this level's cohort. */
  groupId?: number;
}

export interface Period {
  id: string;
  name: string;
  /** `HH:MM`. */
  startTime: string;
  endTime: string;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
}

export interface Subject {
  id: string;
  name: string;
}

/** One per course run; the teachers live on the LMS as course roles. */
export interface Section {
  courseId: string;
  termId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  roomId?: string;
  periodId?: string;
  days?: Weekday[];
  credits?: number;
  seats?: number;
}

export interface SisMetadata {
  version: typeof SIS_METADATA_VERSION;
  school: { address?: string; phone?: string; timezone?: string };
  years: SchoolYear[];
  terms: Term[];
  gradeLevels: GradeLevel[];
  periods: Period[];
  rooms: Room[];
  subjects: Subject[];
  sections: Section[];
  gpaScale: Record<string, number>;
}

export type SisList =
  | "years"
  | "terms"
  | "gradeLevels"
  | "periods"
  | "rooms"
  | "subjects"
  | "sections";

export const DEFAULT_GPA_SCALE: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export const EMPTY_SIS_METADATA: SisMetadata = {
  version: SIS_METADATA_VERSION,
  school: {},
  years: [],
  terms: [],
  gradeLevels: [],
  periods: [],
  rooms: [],
  subjects: [],
  sections: [],
  gpaScale: DEFAULT_GPA_SCALE,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optStr = (v: unknown) => (str(v) ? v : undefined);
const optNum = (v: unknown) => (num(v) ? v : undefined);

function list<T>(v: unknown, parse: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    if (!isRecord(item)) continue;
    const parsed = parse(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * The `sis` block of the platform metadata, validated field by field: a
 * missing block is `null` (the school has not been set up), a wrong-typed
 * field is dropped to its default, an unknown `version` throws.
 */
export function parseSisMetadata(raw: unknown): SisMetadata | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== undefined && raw.version !== SIS_METADATA_VERSION) {
    throw new Error(`Unsupported sis metadata version: ${String(raw.version)}`);
  }
  const school = isRecord(raw.school) ? raw.school : {};
  const gpaScale = isRecord(raw.gpaScale)
    ? (Object.fromEntries(Object.entries(raw.gpaScale).filter(([, v]) => num(v))) as Record<
        string,
        number
      >)
    : {};
  return {
    version: SIS_METADATA_VERSION,
    school: {
      address: optStr(school.address),
      phone: optStr(school.phone),
      timezone: optStr(school.timezone),
    },
    years: list(raw.years, (y) =>
      str(y.id) && str(y.name) && str(y.start) && str(y.end)
        ? { id: y.id, name: y.name, start: y.start, end: y.end }
        : null,
    ),
    terms: list(raw.terms, (t) =>
      str(t.id) && str(t.yearId) && str(t.name) && str(t.start) && str(t.end)
        ? { id: t.id, yearId: t.yearId, name: t.name, start: t.start, end: t.end }
        : null,
    ),
    gradeLevels: list(raw.gradeLevels, (g) =>
      str(g.id) && str(g.name)
        ? { id: g.id, name: g.name, order: num(g.order) ? g.order : 0, groupId: optNum(g.groupId) }
        : null,
    ),
    periods: list(raw.periods, (p) =>
      str(p.id) && str(p.name)
        ? {
            id: p.id,
            name: p.name,
            startTime: optStr(p.startTime) ?? "",
            endTime: optStr(p.endTime) ?? "",
          }
        : null,
    ),
    rooms: list(raw.rooms, (r) =>
      str(r.id) && str(r.name) ? { id: r.id, name: r.name, capacity: optNum(r.capacity) } : null,
    ),
    subjects: list(raw.subjects, (s) =>
      str(s.id) && str(s.name) ? { id: s.id, name: s.name } : null,
    ),
    sections: list(raw.sections, (s) =>
      str(s.courseId)
        ? {
            courseId: s.courseId,
            termId: optStr(s.termId),
            subjectId: optStr(s.subjectId),
            gradeLevelId: optStr(s.gradeLevelId),
            roomId: optStr(s.roomId),
            periodId: optStr(s.periodId),
            days: Array.isArray(s.days)
              ? (s.days.filter((d): d is Weekday => WEEKDAYS.includes(d as Weekday)) as Weekday[])
              : undefined,
            credits: optNum(s.credits),
            seats: optNum(s.seats),
          }
        : null,
    ),
    gpaScale: Object.keys(gpaScale).length ? gpaScale : DEFAULT_GPA_SCALE,
  };
}

/** A short random id for a metadata row. */
export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

/** The term whose dates contain `today` (ISO date), else the latest one that started. */
export function currentTerm(terms: readonly Term[], today: string): Term | undefined {
  const inside = terms.find((t) => t.start <= today && today <= t.end);
  if (inside) return inside;
  return [...terms].filter((t) => t.start <= today).sort((a, b) => (a.start < b.start ? 1 : -1))[0];
}

/** `true` when two arrays hold the same rows (the compare-on-save conflict check). */
export function sameRows(a: unknown[], b: unknown[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
