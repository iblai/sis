/**
 * The sample school's answers to the SIS's own reads (`lib/sis/base-query.ts`
 * routes here on the community platform). One function: the request's method,
 * URL and body in, the response body out — or `undefined` for anything that is
 * not a sample read, which the seam turns into the upgrade dialog. Shapes
 * follow `lib/sis/types.ts`; every value derives from `./school.ts`.
 */
import { mainOrg } from "@/lib/iblai/house-journeys";
import { isoDay } from "../dates";
import { DEFAULT_GPA_SCALE, SIS_METADATA_VERSION, type SisMetadata } from "../metadata";
import type {
  Assertion,
  CourseHomeMetadata,
  CourseInvitation,
  Credential,
  DemographicsResponse,
  FieldDefinition,
  GradebookResponse,
  GradebookRow,
  GradingInfo,
  GroupUser,
  LmsEnrollment,
  OverTime,
  PlatformInvitation,
  PlatformUser,
  Progress,
  ReportInfo,
  RosterResponse,
  StudioHomeCourse,
  SubsectionHistory,
  UserGroup,
  UserPlatformLink,
  WatchedGroup,
  WatchedUser,
} from "../types";
import {
  COURSES,
  GRADE_CUTOFFS,
  GRADE_LEVELS,
  GRADERS,
  GROUPS,
  GUARDED,
  PEOPLE,
  PERIODS,
  PRINCIPAL,
  ROOMS,
  SAMPLE_ORG,
  SAMPLE_SCHOOL,
  SCHOOL,
  STUDENTS,
  SUBJECTS,
  SUBSECTIONS,
  TERMS,
  YEARS,
  blockKey,
  byId,
  byUsername,
  courseByKey,
  coursesOf,
  emailOf,
  fullName,
  gradeOf,
  groupMembers,
  hash,
  personaFor,
  rosterOf,
  scoreOf,
  termOf,
  type SampleCourse,
  type SamplePerson,
} from "./school";

const DAY = 86_400_000;
const at = (daysFromNow: number, hour = 9) => {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  return new Date(d.getTime() + daysFromNow * DAY).toISOString();
};
const letterOf = (pct: number): string | null =>
  Object.entries(GRADE_CUTOFFS)
    .sort(([, a], [, b]) => b - a)
    .find(([, min]) => pct >= min)?.[0] ?? null;
const mean = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0;
const num = (v: string | null, fallback: number) => (v && Number(v) > 0 ? Number(v) : fallback);

/** The person a username names; a visitor from outside the school is shown as a student of it. */
const resolve = (username: string) => byUsername(username) ?? personaFor(username);

// ------------------------------------------------------------------ people

const platformUser = (p: SamplePerson): PlatformUser => ({
  user_id: p.id,
  username: p.username,
  email: emailOf(p),
  name: fullName(p),
  added_on: p.since,
  expired_on: null,
  is_admin: p.role === "admin",
  is_staff: p.role === "teacher",
  active: true,
});

const groupUser = (p: SamplePerson): GroupUser => ({
  id: p.id,
  username: p.username,
  email: emailOf(p),
  first_name: p.first,
  last_name: p.last,
});

function directory(q: URLSearchParams) {
  const query = (q.get("query") ?? "").trim().toLowerCase();
  const all = PEOPLE.map(platformUser).filter(
    (u) =>
      !query ||
      u.username.includes(query) ||
      u.email.includes(query) ||
      (u.name ?? "").toLowerCase().includes(query),
  );
  const page = num(q.get("page"), 1);
  const size = num(q.get("page_size"), 20);
  const results = all.slice((page - 1) * size, page * size);
  return {
    count: all.length,
    next_page: page * size < all.length ? page + 1 : null,
    previous_page: page > 1 ? page - 1 : null,
    results,
  };
}

function links(username: string): UserPlatformLink[] {
  const p = resolve(username);
  const main = mainOrg();
  return [
    {
      user_id: p.id,
      username,
      email: byUsername(username) ? emailOf(p) : `${username}@northbridge.example`,
      user_active: true,
      key: main,
      org: main,
      platform_name: SAMPLE_SCHOOL,
      is_admin: p.role === "admin",
      is_staff: p.role === "teacher",
      added_on: p.since,
      expired_on: null,
      active: true,
    },
  ];
}

const FIELDS: { slug: string; name: string; type: string; choices?: string[] }[] = [
  { slug: "student_id", name: "Student ID", type: "text" },
  {
    slug: "grade_level",
    name: "Grade Level",
    type: "select",
    choices: GRADE_LEVELS.map((g) => g.name),
  },
  {
    slug: "enrollment_status",
    name: "Enrollment Status",
    type: "select",
    choices: ["Enrolled", "Withdrawn", "Graduated"],
  },
  { slug: "homeroom", name: "Homeroom", type: "text" },
  { slug: "guardian_name", name: "Guardian Name", type: "text" },
  {
    slug: "guardian_relationship",
    name: "Guardian Relationship",
    type: "select",
    choices: ["Parent", "Guardian", "Grandparent"],
  },
  { slug: "guardian_phone", name: "Guardian Phone", type: "text" },
  { slug: "guardian_email", name: "Guardian Email", type: "text" },
  { slug: "emergency_contact_name", name: "Emergency Contact", type: "text" },
  { slug: "emergency_contact_phone", name: "Emergency Contact Phone", type: "text" },
  { slug: "medical_notes", name: "Medical Notes", type: "text" },
  { slug: "country_of_residence", name: "Country of Residence", type: "text" },
];

const fieldDefinitions = (): FieldDefinition[] =>
  FIELDS.map((f, i) => ({
    id: i + 1,
    name: f.name,
    slug: f.slug,
    field_type: f.type,
    required: false,
    choices: f.choices ?? null,
    display_order: i + 1,
    active: true,
    description: null,
    created_at: "2024-07-01T09:00:00Z",
    updated_at: "2024-07-01T09:00:00Z",
  }));

function demographics(username: string): DemographicsResponse {
  const p = resolve(username);
  const h = hash(p.username);
  const grade = p.grade ?? 9;
  const lastName = p.last.replace(/[’']/g, "");
  const values: Record<string, string> = {
    student_id: `NB-${p.id}`,
    grade_level: `Grade ${grade}`,
    enrollment_status: "Enrolled",
    homeroom: ROOMS[(grade - 9) % ROOMS.length].name,
    guardian_name: `${["Daniel", "Maria", "Wei", "Fatima"][h % 4]} ${p.last}`,
    guardian_relationship: "Parent",
    guardian_phone: `+1 503 555 0${100 + (h % 90)}`,
    guardian_email: `${lastName.toLowerCase()}.family@northbridge.example`,
    emergency_contact_name: `${["Sam", "Alex", "Jordan", "Taylor"][h % 4]} ${p.last}`,
    emergency_contact_phone: `+1 503 555 0${200 + (h % 90)}`,
    medical_notes: "",
    country_of_residence: "USA",
  };
  return {
    username,
    gender: h % 2 ? "female" : "male",
    ethnicity: null,
    date_of_birth: `${2012 - (grade - 9)}-${String(1 + (h % 12)).padStart(2, "0")}-${String(1 + (h % 28)).padStart(2, "0")}`,
    primary_language: ["en", "es", "zh", "fr"][h % 4],
    country_of_birth: ["USA", "USA", "CAN", "MEX"][h % 4],
    nationality: ["USA", "USA", "CAN", "MEX"][h % 4],
    disability_status: null,
    custom_fields: FIELDS.map((f) => ({
      slug: f.slug,
      name: f.name,
      field_type: f.type,
      value: values[f.slug],
    })),
    created_at: `${p.since}T09:00:00Z`,
    updated_at: `${p.since}T09:00:00Z`,
  };
}

// ------------------------------------------------------------------ school

const sisMetadata = (): SisMetadata => ({
  version: SIS_METADATA_VERSION,
  school: SCHOOL,
  years: YEARS,
  terms: TERMS,
  gradeLevels: GRADE_LEVELS,
  periods: PERIODS,
  rooms: ROOMS,
  subjects: SUBJECTS,
  sections: COURSES.map((c) => ({
    courseId: c.key,
    termId: c.termId,
    subjectId: c.subjectId,
    gradeLevelId: `g${c.grades[0]}`,
    roomId: c.roomId,
    periodId: c.periodId,
    days: c.days,
    credits: c.credits,
    seats: c.seats,
  })),
  gpaScale: DEFAULT_GPA_SCALE,
});

const platformMetadata = () => ({
  platform_key: mainOrg(),
  platform_name: SAMPLE_SCHOOL,
  metadata: { sector: "k12", sis: sisMetadata() },
});

const toGroup = (g: (typeof GROUPS)[number], withUsers: boolean): UserGroup => ({
  id: g.id,
  name: g.name,
  platform: 1,
  platform_key: mainOrg(),
  description: g.description,
  owner: null,
  ...(withUsers ? { users: groupMembers(g).map(groupUser) } : {}),
});

function userGroups(q: URLSearchParams) {
  const name = (q.get("name") ?? "").toLowerCase();
  const withUsers = q.get("include_users") === "true";
  const results = GROUPS.filter((g) => g.name.toLowerCase().includes(name)).map((g) =>
    toGroup(g, withUsers),
  );
  return { count: results.length, next: null, previous: null, results };
}

const invitation = (id: number, email: string, daysAgo: number) => ({
  id,
  user_id: null,
  username: null,
  email,
  created: at(-daysAgo),
  started: null,
  expired: null,
  source: "sis",
  redirect_to: null,
  active: true,
  metadata: null,
});

const platformInvitations = () => {
  const results: PlatformInvitation[] = [
    { ...invitation(901, "new.family@northbridge.example", 3), platform_key: mainOrg() },
    { ...invitation(902, "transfer.student@northbridge.example", 1), platform_key: mainOrg() },
  ];
  return { count: results.length, next_page: null, previous_page: null, results };
};

function courseInvitations(q: URLSearchParams) {
  const first = COURSES[0];
  const results: CourseInvitation[] =
    q.get("course_id") === first.key && !q.get("username")
      ? [{ ...invitation(911, "new.family@northbridge.example", 3), course_id: first.key }]
      : [];
  return { count: results.length, next_page: null, previous_page: null, results };
}

const guardianOf = (s: SamplePerson, i: number): WatchedUser => ({
  id: 400 + i,
  username: `${s.last.replace(/[’']/g, "").toLowerCase()}.parent`,
  email: `${s.last.replace(/[’']/g, "").toLowerCase()}.parent@northbridge.example`,
  events: ["grade_change", "course_completion"],
});

const watchedRows = () =>
  GUARDED.map((u, i) => ({ id: 300 + i, name: `Guardians of ${u}`, platform_key: mainOrg() }));

function watchedGroup(id: number): WatchedGroup | undefined {
  const row = watchedRows().find((r) => r.id === id);
  if (!row) return undefined;
  const s = byUsername(GUARDED[id - 300])!;
  return {
    ...row,
    watcher_count: 1,
    watchers: [guardianOf(s, id - 300)],
    watched_user_count: 1,
    watched_users: [{ id: s.id, username: s.username, email: emailOf(s) }],
  };
}

const REPORTS: ReportInfo[] = [
  {
    report_name: "enrollments",
    display_name: "Enrollments",
    description: "Every enrollment on the platform, with its course and dates.",
    extra_query_params: ["start_date", "end_date"],
    result_columns: ["username", "course_id", "created"],
  },
  {
    report_name: "grades",
    display_name: "Course Grades",
    description: "Each student’s current grade in each course.",
    extra_query_params: [],
    result_columns: ["username", "course_id", "percent", "letter_grade"],
  },
  {
    report_name: "activity",
    display_name: "Learner Activity",
    description: "Sign-ins and time spent, per learner.",
    extra_query_params: ["start_date", "end_date"],
    result_columns: ["username", "sign_ins", "time_spent"],
  },
];

const report = (r: ReportInfo): ReportInfo => ({
  ...r,
  status: {
    report_id: `sample-${r.report_name}`,
    report_name: r.report_name,
    state: "completed",
    started_on: at(-1),
    owner: PRINCIPAL.username,
    expires: at(6),
    created_at: at(-1),
  },
});

const CREDENTIALS: Credential[] = [
  {
    entityId: "cred-honor-roll",
    name: "Honor Roll",
    description: "A term average of 90% or above.",
    credentialType: "Badge",
    iconImage: null,
    thumbnailImage: null,
    issuer: { name: SAMPLE_SCHOOL },
  },
  {
    entityId: "cred-earth-science",
    name: "Earth Science Completion",
    description: "Completed Earth Science with a passing grade.",
    credentialType: "Certificate",
    iconImage: null,
    thumbnailImage: null,
    issuer: { name: SAMPLE_SCHOOL },
  },
];

function assertions(username: string): Assertion[] {
  const p = resolve(username);
  const out: Assertion[] = [];
  const earned = (c: Credential, course: SampleCourse | null, daysAgo: number): Assertion => ({
    entityId: `assert-${c.entityId}-${p.id}`,
    issuedOn: at(-daysAgo),
    expires: null,
    revoked: false,
    revocationReason: null,
    recipient: { identity: username, type: "username" },
    credentialDetails: { entityId: c.entityId, name: c.name },
    course: course ? { name: course.name, course_id: course.key } : null,
    program: null,
    narrative: null,
    metadata: null,
  });
  if (GROUPS[3].members?.includes(p.username)) out.push(earned(CREDENTIALS[0], null, 20));
  const earth = COURSES.find((c) => c.number === "ESCI")!;
  if ((p.grade ?? 9) >= 10 && hash(p.username) % 3 === 0)
    out.push(earned(CREDENTIALS[1], earth, 150));
  return out;
}

const page = <T>(data: T[]) => ({ count: data.length, next: null, previous: null, data });

// --------------------------------------------------------------- analytics

function series(q: URLSearchParams, kind: "active" | "enrollments" | "registered"): OverTime {
  const end = new Date(`${q.get("end_date") ?? isoDay()}T00:00:00Z`);
  const start = new Date(
    `${q.get("start_date") ?? isoDay(new Date(end.getTime() - 29 * DAY))}T00:00:00Z`,
  );
  const data: Record<string, number> = {};
  for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
    const idx = Math.floor(t / DAY);
    const weekend = [0, 6].includes(new Date(t).getUTCDay());
    data[isoDay(new Date(t))] =
      kind === "active"
        ? weekend
          ? 1 + (idx % 2)
          : 9 + ((idx * 7) % 12)
        : kind === "enrollments"
          ? idx % 9 === 0
            ? 3
            : idx % 4 === 0
              ? 1
              : 0
          : idx % 6 === 0
            ? 1
            : 0;
  }
  const total = kind === "active" ? 27 : Object.values(data).reduce((a, b) => a + b, 0);
  return { data, total };
}

const activeCourses = COURSES.filter((c) => !c.archived);
const average = (s: SamplePerson) => mean(coursesOf(s).map((c) => gradeOf(s, c)));

function mostActive(q: URLSearchParams) {
  const data = activeCourses
    .map((c) => ({
      course_id: c.key,
      course_name: c.name,
      time_spent: 3600 * (12 + (hash(c.key) % 30)),
    }))
    .sort((a, b) => b.time_spent - a.time_spent)
    .slice(0, num(q.get("length"), 6));
  return {
    data,
    pagination: {
      totalItems: activeCourses.length,
      currentPage: 1,
      perPage: data.length,
      totalPages: 1,
    },
  };
}

function learners(q: URLSearchParams) {
  const data = [...STUDENTS]
    .sort((a, b) => average(b) - average(a))
    .slice(0, num(q.get("length"), 8))
    .map((s) => ({ username: s.username, full_name: fullName(s), email: emailOf(s) }));
  return {
    data,
    pagination: {
      totalItems: STUDENTS.length,
      currentPage: 1,
      perPage: data.length,
      totalPages: 1,
    },
  };
}

const platformAverage = () => mean(STUDENTS.flatMap((s) => coursesOf(s).map((c) => gradeOf(s, c))));

// ---------------------------------------------------------------------- LMS

const courseMetadata = (c: SampleCourse): CourseHomeMetadata => ({
  id: c.key,
  title: c.name,
  number: c.number,
  org: SAMPLE_ORG,
  start: `${termOf(c).start}T08:00:00Z`,
  end: `${termOf(c).end}T23:59:00Z`,
  is_self_paced: false,
  is_enrolled: false,
  is_staff: true,
});

const roster = (c: SampleCourse): RosterResponse => ({
  course_id: c.key,
  students: rosterOf(c).map((s) => ({
    id: s.id,
    username: s.username,
    name: fullName(s),
    email: emailOf(s),
    enrollment_mode: "audit",
    last_login: at(-(hash(s.username) % 10), 15),
    date_joined: `${s.since}T09:00:00Z`,
    cohort: `Grade ${s.grade}`,
    city: null,
    country: null,
    external_user_key: `NB-${s.id}`,
  })),
  students_count: rosterOf(c).length,
  queried_features: [
    "id",
    "username",
    "name",
    "email",
    "enrollment_mode",
    "last_login",
    "date_joined",
    "cohort",
  ],
  feature_names: {
    id: "User ID",
    username: "Username",
    name: "Name",
    email: "Email",
    enrollment_mode: "Enrollment Mode",
    last_login: "Last Login",
    date_joined: "Date Joined",
    cohort: "Cohort",
  },
});

const member = (p: SamplePerson) => ({
  username: p.username,
  email: emailOf(p),
  first_name: p.first,
  last_name: p.last,
});

function roleMembers(c: SampleCourse, rolename: string) {
  const teacher = byUsername(c.teacher)!;
  const users =
    rolename === "staff" ? [member(teacher)] : rolename === "instructor" ? [member(PRINCIPAL)] : [];
  return { course_id: c.key, [rolename]: users };
}

const enrollments = (username: string): LmsEnrollment[] =>
  coursesOf(resolve(username)).map((c) => ({
    created: `${termOf(c).start}T09:00:00Z`,
    mode: "audit",
    is_active: true,
    user: username,
    course_details: {
      course_id: c.key,
      course_name: c.name,
      enrollment_start: `${termOf(c).start}T00:00:00Z`,
      enrollment_end: null,
      course_start: `${termOf(c).start}T08:00:00Z`,
      course_end: `${termOf(c).end}T23:59:00Z`,
      invite_only: false,
    },
  }));

function progress(s: SamplePerson, c: SampleCourse): Progress {
  const pct = gradeOf(s, c);
  const sections = [...new Set(SUBSECTIONS.map((x) => x.section))];
  return {
    username: s.username,
    end: `${termOf(c).end}T23:59:00Z`,
    user_has_passing_grade: pct >= 0.6,
    course_grade: { letter_grade: letterOf(pct), percent: pct, is_passing: pct >= 0.6 },
    section_scores: sections.map((name) => ({
      display_name: name,
      subsections: SUBSECTIONS.filter((x) => x.section === name).map((x) => {
        const earned = Math.round(scoreOf(s, c, x.id) * x.possible);
        return {
          assignment_type: x.type,
          block_key: blockKey(c, x.id),
          display_name: x.name,
          has_graded_assignment: true,
          num_points_earned: earned,
          num_points_possible: x.possible,
          percent_graded: 1,
          problem_scores: [{ earned, possible: x.possible }],
        };
      }),
    })),
    grading_policy: {
      assignment_policies: GRADERS.map((g) => ({
        num_droppable: g.drop_count,
        num_total: g.min_count,
        short_label: g.short_label,
        type: g.type,
        weight: g.weight,
      })),
      grade_range: GRADE_CUTOFFS,
    },
    completion_summary: {
      complete_count: SUBSECTIONS.length,
      incomplete_count: 0,
      locked_count: 0,
    },
  };
}

const gradebookRow = (s: SamplePerson, c: SampleCourse): GradebookRow => {
  const pct = gradeOf(s, c);
  return {
    user_id: s.id,
    username: s.username,
    email: emailOf(s),
    full_name: fullName(s),
    percent: pct,
    letter_grade: letterOf(pct),
    passed: pct >= 0.6,
    section_breakdown: SUBSECTIONS.map((x) => {
      const score = scoreOf(s, c, x.id);
      return {
        label: x.label,
        category: x.type,
        subsection_name: x.name,
        percent: score,
        score_earned: Math.round(score * x.possible),
        score_possible: x.possible,
        attempted: true,
        module_id: blockKey(c, x.id),
        is_graded: true,
      };
    }),
    progress_page_url: `/courses/${c.key}/progress/${s.id}/`,
    external_user_key: `NB-${s.id}`,
  };
};

function gradebook(c: SampleCourse, q: URLSearchParams): GradebookResponse {
  const exact = q.get("username");
  const contains = (q.get("user_contains") ?? "").toLowerCase();
  const rows = rosterOf(c)
    .filter(
      (s) =>
        (!exact || s.username === exact) &&
        (!contains ||
          s.username.includes(contains) ||
          fullName(s).toLowerCase().includes(contains)),
    )
    .map((s) => gradebookRow(s, c));
  return {
    next: null,
    previous: null,
    results: rows.slice(0, num(q.get("page_size"), 50)),
    total_users_count: rosterOf(c).length,
    filtered_users_count: rows.length,
  };
}

const gradingInfo = (c: SampleCourse): GradingInfo => ({
  assignment_types: Object.fromEntries(
    GRADERS.map((g) => [
      g.type,
      {
        drop_count: g.drop_count,
        min_count: g.min_count,
        short_label: g.short_label,
        weight: g.weight,
      },
    ]),
  ),
  subsections: SUBSECTIONS.map((x) => ({
    assignment_type: x.type,
    display_name: x.name,
    graded: true,
    module_id: blockKey(c, x.id),
    short_label: x.label,
  })),
  grades_frozen: false,
  can_see_bulk_management: true,
  grade_cutoffs: GRADE_CUTOFFS,
});

function subsectionHistory(usageKey: string, userId: number): SubsectionHistory | undefined {
  const m = usageKey.match(/^block-v1:([^+]+)\+([^+]+)\+([^+]+)\+type@sequential\+block@(.+)$/);
  const c = m && courseByKey(`course-v1:${m[1]}+${m[2]}+${m[3]}`);
  const s = byId(userId);
  const x = m && SUBSECTIONS.find((sub) => sub.id === m[4]);
  if (!c || !s || !x) return undefined;
  const earned = Math.round(scoreOf(s, c, x.id) * x.possible);
  return {
    subsection_id: usageKey,
    user_id: userId,
    course_id: c.key,
    original_grade: {
      earned_all: earned,
      possible_all: x.possible,
      earned_graded: earned,
      possible_graded: x.possible,
    },
    override: null,
    history: [],
  };
}

// ------------------------------------------------------------------- Studio

const studioCourse = (c: SampleCourse): StudioHomeCourse => ({
  course_key: c.key,
  display_name: c.name,
  org: SAMPLE_ORG,
  number: c.number,
  run: c.run,
  lms_link: null,
  url: null,
  is_active: !c.archived,
});

const courseDetails = (c: SampleCourse) => ({
  org: SAMPLE_ORG,
  course_id: c.number,
  run: c.run,
  display_name: c.name,
  start_date: `${termOf(c).start}T08:00:00Z`,
  end_date: `${termOf(c).end}T23:59:00Z`,
  enrollment_start: `${termOf(c).start}T00:00:00Z`,
  enrollment_end: null,
  self_paced: false,
  short_description: `${c.name} — ${termOf(c).name}`,
  language: "en",
});

const courseGrading = () => ({
  course_details: {
    graders: GRADERS.map((g, id) => ({ ...g, id })),
    grade_cutoffs: GRADE_CUTOFFS,
    grace_period: null,
    minimum_grade_credit: 0.8,
  },
  is_credit_course: false,
});

// -------------------------------------------------------------------- router

const dec = (s: string) => decodeURIComponent(s);
const courseIn = (segment: string) => courseByKey(dec(segment));

/**
 * The sample school's answer to a request, or `undefined` when it is not a
 * sample read (a write, a download, an unknown route).
 */
export function sampleResponse(method: string, url: string, body?: unknown): unknown {
  const verb = method.toUpperCase();
  const u = new URL(url, "http://sample.invalid");
  const path = u.pathname;
  const q = u.searchParams;
  let m: RegExpMatchArray | null;

  if (verb === "GET") {
    // DM
    if (path === "/api/core/platform/users/") return directory(q);
    if (path === "/api/core/users/platforms/") return links(q.get("username") ?? "");
    if ((m = path.match(/^\/api\/core\/platforms\/[^/]+\/([^/]+)\/demographics\/$/)))
      return demographics(dec(m[1]));
    if (/^\/api\/core\/platforms\/[^/]+\/demographics\/fields\/$/.test(path))
      return fieldDefinitions();
    if (/^\/api\/core\/orgs\/[^/]+\/metadata\/$/.test(path)) return platformMetadata();
    if (path === "/api/core/user-groups/") return userGroups(q);
    if ((m = path.match(/^\/api\/core\/user-groups\/(\d+)\/$/))) {
      const g = GROUPS.find((x) => x.id === Number(m![1]));
      return g && toGroup(g, true);
    }
    if (path === "/api/catalog/invitations/platform/") return platformInvitations();
    if (path === "/api/catalog/invitations/course/") return courseInvitations(q);
    if (path === "/api/core/watched-groups/") {
      const results = watchedRows();
      return { count: results.length, next: null, previous: null, results };
    }
    if ((m = path.match(/^\/api\/core\/watched-groups\/(\d+)\/$/)))
      return watchedGroup(Number(m[1]));
    if (/^\/api\/reports\/platforms\/[^/]+\/$/.test(path)) return { data: REPORTS.map(report) };
    if ((m = path.match(/^\/api\/reports\/platforms\/[^/]+\/([^/]+)$/))) {
      const r = REPORTS.find((x) => x.report_name === dec(m![1]));
      return r && { data: report(r) };
    }
    if (/^\/api\/credentials\/orgs\/[^/]+\/users\/[^/]+\/$/.test(path)) return page(CREDENTIALS);
    if ((m = path.match(/^\/api\/credentials\/orgs\/[^/]+\/users\/([^/]+)\/assertions\/$/)))
      return page(assertions(dec(m[1])));
    if (/^\/api\/notification\/v1\/orgs\/[^/]+\/notification-builder\/context\/$/.test(path)) {
      return {
        data: {
          channels: [
            { id: 1, name: "email" },
            { id: 2, name: "push_notification" },
          ],
        },
      };
    }
    if ((m = path.match(/^\/api\/overview\/orgs\/[^/]+\/(.+)$/))) {
      const rest = m[1];
      if (rest === "active-users") return series(q, "active");
      if (rest === "registered-users") return series(q, "registered");
      if (rest === "average-grade") return { data: platformAverage() };
      if (rest === "most-active-courses") return mostActive(q);
      if (rest === "learners") return learners(q);
      if (rest === "courses/completions") return { data: [] };
    }
    if (/^\/api\/audience\/orgs\/[^/]+\/enrollments\/over-time$/.test(path))
      return series(q, "enrollments");
    if ((m = path.match(/^\/api\/platform\/orgs\/[^/]+\/(.+)$/))) {
      if (m[1] === "users/count") return { data: { count: PEOPLE.length } };
      if (m[1] === "courses/count") return { data: activeCourses.length };
      if (m[1] === "courses/grades") return { data: [] };
    }
    if ((m = path.match(/^\/api\/perlearner\/orgs\/[^/]+\/users\/([^/]+)\/(.+)$/))) {
      if (m[2] === "last-access") return { data: { last_access: at(-(hash(dec(m[1])) % 9), 16) } };
      if (m[2] === "grades/per-course") return { data: [] };
    }
    if (
      (m = path.match(
        /^\/api\/performance\/orgs\/[^/]+\/courses\/([^/]+)\/grading\/(average|summary)$/,
      ))
    ) {
      const c = courseIn(m[1]);
      if (!c) return undefined;
      return m[2] === "average"
        ? { data: mean(rosterOf(c).map((s) => gradeOf(s, c))) }
        : { data: {} };
    }
    // LMS
    if ((m = path.match(/^\/api\/course_home\/v1\/course_metadata\/(.+)$/))) {
      const c = courseIn(m[1]);
      return c && courseMetadata(c);
    }
    if (path === "/api/enrollment/v1/enrollment") return enrollments(q.get("user") ?? "");
    if ((m = path.match(/^\/api\/course_home\/v1\/progress\/(.+?)(?:\/(\d+))?$/))) {
      const c = courseIn(m[1]);
      const s = m[2] ? byId(Number(m[2])) : personaFor("");
      return c && s && progress(s, c);
    }
    if ((m = path.match(/^\/api\/grades\/v1\/gradebook\/(.+)\/grading-info$/))) {
      const c = courseIn(m[1]);
      return c && gradingInfo(c);
    }
    if ((m = path.match(/^\/api\/grades\/v1\/gradebook\/(.+)\/$/))) {
      const c = courseIn(m[1]);
      return c && gradebook(c, q);
    }
    if ((m = path.match(/^\/api\/grades\/v1\/subsection\/(.+)\/$/)))
      return subsectionHistory(dec(m[1]), Number(q.get("user_id")));
    if ((m = path.match(/^\/api\/instructor_task\/v1\/schedules\/(.+)\/bulk_email\/$/))) {
      return courseIn(m[1])
        ? [
            {
              id: 1,
              schedule: at(3, 17),
              task: { task_type: "bulk_course_email", task_state: "SCHEDULED" },
              courseEmail: { subject: "Parent–teacher conferences next week" },
            },
          ]
        : undefined;
    }
    if ((m = path.match(/^\/api\/instructor\/v1\/tasks\/(.+)$/))) {
      const c = courseIn(m[1]);
      return (
        c && {
          tasks: [
            {
              task_type: "grade_course",
              task_input: "{}",
              task_id: `sample-task-${hash(c.key) % 1000}`,
              requester: PRINCIPAL.username,
              task_state: "SUCCESS",
              created: at(-2, 7),
              status: "Complete",
              duration_sec: 38,
            },
          ],
        }
      );
    }
    if (/^\/api\/instructor\/v1\/reports\/.+$/.test(path)) return { downloads: [] };
    // Studio
    if (path === "/api/contentstore/v1/home/courses") {
      return {
        courses: COURSES.filter((c) => !c.archived).map(studioCourse),
        archived_courses: COURSES.filter((c) => c.archived).map(studioCourse),
        in_process_course_actions: [],
      };
    }
    if ((m = path.match(/^\/api\/contentstore\/v1\/course_details\/(.+)$/))) {
      const c = courseIn(m[1]);
      return c && courseDetails(c);
    }
    if ((m = path.match(/^\/api\/contentstore\/v1\/course_grading\/(.+)$/)))
      return courseIn(m[1]) && courseGrading();
    if (path === "/api/ibl/manage/course/") {
      const c = courseByKey(q.get("course_key") ?? "");
      return (
        c && {
          course_key: c.key,
          org: SAMPLE_ORG,
          number: c.number,
          run: c.run,
          display_name: c.name,
        }
      );
    }
    return undefined;
  }

  // The LMS instructor API reads through POST; nothing else that posts is a read.
  if (verb === "POST") {
    if ((m = path.match(/^\/courses\/(.+)\/instructor\/api\/get_students_features$/))) {
      const c = courseIn(m[1]);
      return c && roster(c);
    }
    if ((m = path.match(/^\/courses\/(.+)\/instructor\/api\/list_course_role_members$/))) {
      const c = courseIn(m[1]);
      const rolename =
        body instanceof URLSearchParams ? (body.get("rolename") ?? "staff") : "staff";
      return c && roleMembers(c, rolename);
    }
  }
  return undefined;
}
