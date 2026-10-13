/**
 * RTK Query slice for the LMS (Open edX) through the gateway (`<apiBase>/lms`)
 * with `Authorization: JWT <edx_jwt_token>` and no credentials: rosters,
 * teachers (course roles), the import, enrollments, progress, the course home
 * header, the gradebook, course email, tasks and org roles. The course list
 * itself comes from Studio (`studio-api.ts`): the LMS course routes are blocked
 * at the edge for every browser. A platform admin passes the
 * course-staff checks through ibl's implied org-instructor rights. Course
 * keys go into paths as they are (`course-v1:Org+Num+Run`), as the MFEs do.
 *
 * The instructor API reads form data (`request.POST`), so its bodies are
 * form-encoded; the grades and user APIs take JSON.
 */
import { createApi } from "@reduxjs/toolkit/query/react";
import config from "@/lib/iblai/config";
import { LOCAL_STORAGE_KEYS } from "@/lib/iblai/auth-utils";
import { makeBaseQuery } from "./base-query";
import { qs } from "./qs";
import { roleMembers } from "./roles";
import type {
  CourseHomeMetadata,
  CourseRole,
  GradebookBulkUpdateItem,
  GradebookParams,
  GradebookResponse,
  GradingInfo,
  LmsAccount,
  LmsEnrollment,
  ModifyAccessResponse,
  OrgRole,
  Progress,
  RoleMembersResponse,
  RosterResponse,
  SendEmailResponse,
  SubsectionHistory,
} from "./types";

const form = (fields: Record<string, string | undefined>) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) body.set(k, v);
  return body;
};
const instructor = (courseId: string, action: string) =>
  `/courses/${courseId}/instructor/api/${action}`;

/** One row of `/api/instructor/v1/tasks/{C}`. */
export interface InstructorTask {
  task_type: string;
  task_input: string;
  task_id: string;
  requester: string;
  task_state: string;
  created: string;
  status: string;
  task_message?: string;
  duration_sec?: number;
}

/** One row of `/api/instructor/v1/reports/{C}`. */
export interface InstructorDownload {
  url: string;
  name: string;
  link: string;
}

export interface ImportResult {
  row_errors: { response: string; username?: string; email?: string }[];
  general_errors: { response: string }[];
  warnings: { response: string }[];
}

export const lmsApi = createApi({
  reducerPath: "lmsApi",
  baseQuery: makeBaseQuery(config.lmsUrl(), LOCAL_STORAGE_KEYS.EDX_TOKEN_KEY, "JWT"),
  tagTypes: [
    "Course",
    "Roster",
    "RoleMembers",
    "Enrollment",
    "Progress",
    "Gradebook",
    "GradingInfo",
    "History",
    "Schedules",
    "Tasks",
    "Roles",
  ],
  keepUnusedDataFor: 60,
  endpoints: (b) => ({
    /** The course home header: title and dates, for course staff and the enrolled. */
    courseMetadata: b.query<CourseHomeMetadata, string>({
      query: (courseId) => `/api/course_home/v1/course_metadata/${courseId}`,
      providesTags: (_r, _e, id) => [{ type: "Course", id }],
    }),
    /** The roster (`get_students_features`) — a POST that reads nothing. */
    roster: b.query<RosterResponse, string>({
      query: (courseId) => ({
        url: instructor(courseId, "get_students_features"),
        method: "POST",
        body: form({}),
      }),
      providesTags: (_r, _e, id) => [{ type: "Roster", id }],
    }),
    rosterCsv: b.mutation<unknown, string>({
      query: (courseId) => ({
        url: `${instructor(courseId, "get_students_features")}/csv`,
        method: "POST",
        body: form({}),
      }),
      invalidatesTags: (_r, _e, id) => [{ type: "Tasks", id }],
    }),
    roleMembers: b.query<RoleMembersResponse, { courseId: string; rolename: CourseRole }>({
      query: ({ courseId, rolename }) => ({
        url: instructor(courseId, "list_course_role_members"),
        method: "POST",
        body: form({ rolename }),
      }),
      transformResponse: (raw: Record<string, unknown>, _m, a) => ({
        course_id: String(raw.course_id ?? a.courseId),
        rolename: a.rolename,
        users: roleMembers(raw, a.rolename),
      }),
      providesTags: (_r, _e, a) => [{ type: "RoleMembers", id: `${a.courseId}:${a.rolename}` }],
    }),
    /** Assign or remove a teacher; "allow" also enrolls the user. */
    modifyAccess: b.mutation<
      ModifyAccessResponse,
      {
        courseId: string;
        unique_student_identifier: string;
        rolename: CourseRole;
        action: "allow" | "revoke";
      }
    >({
      query: ({ courseId, ...fields }) => ({
        url: instructor(courseId, "modify_access"),
        method: "POST",
        body: form(fields),
      }),
      invalidatesTags: (_r, _e, a) => [
        { type: "RoleMembers", id: `${a.courseId}:${a.rolename}` },
        { type: "Roster", id: a.courseId },
      ],
    }),
    /** Bulk import: existing emails are enrolled, new ones get an account (`ALLOW_AUTOMATED_SIGNUPS`). */
    registerAndEnroll: b.mutation<ImportResult, { courseId: string; csv: string }>({
      query: ({ courseId, csv }) => {
        const body = new FormData();
        body.append("students_list", new Blob([csv], { type: "text/csv" }), "students.csv");
        return { url: instructor(courseId, "register_and_enroll_students"), method: "POST", body };
      },
      invalidatesTags: (_r, _e, a) => [{ type: "Roster", id: a.courseId }],
    }),
    /** A user's enrollments in the courses the caller staffs. */
    userEnrollments: b.query<LmsEnrollment[], string>({
      query: (username) => `/api/enrollment/v1/enrollment${qs({ user: username })}`,
      providesTags: (_r, _e, username) => [{ type: "Enrollment", id: username }],
    }),
    /** Progress of one student (`studentId` numeric, needs course staff) or of the caller. */
    progress: b.query<Progress, { courseId: string; studentId?: number }>({
      query: ({ courseId, studentId }) =>
        `/api/course_home/v1/progress/${courseId}${studentId ? `/${studentId}` : ""}`,
      providesTags: (_r, _e, a) => [
        { type: "Progress", id: `${a.courseId}:${a.studentId ?? "me"}` },
      ],
    }),
    gradebook: b.query<GradebookResponse, GradebookParams>({
      query: ({ courseId, ...params }) =>
        `/api/grades/v1/gradebook/${courseId}/${qs({ page_size: 50, ...params })}`,
      providesTags: (_r, _e, a) => [{ type: "Gradebook", id: a.courseId }],
    }),
    /** Subsection overrides with a comment; 202 accepted, 422 per-row errors, 403 when frozen. */
    gradebookBulkUpdate: b.mutation<
      unknown,
      { courseId: string; updates: GradebookBulkUpdateItem[] }
    >({
      query: ({ courseId, updates }) => ({
        url: `/api/grades/v1/gradebook/${courseId}/bulk-update`,
        method: "POST",
        body: updates,
      }),
      invalidatesTags: (_r, _e, a) => [
        { type: "Gradebook", id: a.courseId },
        "History",
        "Progress",
      ],
    }),
    gradingInfo: b.query<GradingInfo, string>({
      query: (courseId) => `/api/grades/v1/gradebook/${courseId}/grading-info`,
      providesTags: (_r, _e, id) => [{ type: "GradingInfo", id }],
    }),
    subsectionHistory: b.query<SubsectionHistory, { usageKey: string; userId: number }>({
      query: ({ usageKey, userId }) =>
        `/api/grades/v1/subsection/${usageKey}/${qs({ user_id: userId })}`,
      providesTags: (_r, _e, a) => [{ type: "History", id: `${a.usageKey}:${a.userId}` }],
    }),
    /** Course email (`BulkEmailFlag`); `schedule` is an ISO datetime. */
    sendEmail: b.mutation<
      SendEmailResponse,
      { courseId: string; send_to: string[]; subject: string; message: string; schedule?: string }
    >({
      query: ({ courseId, send_to, subject, message, schedule }) => ({
        url: instructor(courseId, "send_email"),
        method: "POST",
        body: form({ send_to: JSON.stringify(send_to), subject, message, schedule }),
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Schedules", id: a.courseId }],
    }),
    emailSchedules: b.query<unknown[], string>({
      query: (courseId) => `/api/instructor_task/v1/schedules/${courseId}/bulk_email/`,
      transformResponse: (r: unknown[] | { results?: unknown[] }) =>
        Array.isArray(r) ? r : (r.results ?? []),
      providesTags: (_r, _e, id) => [{ type: "Schedules", id }],
    }),
    instructorTasks: b.query<InstructorTask[], string>({
      query: (courseId) => `/api/instructor/v1/tasks/${courseId}`,
      transformResponse: (r: { tasks?: InstructorTask[] }) => r.tasks ?? [],
      providesTags: (_r, _e, id) => [{ type: "Tasks", id }],
    }),
    instructorReports: b.query<InstructorDownload[], string>({
      query: (courseId) => `/api/instructor/v1/reports/${courseId}`,
      // The report store hands back host-relative `/media/grades/…` URLs.
      transformResponse: (r: { downloads?: InstructorDownload[] }) =>
        (r.downloads ?? []).map((d) =>
          d.url.startsWith("/") ? { ...d, url: `${config.legacyLmsUrl()}${d.url}` } : d,
        ),
      providesTags: (_r, _e, id) => [{ type: "Tasks", id }],
    }),
    startCertificateGeneration: b.mutation<unknown, string>({
      query: (courseId) => ({
        url: instructor(courseId, "start_certificate_generation"),
        method: "POST",
        body: form({}),
      }),
      invalidatesTags: (_r, _e, id) => [{ type: "Tasks", id }],
    }),
    changeDueDate: b.mutation<
      unknown,
      { courseId: string; url: string; student: string; due_datetime: string; reason?: string }
    >({
      query: ({ courseId, ...fields }) => ({
        url: instructor(courseId, "change_due_date"),
        method: "POST",
        body: form(fields),
      }),
    }),
    /** The caller's own LMS roles (global staff may read others'). */
    myRoles: b.query<unknown, string>({
      query: (username) => `/api/ibl/users/manage/roles/${qs({ username })}`,
      providesTags: ["Roles"],
    }),
    /** Make a teacher (`org-staff`) or an admin (`org-instructor`) on the platform's org. */
    setOrgRole: b.mutation<
      unknown,
      { username: string; role: OrgRole; org: string; active: boolean }
    >({
      query: (body) => ({ url: "/api/ibl/users/manage/roles/", method: "POST", body }),
      invalidatesTags: ["Roles"],
    }),
    accounts: b.query<LmsAccount[], string[]>({
      query: (usernames) => `/api/user/v1/accounts${qs({ username: usernames.join(",") })}`,
    }),
    me: b.query<LmsAccount, void>({
      query: () => "/api/user/v1/me",
    }),
  }),
});

export const {
  useCourseMetadataQuery,
  useRosterQuery,
  useRosterCsvMutation,
  useRoleMembersQuery,
  useModifyAccessMutation,
  useRegisterAndEnrollMutation,
  useUserEnrollmentsQuery,
  useProgressQuery,
  useGradebookQuery,
  useGradebookBulkUpdateMutation,
  useGradingInfoQuery,
  useSubsectionHistoryQuery,
  useSendEmailMutation,
  useEmailSchedulesQuery,
  useInstructorTasksQuery,
  useInstructorReportsQuery,
  useStartCertificateGenerationMutation,
  useChangeDueDateMutation,
  useMyRolesQuery,
  useSetOrgRoleMutation,
  useAccountsQuery,
  useMeQuery,
} = lmsApi;
