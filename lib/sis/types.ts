/**
 * ibl.ai/sis resource types — what the three backends return, named as they
 * name them. DM shapes come from the live schema (ibl-dm-pro 4.416.0), LMS
 * and Studio shapes from Open edX Sumac with the ibl plugins (2.62).
 */

// ------------------------------------------------------------------ DM: users

/** A row of `/api/core/platform/users/` — the platform's directory (the link JSON; active members only). */
export interface PlatformUser {
  user_id: number;
  username: string;
  email: string;
  name?: string;
  added_on?: string | null;
  expired_on?: string | null;
  is_admin?: boolean;
  is_staff?: boolean;
  active?: boolean;
}

export interface PlatformUsersResponse {
  count: number;
  next_page: number | null;
  previous_page: number | null;
  results: PlatformUser[];
}

/** What a member is to the school, from the link's two flags: neither flag is a student. */
export type MemberRole = "student" | "teacher" | "admin";

/** `/api/core/users/platforms/` — one user ↔ platform link. */
export interface UserPlatformLink {
  user_id: number;
  username: string;
  email: string;
  user_active: boolean;
  key: string;
  org: string;
  platform_name: string;
  is_admin?: boolean;
  is_staff?: boolean;
  added_on?: string | null;
  expired_on?: string | null;
  active?: boolean;
}

// ----------------------------------------------------------- DM: demographics

export interface Demographics {
  username: string;
  gender?: string | null;
  ethnicity?: string | null;
  date_of_birth?: string | null;
  primary_language?: string | null;
  country_of_birth?: string | null;
  nationality?: string | null;
  disability_status?: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DemographicsWrite = Partial<
  Omit<Demographics, "username" | "created_at" | "updated_at">
>;

export type FieldType = "text" | "number" | "date" | "select" | "boolean" | string;

export interface FieldDefinition {
  id: number;
  name: string;
  slug: string;
  field_type: FieldType;
  required?: boolean;
  choices?: string[] | null;
  display_order?: number;
  active?: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export type FieldDefinitionWrite = Partial<
  Pick<
    FieldDefinition,
    | "name"
    | "slug"
    | "field_type"
    | "required"
    | "choices"
    | "display_order"
    | "active"
    | "description"
  >
>;

// -------------------------------------------------------- DM: platform metadata

export interface PlatformMetadata {
  platform_key: string;
  platform_name: string;
  metadata: Record<string, unknown> | null;
}

// ---------------------------------------------------------------- DM: groups

export interface GroupUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserGroup {
  id: number;
  name: string;
  platform: number;
  platform_key: string;
  description?: string | null;
  owner?: unknown;
  users?: GroupUser[];
}

/** DRF's default page: `{count, next, previous, results}`. */
export interface PaginatedDrf<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** The DM's page-number page: `{count, next_page, previous_page, results}`. */
export interface Paginated<T> {
  count: number;
  next_page: number | null;
  previous_page: number | null;
  results: T[];
}

// ----------------------------------------------------------- DM: invitations

export interface Invitation {
  id: number;
  user_id?: number | null;
  username: string | null;
  email: string | null;
  created: string | null;
  started: string | null;
  expired: string | null;
  source: string | null;
  redirect_to: string | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
}

export interface PlatformInvitation extends Invitation {
  platform_key: string;
}

export interface CourseInvitation extends Invitation {
  course_id: string;
}

export interface CourseInvitationCreate {
  course_id: string;
  username?: string;
  email?: string;
  active?: boolean;
  source?: string;
  redirect_to?: string;
  metadata?: Record<string, unknown>;
}

/** A row of `/api/catalog/enrollment/courses/search/`. */
export interface DmEnrollment {
  user_id: number;
  username: string;
  email: string;
  course_id: string;
  active: boolean;
  created: string;
  started?: string | null;
  ended?: string | null;
  expired?: string | null;
  metadata?: Record<string, unknown>;
  name?: string;
  course_name?: string;
}

// -------------------------------------------------------- DM: watched groups

export interface WatchedUser {
  id: number;
  username: string;
  email: string;
  events?: string[];
}

export interface WatchedGroup {
  id: number;
  name: string;
  platform_key: string;
  watcher_count: number;
  watchers: WatchedUser[];
  watched_user_count: number;
  watched_users: WatchedUser[];
}

// --------------------------------------------------------------- DM: reports

export type ReportState = "pending" | "running" | "completed" | "failed" | "expired" | string;

export interface ReportStatus {
  report_id?: string;
  report_name?: string;
  state?: ReportState;
  started_on?: string;
  owner?: string;
  expires?: string;
  url?: string;
  created_at?: string;
  poll_timeout?: number;
}

export interface ReportInfo {
  display_name: string;
  description?: string;
  report_name: string;
  icon?: string;
  extra_query_params?: string[];
  result_columns?: string[];
  status?: ReportStatus;
}

// ----------------------------------------------------------- DM: credentials

export interface Credential {
  entityId: string;
  name: string;
  description?: string | null;
  credentialType?: string | null;
  iconImage?: string | null;
  thumbnailImage?: string | null;
  issuer?: { entityId?: string; name?: string } | string | null;
  catalog_items?: unknown[];
  [k: string]: unknown;
}

export interface Assertion {
  entityId: string;
  issuedOn: string;
  expires?: string | null;
  revoked?: boolean;
  revocationReason?: string | null;
  recipient: { identity?: string; type?: string; [k: string]: unknown };
  credentialDetails?: { entityId?: string; name?: string; image?: string; [k: string]: unknown };
  course?: string | null;
  program?: string | null;
  narrative?: string | null;
  metadata?: Record<string, unknown> | null;
  [k: string]: unknown;
}

/** The credentials app's page: `{count, next, previous, num_pages, page_number, data}`. */
export interface PaginatedData<T> {
  count: number;
  next: string | null;
  previous: string | null;
  num_pages?: number;
  page_number?: number;
  max_page_size?: number;
  data: T[];
}

// --------------------------------------------------------- DM: notifications

export type NotificationSourceType =
  | "email"
  | "username"
  | "platform"
  | "csv"
  | "department"
  | "pathway"
  | "program"
  | "usergroup";

export interface NotificationPreviewRequest {
  /** Channel ids from the builder context (`email`, `push_notification` = in-app). */
  channels: number[];
  sources: { type: NotificationSourceType; data: unknown }[];
  template_id?: string;
  template_data?: Record<string, unknown>;
  context?: Record<string, unknown>;
  process_on?: string;
}

export interface NotificationPreview {
  status: string;
  build_id: string;
  count: number;
  warning?: string | null;
  recipients?: { username?: string; email?: string }[];
}

// -------------------------------------------------------------- DM: analytics

/** `{data: {"2026-09-01": 3, …}, total}` — the AXD's over-time shape. */
export interface OverTime {
  data: Record<string, number> | { date: string; count: number }[] | null;
  total?: number | null;
  meta?: Record<string, unknown>;
}

export interface AxdValue<T = number> {
  data: T;
}

export interface AxdPage<T> {
  data: T[];
  pagination?: {
    totalItems?: number;
    currentPage?: number;
    perPage?: number;
    totalPages?: number;
    [k: string]: unknown;
  };
}

// ------------------------------------------------------------------- LMS

export interface LmsCourseMedia {
  image?: { raw?: string; small?: string; large?: string };
  course_image?: { uri?: string };
}

/** A course run as the app sees it, built from Studio's course list (`fromStudioCourse`). */
export interface LmsCourse {
  id: string;
  course_id: string;
  name: string;
  org: string;
  number: string;
  run?: string;
  start?: string | null;
  end?: string | null;
  enrollment_start?: string | null;
  enrollment_end?: string | null;
  pacing?: "instructor" | "self" | string;
  short_description?: string | null;
  media?: LmsCourseMedia;
  hidden?: boolean;
  invitation_only?: boolean;
}

/** One row of Studio's `GET /api/contentstore/v1/home/courses` (`courses` and `archived_courses`). */
export interface StudioHomeCourse {
  course_key: string;
  display_name: string;
  org?: string;
  number?: string;
  run?: string;
  lms_link?: string | null;
  url?: string | null;
  is_active?: boolean;
}

export interface StudioHomeCoursesResponse {
  courses: StudioHomeCourse[];
  archived_courses?: StudioHomeCourse[];
  in_process_course_actions?: unknown[];
}

/** `GET /api/course_home/v1/course_metadata/{C}` — the course home header, for staff and the enrolled. */
export interface CourseHomeMetadata {
  id?: string;
  title: string;
  number?: string;
  org?: string;
  start?: string | null;
  end?: string | null;
  is_self_paced?: boolean;
  is_enrolled?: boolean;
  is_staff?: boolean;
}

export interface RosterStudent {
  id: number;
  username: string;
  name: string;
  email: string;
  enrollment_mode?: string;
  last_login?: string | null;
  date_joined?: string | null;
  cohort?: string | null;
  city?: string | null;
  country?: string | null;
  external_user_key?: string | null;
}

export interface RosterResponse {
  course_id: string;
  students: RosterStudent[];
  students_count: number;
  queried_features: string[];
  feature_names: Record<string, string>;
}

export type CourseRole = "staff" | "instructor" | "beta" | "data_researcher" | "limited_staff";

export interface RoleMember {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface RoleMembersResponse {
  course_id: string;
  rolename: CourseRole;
  users: RoleMember[];
}

export interface ModifyAccessResponse {
  unique_student_identifier: string;
  rolename: string;
  action: "allow" | "revoke";
  success: "yes" | "no";
}

export interface LmsEnrollment {
  created: string;
  mode: string;
  is_active: boolean;
  user: string;
  course_details: {
    course_id: string;
    course_name: string;
    enrollment_start?: string | null;
    enrollment_end?: string | null;
    course_start?: string | null;
    course_end?: string | null;
    invite_only?: boolean;
  };
}

export interface ProblemScore {
  earned: number;
  possible: number;
}

export interface SubsectionScore {
  assignment_type: string | null;
  block_key: string;
  display_name: string;
  has_graded_assignment: boolean;
  num_points_earned: number;
  num_points_possible: number;
  percent_graded: number;
  problem_scores: ProblemScore[];
  url?: string;
}

export interface SectionScore {
  display_name: string;
  subsections: SubsectionScore[];
}

export interface Progress {
  username: string;
  end?: string | null;
  user_has_passing_grade: boolean;
  course_grade: { letter_grade: string | null; percent: number; is_passing: boolean };
  section_scores: SectionScore[];
  grading_policy: {
    assignment_policies: {
      num_droppable: number;
      num_total: number;
      short_label: string;
      type: string;
      weight: number;
    }[];
    grade_range: Record<string, number>;
  };
  completion_summary?: { complete_count: number; incomplete_count: number; locked_count: number };
  certificate_data?: {
    cert_status?: string;
    cert_web_view_url?: string | null;
    download_url?: string | null;
    certificate_available_date?: string | null;
  };
}

export interface GradebookBreakdown {
  label: string;
  category?: string;
  subsection_name: string;
  percent: number;
  score_earned: number;
  score_possible: number;
  attempted: boolean;
  module_id: string;
  is_graded?: boolean;
}

export interface GradebookRow {
  user_id: number;
  username: string;
  email?: string;
  full_name?: string;
  percent: number;
  letter_grade: string | null;
  passed?: boolean;
  section_breakdown: GradebookBreakdown[];
  progress_page_url?: string;
  external_user_key?: string | null;
}

export interface GradebookResponse {
  next: string | null;
  previous: string | null;
  results: GradebookRow[];
  total_users_count: number;
  filtered_users_count: number;
}

export interface GradebookParams {
  courseId: string;
  cursor?: string;
  page_size?: number;
  username?: string;
  user_contains?: string;
  assignment?: string;
  course_grade_min?: number;
  course_grade_max?: number;
}

export interface GradeOverride {
  earned_graded_override?: number;
  possible_graded_override?: number;
  earned_all_override?: number;
  possible_all_override?: number;
  comment?: string;
}

export interface GradebookBulkUpdateItem {
  user_id: number;
  usage_id: string;
  grade: GradeOverride;
}

export interface GradingInfo {
  assignment_types: Record<
    string,
    { drop_count: number; min_count: number; short_label: string; weight: number }
  >;
  subsections: {
    assignment_type: string | null;
    display_name: string;
    graded: boolean;
    module_id: string;
    short_label: string;
  }[];
  grades_frozen: boolean;
  can_see_bulk_management?: boolean;
  grade_cutoffs?: Record<string, number>;
}

export interface OverrideHistoryEntry {
  created: string;
  comment: string | null;
  earned_all_override: number | null;
  possible_all_override: number | null;
  earned_graded_override: number | null;
  possible_graded_override: number | null;
  history_user?: string | null;
  feature?: string;
}

export interface SubsectionHistory {
  subsection_id: string;
  user_id: number;
  course_id: string;
  original_grade?: {
    earned_all: number;
    possible_all: number;
    earned_graded: number;
    possible_graded: number;
  } | null;
  override?: OverrideHistoryEntry | null;
  history: OverrideHistoryEntry[];
}

export interface SendEmailResponse {
  course_id: string;
  success: boolean;
}

export interface LmsAccount {
  username: string;
  name?: string | null;
  email?: string | null;
  profile_image?: { has_image?: boolean; image_url_small?: string; image_url_medium?: string };
}

export type OrgRole = "org-staff" | "org-instructor";

// ----------------------------------------------------------------- Studio

export interface StudioCourseDetails {
  org?: string;
  course_id?: string;
  run?: string;
  display_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  enrollment_start?: string | null;
  enrollment_end?: string | null;
  self_paced?: boolean;
  short_description?: string;
  language?: string | null;
  [k: string]: unknown;
}

export interface Grader {
  type: string;
  min_count: number;
  drop_count: number;
  short_label: string;
  weight: number;
  id?: number;
}

export interface CourseGrading {
  graders: Grader[];
  grade_cutoffs: Record<string, number>;
  grace_period?: { hours: number; minutes: number } | null;
  minimum_grade_credit?: number;
  is_credit_course?: boolean;
}

export interface ManagedCourse {
  course_key: string;
  org: string;
  number: string;
  run: string;
  display_name: string;
  url?: string;
}

export interface RerunCourseRequest {
  org: string;
  number: string;
  run: string;
  display_name: string;
  start?: string;
  source_course_key?: string;
}
