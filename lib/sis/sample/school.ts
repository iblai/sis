/**
 * Northbridge Academy — the sample school the community platform shows
 * (/iblai-vibe-house-journeys, `lib/sis/sample/respond.ts`). Everything here
 * is fictional and deterministic: people, course runs, the school's `sis`
 * metadata, and the grade each student holds in each course, from which the
 * rosters, gradebooks, progress and analytics are derived at request time.
 */
import type { Weekday } from "../metadata";

export const SAMPLE_SCHOOL = "Northbridge Academy";
/** The course runs' org code (`course-v1:Northbridge+ALG1+2026_Fall`). */
export const SAMPLE_ORG = "Northbridge";
const DOMAIN = "northbridge.example";

export type SampleRole = "admin" | "teacher" | "student";

export interface SamplePerson {
  id: number;
  username: string;
  first: string;
  last: string;
  role: SampleRole;
  /** Students only. */
  grade?: 9 | 10 | 11 | 12;
  /** The day they joined the platform. */
  since: string;
}

export const fullName = (p: SamplePerson) => `${p.first} ${p.last}`;
export const emailOf = (p: SamplePerson) => `${p.username}@${DOMAIN}`;

/** djb2 — a stable number from a string, for grades and picks that never change between loads. */
export function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const person = (
  id: number,
  username: string,
  first: string,
  last: string,
  role: SampleRole,
  since: string,
  grade?: SamplePerson["grade"],
): SamplePerson => ({ id, username, first, last, role, since, grade });

export const STAFF: readonly SamplePerson[] = [
  person(101, "grace.whitfield", "Grace", "Whitfield", "admin", "2024-07-01"),
  person(102, "marcus.reyes", "Marcus", "Reyes", "teacher", "2024-08-12"),
  person(103, "helen.park", "Helen", "Park", "teacher", "2024-08-12"),
  person(104, "omar.farouk", "Omar", "Farouk", "teacher", "2025-01-06"),
  person(105, "ines.moreau", "Inès", "Moreau", "teacher", "2025-08-18"),
  person(106, "tom.bradley", "Tom", "Bradley", "teacher", "2025-08-18"),
];

export const STUDENTS: readonly SamplePerson[] = [
  person(201, "ava.chen", "Ava", "Chen", "student", "2026-08-10", 9),
  person(202, "liam.okafor", "Liam", "Okafor", "student", "2026-08-10", 9),
  person(203, "sofia.ramirez", "Sofía", "Ramírez", "student", "2026-08-11", 9),
  person(204, "noah.patel", "Noah", "Patel", "student", "2026-08-11", 9),
  person(205, "mia.johansson", "Mia", "Johansson", "student", "2026-08-12", 9),
  person(206, "ethan.brooks", "Ethan", "Brooks", "student", "2026-08-12", 9),
  person(207, "isabella.rossi", "Isabella", "Rossi", "student", "2025-08-18", 10),
  person(208, "lucas.nguyen", "Lucas", "Nguyen", "student", "2025-08-18", 10),
  person(209, "amelia.hart", "Amelia", "Hart", "student", "2025-08-19", 10),
  person(210, "mateo.silva", "Mateo", "Silva", "student", "2025-08-19", 10),
  person(211, "harper.kim", "Harper", "Kim", "student", "2025-08-20", 10),
  person(212, "elijah.morris", "Elijah", "Morris", "student", "2025-08-20", 10),
  person(213, "zoe.adeyemi", "Zoe", "Adeyemi", "student", "2024-08-19", 11),
  person(214, "benjamin.cole", "Benjamin", "Cole", "student", "2024-08-19", 11),
  person(215, "layla.haddad", "Layla", "Haddad", "student", "2024-08-20", 11),
  person(216, "oliver.schmidt", "Oliver", "Schmidt", "student", "2024-08-20", 11),
  person(217, "chloe.dubois", "Chloé", "Dubois", "student", "2024-08-21", 11),
  person(218, "aiden.walsh", "Aiden", "Walsh", "student", "2024-08-21", 11),
  person(219, "nora.ivanova", "Nora", "Ivanova", "student", "2023-08-21", 12),
  person(220, "jack.murphy", "Jack", "Murphy", "student", "2023-08-21", 12),
  person(221, "priya.sharma", "Priya", "Sharma", "student", "2023-08-22", 12),
  person(222, "henry.oconnor", "Henry", "O’Connor", "student", "2023-08-22", 12),
  person(223, "lily.tanaka", "Lily", "Tanaka", "student", "2023-08-23", 12),
  person(224, "daniel.mensah", "Daniel", "Mensah", "student", "2023-08-23", 12),
];

export const PEOPLE: readonly SamplePerson[] = [...STAFF, ...STUDENTS];
export const PRINCIPAL = STAFF[0];

export const byUsername = (username: string) => PEOPLE.find((p) => p.username === username);
export const byId = (id: number) => PEOPLE.find((p) => p.id === id);
/** A username outside the school (the signed-in visitor) is shown as this student. */
export const personaFor = (username: string): SamplePerson =>
  STUDENTS.find((s) => s.username === username) ?? STUDENTS[0];

// ------------------------------------------------------------- the school

export const YEARS = [
  { id: "y2025", name: "2025–26", start: "2025-08-25", end: "2026-06-12" },
  { id: "y2026", name: "2026–27", start: "2026-08-24", end: "2027-06-11" },
];

export const TERMS = [
  { id: "fall2025", yearId: "y2025", name: "Fall 2025", start: "2025-08-25", end: "2025-12-19" },
  {
    id: "spring2026",
    yearId: "y2025",
    name: "Spring 2026",
    start: "2026-01-12",
    end: "2026-05-29",
  },
  { id: "fall2026", yearId: "y2026", name: "Fall 2026", start: "2026-08-24", end: "2026-12-18" },
  {
    id: "spring2027",
    yearId: "y2026",
    name: "Spring 2027",
    start: "2027-01-11",
    end: "2027-05-28",
  },
];

export const GRADE_LEVELS = [
  { id: "g9", name: "Grade 9", order: 9, groupId: 1 },
  { id: "g10", name: "Grade 10", order: 10, groupId: 2 },
  { id: "g11", name: "Grade 11", order: 11 },
  { id: "g12", name: "Grade 12", order: 12 },
];

export const PERIODS = [
  { id: "p1", name: "Period 1", startTime: "08:00", endTime: "08:50" },
  { id: "p2", name: "Period 2", startTime: "09:00", endTime: "09:50" },
  { id: "p3", name: "Period 3", startTime: "10:00", endTime: "10:50" },
  { id: "p4", name: "Period 4", startTime: "11:00", endTime: "11:50" },
  { id: "p5", name: "Period 5", startTime: "12:30", endTime: "13:20" },
  { id: "p6", name: "Period 6", startTime: "13:30", endTime: "14:20" },
  { id: "p7", name: "Period 7", startTime: "14:30", endTime: "15:20" },
];

export const ROOMS = [
  { id: "a101", name: "A-101", capacity: 30 },
  { id: "a102", name: "A-102", capacity: 30 },
  { id: "s201", name: "S-201 Lab", capacity: 24 },
  { id: "s202", name: "S-202 Lab", capacity: 24 },
  { id: "b110", name: "B-110", capacity: 32 },
  { id: "b112", name: "B-112", capacity: 32 },
  { id: "c104", name: "C-104", capacity: 26 },
  { id: "d010", name: "D-010 Studio", capacity: 20 },
];

export const SUBJECTS = [
  { id: "math", name: "Mathematics" },
  { id: "science", name: "Science" },
  { id: "english", name: "English" },
  { id: "history", name: "History" },
  { id: "languages", name: "World Languages" },
  { id: "arts", name: "Arts" },
];

export interface SampleCourse {
  key: string;
  name: string;
  number: string;
  run: string;
  termId: string;
  subjectId: string;
  /** The grade levels it serves; its gradeLevelId is the first. */
  grades: number[];
  roomId: string;
  periodId: string;
  days: Weekday[];
  credits: number;
  seats: number;
  teacher: string;
  archived?: boolean;
}

const course = (
  number: string,
  name: string,
  run: string,
  termId: string,
  subjectId: string,
  grades: number[],
  roomId: string,
  periodId: string,
  days: Weekday[],
  teacher: string,
  archived = false,
): SampleCourse => ({
  key: `course-v1:${SAMPLE_ORG}+${number}+${run}`,
  name,
  number,
  run,
  termId,
  subjectId,
  grades,
  roomId,
  periodId,
  days,
  credits: 1,
  seats: ROOMS.find((r) => r.id === roomId)?.capacity ?? 30,
  teacher,
  archived,
});

export const COURSES: readonly SampleCourse[] = [
  course(
    "ALG1",
    "Algebra I",
    "2026_Fall",
    "fall2026",
    "math",
    [9],
    "a101",
    "p1",
    ["mon", "wed", "fri"],
    "marcus.reyes",
  ),
  course(
    "GEOM",
    "Geometry",
    "2026_Fall",
    "fall2026",
    "math",
    [10],
    "a102",
    "p2",
    ["tue", "thu"],
    "marcus.reyes",
  ),
  course(
    "BIO",
    "Biology",
    "2026_Fall",
    "fall2026",
    "science",
    [9, 10],
    "s201",
    "p3",
    ["mon", "wed", "fri"],
    "helen.park",
  ),
  course(
    "CHEM",
    "Chemistry",
    "2026_Fall",
    "fall2026",
    "science",
    [11, 12],
    "s202",
    "p4",
    ["tue", "thu"],
    "helen.park",
  ),
  course(
    "ENG9",
    "English 9",
    "2026_Fall",
    "fall2026",
    "english",
    [9],
    "b110",
    "p2",
    ["mon", "tue", "thu"],
    "omar.farouk",
  ),
  course(
    "WHIST",
    "World History",
    "2026_Fall",
    "fall2026",
    "history",
    [10, 11],
    "b112",
    "p5",
    ["mon", "wed"],
    "omar.farouk",
  ),
  course(
    "SPA1",
    "Spanish I",
    "2026_Fall",
    "fall2026",
    "languages",
    [9, 10, 11, 12],
    "c104",
    "p6",
    ["tue", "thu", "fri"],
    "ines.moreau",
  ),
  course(
    "ART",
    "Studio Art",
    "2026_Fall",
    "fall2026",
    "arts",
    [9, 10, 11, 12],
    "d010",
    "p7",
    ["wed", "fri"],
    "tom.bradley",
  ),
  course(
    "ESCI",
    "Earth Science",
    "2026_Spring",
    "spring2026",
    "science",
    [9],
    "s201",
    "p3",
    ["mon", "wed", "fri"],
    "helen.park",
    true,
  ),
  course(
    "ALG1",
    "Algebra I",
    "2026_Spring",
    "spring2026",
    "math",
    [9],
    "a101",
    "p1",
    ["mon", "wed", "fri"],
    "marcus.reyes",
    true,
  ),
];

export const courseByKey = (key: string) => COURSES.find((c) => c.key === key);
export const termOf = (c: SampleCourse) => TERMS.find((t) => t.id === c.termId)!;

/** Whether the student takes the course: their grade is served and two of every three eligible do. */
export const enrolled = (s: SamplePerson, c: SampleCourse): boolean =>
  s.role === "student" &&
  !!s.grade &&
  c.grades.includes(s.grade) &&
  hash(s.username + c.key) % 3 !== 0;

export const rosterOf = (c: SampleCourse): SamplePerson[] => STUDENTS.filter((s) => enrolled(s, c));
export const coursesOf = (s: SamplePerson): SampleCourse[] =>
  s.role === "student"
    ? COURSES.filter((c) => enrolled(s, c))
    : COURSES.filter((c) => c.teacher === s.username);

/** The student's grade in the course, 0.58–0.97, the same on every load. */
export const gradeOf = (s: SamplePerson, c: SampleCourse): number =>
  Math.round((0.58 + (hash(`${s.username}|${c.key}`) % 40) / 100) * 100) / 100;

export const GRADE_CUTOFFS: Record<string, number> = { A: 0.9, B: 0.8, C: 0.7, D: 0.6 };

export const GRADERS = [
  { type: "Homework", short_label: "HW", min_count: 2, drop_count: 1, weight: 0.3 },
  { type: "Quiz", short_label: "Quiz", min_count: 2, drop_count: 0, weight: 0.3 },
  { type: "Exam", short_label: "Exam", min_count: 1, drop_count: 0, weight: 0.4 },
];

/** The graded work of every course: three units, a homework and a quiz each, then the midterm. */
export const SUBSECTIONS = [
  {
    id: "hw1",
    section: "Unit 1: Foundations",
    name: "Homework 1",
    type: "Homework",
    label: "HW 01",
    possible: 20,
  },
  {
    id: "quiz1",
    section: "Unit 1: Foundations",
    name: "Quiz 1",
    type: "Quiz",
    label: "Quiz 01",
    possible: 10,
  },
  {
    id: "hw2",
    section: "Unit 2: Methods",
    name: "Homework 2",
    type: "Homework",
    label: "HW 02",
    possible: 20,
  },
  {
    id: "quiz2",
    section: "Unit 2: Methods",
    name: "Quiz 2",
    type: "Quiz",
    label: "Quiz 02",
    possible: 10,
  },
  {
    id: "midterm",
    section: "Midterm",
    name: "Midterm Exam",
    type: "Exam",
    label: "Exam 01",
    possible: 100,
  },
];

export const blockKey = (c: SampleCourse, id: string) =>
  `block-v1:${SAMPLE_ORG}+${c.number}+${c.run}+type@sequential+block@${id}`;

/** The student's score on one piece of work: their course grade, nudged a little per item. */
export const scoreOf = (s: SamplePerson, c: SampleCourse, id: string): number => {
  const nudge = ((hash(`${s.username}|${c.key}|${id}`) % 17) - 8) / 100;
  return Math.min(1, Math.max(0.4, Math.round((gradeOf(s, c) + nudge) * 100) / 100));
};

export const GROUPS = [
  { id: 1, name: "Grade 9 Cohort", description: "Every Grade 9 student.", grade: 9 },
  { id: 2, name: "Grade 10 Cohort", description: "Every Grade 10 student.", grade: 10 },
  {
    id: 3,
    name: "Robotics Club",
    description: "Meets Thursdays after school.",
    members: [
      "noah.patel",
      "harper.kim",
      "oliver.schmidt",
      "priya.sharma",
      "lucas.nguyen",
      "zoe.adeyemi",
    ],
  },
  {
    id: 4,
    name: "Honor Roll",
    description: "Term average of 90% or above.",
    members: ["ava.chen", "amelia.hart", "layla.haddad", "nora.ivanova", "lily.tanaka"],
  },
];

export const groupMembers = (g: (typeof GROUPS)[number]): SamplePerson[] =>
  g.members
    ? g.members.map((u) => byUsername(u)!).filter(Boolean)
    : STUDENTS.filter((s) => s.grade === g.grade);

/** The students whose guardians are on the platform, watching their grades. */
export const GUARDED = ["ava.chen", "lucas.nguyen", "chloe.dubois"];

export const SCHOOL = {
  address: "12 Northbridge Road, Portland, OR 97209",
  phone: "+1 503 555 0142",
  timezone: "America/Los_Angeles",
};
