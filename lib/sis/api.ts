/**
 * RTK Query slice for the Data Manager — the directory, student records,
 * groups, invitations, guardians, credentials, reports, announcements and
 * analytics. Every request carries `Authorization: Token <dm_token>` and
 * names the platform (`platform_key`, or the key in the path); nothing comes
 * from a module default.
 *
 * Analytics (the AXD families) are server-cached for an hour: after a write
 * the UI shows the write's own result and says the numbers follow.
 */
import { createApi } from "@reduxjs/toolkit/query/react";
import config from "@/lib/iblai/config";
import { LOCAL_STORAGE_KEYS } from "@/lib/iblai/auth-utils";
import { makeBaseQuery } from "./base-query";
import { qs } from "./qs";
import { customFieldsBySlug } from "./demographics";
import type {
  Assertion,
  AxdPage,
  AxdValue,
  CourseInvitation,
  CourseInvitationCreate,
  Credential,
  Demographics,
  DemographicsResponse,
  DemographicsWrite,
  DmEnrollment,
  FieldDefinition,
  FieldDefinitionWrite,
  NotificationPreview,
  NotificationPreviewRequest,
  OverTime,
  Paginated,
  PaginatedData,
  PaginatedDrf,
  PlatformInvitation,
  PlatformMetadata,
  PlatformUsersResponse,
  ReportInfo,
  ReportStatus,
  UserGroup,
  UserPlatformLink,
  WatchedGroup,
  WatchedGroupRow,
  WatchedUser,
} from "./types";

export const SIS_TAG_TYPES = [
  "Directory",
  "Link",
  "Demographics",
  "FieldDefinition",
  "PlatformMetadata",
  "UserGroup",
  "Invitation",
  "CourseInvitation",
  "Enrollment",
  "WatchedGroup",
  "Report",
  "Credential",
  "Assertion",
] as const;

type TagType = (typeof SIS_TAG_TYPES)[number];
const LIST = "LIST";
const enc = encodeURIComponent;

function listTags<T extends { id: string | number }>(type: TagType, results?: T[]) {
  return [{ type, id: LIST }, ...(results ?? []).map((r) => ({ type, id: r.id }))];
}

/** Dates and paging the AXD families take; undeclared params are dropped by the server. */
export interface AxdParams {
  platformKey: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  length?: number;
  search?: string;
}

const axd = (family: string, { platformKey, ...params }: AxdParams, rest = "") =>
  `/api/${family}/orgs/${enc(platformKey)}/${rest}${qs(params)}`;

export const sisApi = createApi({
  reducerPath: "sisApi",
  baseQuery: makeBaseQuery(config.dmUrl(), LOCAL_STORAGE_KEYS.DM_TOKEN, "Token"),
  tagTypes: SIS_TAG_TYPES,
  keepUnusedDataFor: 60,
  endpoints: (b) => ({
    // ------------------------------------------------------------ directory
    /** The directory: active members of the platform; `query` matches username and email. */
    platformUsers: b.query<
      PlatformUsersResponse,
      { platformKey: string; page?: number; page_size?: number; query?: string }
    >({
      query: ({ platformKey, ...params }) =>
        `/api/core/platform/users/${qs({ platform_key: platformKey, ...params })}`,
      providesTags: [{ type: "Directory", id: LIST }],
    }),
    /**
     * A member's link to the platform. A platform admin gets 403 without `platform_key`; with it
     * the DM may list every member, so the rows are narrowed to the username here.
     */
    userLinks: b.query<UserPlatformLink[], { platformKey: string; username: string }>({
      query: ({ platformKey, username }) =>
        `/api/core/users/platforms/${qs({ username, platform_key: platformKey })}`,
      transformResponse: (r: UserPlatformLink[], _m, a) =>
        (r ?? []).filter((l) => l.username === a.username),
      providesTags: (_r, _e, a) => [{ type: "Link", id: a.username }],
    }),
    /** Upsert the user ↔ platform link; `active: false` deactivates the member. */
    setUserLink: b.mutation<
      void,
      { user_id: number; platform_key: string; is_admin?: boolean; active?: boolean }
    >({
      query: (body) => ({ url: "/api/core/users/platforms/", method: "POST", body }),
      invalidatesTags: [{ type: "Directory", id: LIST }, "Link"],
    }),

    // --------------------------------------------------------- student record
    demographics: b.query<Demographics, { platformKey: string; username: string }>({
      query: ({ platformKey, username }) =>
        `/api/core/platforms/${enc(platformKey)}/${enc(username)}/demographics/`,
      // The DM reads custom fields back as a list; the app keeps the PUT shape, by slug.
      transformResponse: (r: DemographicsResponse) => ({
        ...r,
        custom_fields: customFieldsBySlug(r.custom_fields),
      }),
      providesTags: (_r, _e, a) => [{ type: "Demographics", id: a.username }],
    }),
    /** PUT resets omitted base fields — callers send the whole record (read, merge, write). */
    putDemographics: b.mutation<
      Demographics,
      { platformKey: string; username: string; body: DemographicsWrite }
    >({
      query: ({ platformKey, username, body }) => ({
        url: `/api/core/platforms/${enc(platformKey)}/${enc(username)}/demographics/`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: DemographicsResponse) => ({
        ...r,
        custom_fields: customFieldsBySlug(r.custom_fields),
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Demographics", id: a.username }],
    }),
    fieldDefinitions: b.query<FieldDefinition[], string>({
      query: (platformKey) => `/api/core/platforms/${enc(platformKey)}/demographics/fields/`,
      providesTags: [{ type: "FieldDefinition", id: LIST }],
    }),
    createField: b.mutation<FieldDefinition, { platformKey: string; body: FieldDefinitionWrite }>({
      query: ({ platformKey, body }) => ({
        url: `/api/core/platforms/${enc(platformKey)}/demographics/fields/`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "FieldDefinition", id: LIST }],
    }),
    updateField: b.mutation<
      FieldDefinition,
      { platformKey: string; slug: string; body: FieldDefinitionWrite }
    >({
      query: ({ platformKey, slug, body }) => ({
        url: `/api/core/platforms/${enc(platformKey)}/demographics/fields/${enc(slug)}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "FieldDefinition", id: LIST }],
    }),
    deleteField: b.mutation<void, { platformKey: string; slug: string }>({
      query: ({ platformKey, slug }) => ({
        url: `/api/core/platforms/${enc(platformKey)}/demographics/fields/${enc(slug)}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "FieldDefinition", id: LIST }],
    }),
    importFields: b.mutation<unknown, { platformKey: string; file: File }>({
      query: ({ platformKey, file }) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: `/api/core/platforms/${enc(platformKey)}/demographics/fields/import/`,
          method: "POST",
          body,
        };
      },
      invalidatesTags: [{ type: "FieldDefinition", id: LIST }],
    }),
    exportFields: b.mutation<Blob, string>({
      query: (platformKey) => ({
        url: `/api/core/platforms/${enc(platformKey)}/demographics/fields/export/?export_format=csv`,
        responseHandler: (res) => res.blob(),
      }),
    }),

    // ------------------------------------------------------ platform metadata
    platformMetadata: b.query<PlatformMetadata, string>({
      query: (platformKey) => `/api/core/orgs/${enc(platformKey)}/metadata/`,
      providesTags: ["PlatformMetadata"],
    }),
    /** PATCH merges dicts recursively and replaces arrays — lists are written whole. */
    updatePlatformMetadata: b.mutation<
      PlatformMetadata,
      { platformKey: string; metadata: Record<string, unknown> }
    >({
      query: ({ platformKey, metadata }) => ({
        url: `/api/core/orgs/${enc(platformKey)}/metadata/`,
        method: "PATCH",
        body: { metadata },
      }),
      invalidatesTags: ["PlatformMetadata"],
    }),

    // ---------------------------------------------------------------- groups
    userGroups: b.query<
      PaginatedDrf<UserGroup>,
      {
        platformKey: string;
        page?: number;
        page_size?: number;
        name?: string;
        include_users?: boolean;
      }
    >({
      query: ({ platformKey, ...params }) =>
        `/api/core/user-groups/${qs({ platform_key: platformKey, ...params })}`,
      providesTags: (res) => listTags("UserGroup", res?.results),
    }),
    userGroup: b.query<UserGroup, number>({
      query: (id) => `/api/core/user-groups/${id}/?include_users=true`,
      providesTags: (_r, _e, id) => [{ type: "UserGroup", id }],
    }),
    createUserGroup: b.mutation<
      UserGroup,
      { platform_key: string; name: string; description?: string; users_to_set?: number[] }
    >({
      query: (body) => ({ url: "/api/core/user-groups/", method: "POST", body }),
      invalidatesTags: [{ type: "UserGroup", id: LIST }],
    }),
    /** `users_to_set` replaces the whole membership. */
    updateUserGroup: b.mutation<
      UserGroup,
      { id: number; body: { name?: string; description?: string; users_to_set?: number[] } }
    >({
      query: ({ id, body }) => ({ url: `/api/core/user-groups/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "UserGroup", id },
        { type: "UserGroup", id: LIST },
      ],
    }),
    deleteUserGroup: b.mutation<void, number>({
      query: (id) => ({ url: `/api/core/user-groups/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "UserGroup", id: LIST }],
    }),

    // ----------------------------------------------------------- invitations
    platformInvitations: b.query<
      Paginated<PlatformInvitation>,
      { platformKey: string; active?: boolean; page?: number; page_size?: number }
    >({
      query: ({ platformKey, ...params }) =>
        `/api/catalog/invitations/platform/${qs({ platform_key: platformKey, ...params })}`,
      providesTags: [{ type: "Invitation", id: LIST }],
    }),
    courseInvitations: b.query<
      Paginated<CourseInvitation>,
      {
        platformKey: string;
        course_id?: string;
        username?: string;
        active?: boolean;
        page?: number;
        page_size?: number;
      }
    >({
      query: ({ platformKey, ...params }) =>
        `/api/catalog/invitations/course/${qs({ platform_key: platformKey, ...params })}`,
      providesTags: [{ type: "CourseInvitation", id: LIST }],
    }),
    /** Enroll an existing user: the invitation enrolls on edX when accepted (by username, at once). */
    createCourseInvitation: b.mutation<
      CourseInvitation,
      { platformKey: string; body: CourseInvitationCreate }
    >({
      query: ({ platformKey, body }) => ({
        url: `/api/catalog/invitations/course/${qs({ platform_key: platformKey })}`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "CourseInvitation", id: LIST },
        { type: "Enrollment", id: LIST },
      ],
    }),
    bulkCourseInvitations: b.mutation<
      { successes: unknown[]; error_codes: unknown[] },
      { platformKey: string; invitation_data: CourseInvitationCreate[] }
    >({
      query: ({ platformKey, invitation_data }) => ({
        url: "/api/catalog/invitations/course/bulk/",
        method: "POST",
        body: { platform_key: platformKey, invitation_data },
      }),
      invalidatesTags: [
        { type: "CourseInvitation", id: LIST },
        { type: "Enrollment", id: LIST },
      ],
    }),
    myEnrollments: b.query<DmEnrollment[], { platformKey: string; username: string }>({
      query: ({ platformKey, username }) =>
        `/api/catalog/enrollment/courses/search/${qs({ platform_key: platformKey, username, page_size: 100 })}`,
      transformResponse: (r: DmEnrollment[] | { results?: DmEnrollment[] }) =>
        Array.isArray(r) ? r : (r.results ?? []),
      providesTags: [{ type: "Enrollment", id: LIST }],
    }),

    // ------------------------------------------------------------- guardians
    watchedGroups: b.query<
      PaginatedDrf<WatchedGroupRow>,
      { platformKey: string; limit?: number; offset?: number }
    >({
      query: ({ platformKey, ...params }) =>
        `/api/core/watched-groups/${qs({ platform_key: platformKey, ...params })}`,
      providesTags: (res) => listTags("WatchedGroup", res?.results),
    }),
    // The list is lean; members come from here, up to the DM's cap of 100 each.
    watchedGroup: b.query<WatchedGroup, { platformKey: string; id: number }>({
      query: ({ platformKey, id }) =>
        `/api/core/watched-groups/${id}/${qs({ platform_key: platformKey, watcher_limit: 100, watched_user_limit: 100 })}`,
      providesTags: (_r, _e, a) => [{ type: "WatchedGroup", id: a.id }],
    }),
    createWatchedGroup: b.mutation<
      WatchedGroup,
      {
        platformKey: string;
        name: string;
        watched_users?: number[];
        watchers?: { watcher_id: number; events?: string[] }[];
      }
    >({
      query: ({ platformKey, ...body }) => ({
        url: `/api/core/watched-groups/${qs({ platform_key: platformKey })}`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "WatchedGroup", id: LIST }],
    }),
    deleteWatchedGroup: b.mutation<void, { platformKey: string; id: number }>({
      query: ({ platformKey, id }) => ({
        url: `/api/core/watched-groups/${id}/${qs({ platform_key: platformKey })}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "WatchedGroup", id: LIST }],
    }),
    addWatcher: b.mutation<
      WatchedUser,
      { platformKey: string; groupId: number; watcher_id: number; events?: string[] }
    >({
      query: ({ platformKey, groupId, ...body }) => ({
        url: `/api/core/watched-groups/${groupId}/watchers/${qs({ platform_key: platformKey })}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, a) => [
        { type: "WatchedGroup", id: a.groupId },
        { type: "WatchedGroup", id: LIST },
      ],
    }),
    removeWatcher: b.mutation<void, { platformKey: string; groupId: number; id: number }>({
      query: ({ platformKey, groupId, id }) => ({
        url: `/api/core/watched-groups/${groupId}/watchers/${id}/${qs({ platform_key: platformKey })}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, a) => [
        { type: "WatchedGroup", id: a.groupId },
        { type: "WatchedGroup", id: LIST },
      ],
    }),
    watcherEvents: b.query<Record<string, string> | string[], string>({
      query: (platformKey) =>
        `/api/core/watched-groups/watcher-event-choices/${qs({ platform_key: platformKey })}`,
    }),

    // --------------------------------------------------------------- reports
    reports: b.query<ReportInfo[], string>({
      query: (platformKey) => `/api/reports/platforms/${enc(platformKey)}/`,
      transformResponse: (r: { data: ReportInfo[] }) => r.data ?? [],
      providesTags: [{ type: "Report", id: LIST }],
    }),
    reportDetail: b.query<ReportInfo, { platformKey: string; report_name: string }>({
      query: ({ platformKey, report_name }) =>
        `/api/reports/platforms/${enc(platformKey)}/${enc(report_name)}`,
      transformResponse: (r: { data: ReportInfo }) => r.data,
      providesTags: (_r, _e, a) => [{ type: "Report", id: a.report_name }],
    }),
    createReport: b.mutation<
      ReportStatus,
      { platformKey: string; report_name: string; start_date?: string; end_date?: string } & Record<
        string,
        unknown
      >
    >({
      query: ({ platformKey, ...body }) => ({
        url: `/api/reports/platforms/${enc(platformKey)}/new`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ReportStatus }) => r.data,
      invalidatesTags: (_r, _e, a) => [
        { type: "Report", id: LIST },
        { type: "Report", id: a.report_name },
      ],
    }),
    /** The download needs the token, so it is fetched and handed back as a blob. */
    downloadReport: b.mutation<
      Blob,
      { platformKey: string; taskId: string; format?: "csv" | "json" }
    >({
      query: ({ platformKey, taskId, format = "csv" }) => ({
        url: `/api/reports/platforms/${enc(platformKey)}/${enc(taskId)}/download${qs({ format })}`,
        responseHandler: (res) => res.blob(),
      }),
    }),

    // ----------------------------------------------------------- credentials
    credentials: b.query<
      PaginatedData<Credential>,
      { platformKey: string; username: string; page?: number; page_size?: number; search?: string }
    >({
      query: ({ platformKey, username, ...params }) =>
        `/api/credentials/orgs/${enc(platformKey)}/users/${enc(username)}/${qs(params)}`,
      // The credentials app wraps its page: `{status, result: {count, data, …}}`.
      transformResponse: (r: PaginatedData<Credential> | { result: PaginatedData<Credential> }) =>
        "result" in r ? r.result : r,
      providesTags: [{ type: "Credential", id: LIST }],
    }),
    userAssertions: b.query<
      PaginatedData<Assertion>,
      {
        platformKey: string;
        username: string;
        include_revoked?: boolean;
        include_expired?: boolean;
        course?: string;
        page?: number;
        page_size?: number;
      }
    >({
      query: ({ platformKey, username, ...params }) =>
        `/api/credentials/orgs/${enc(platformKey)}/users/${enc(username)}/assertions/${qs(params)}`,
      providesTags: (_r, _e, a) => [{ type: "Assertion", id: a.username }],
    }),
    issueAssertion: b.mutation<
      Assertion,
      {
        platformKey: string;
        callerUsername: string;
        entityId: string;
        body: {
          recipient: { identity: string };
          course?: string;
          program?: string;
          narrative?: string;
          expires?: string;
          metadata?: Record<string, unknown>;
        };
      }
    >({
      query: ({ platformKey, callerUsername, entityId, body }) => ({
        url: `/api/credentials/orgs/${enc(platformKey)}/users/${enc(callerUsername)}/${enc(entityId)}/assertions/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Assertion", id: a.body.recipient.identity }],
    }),
    revokeAssertion: b.mutation<
      unknown,
      {
        platformKey: string;
        callerUsername: string;
        entityId: string;
        reason: string;
        username: string;
      }
    >({
      query: ({ platformKey, callerUsername, entityId, reason }) => ({
        url: `/api/credentials/orgs/${enc(platformKey)}/users/${enc(callerUsername)}/assertions/${enc(entityId)}`,
        method: "PUT",
        body: { revoked: true, revocationReason: reason },
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Assertion", id: a.username }],
    }),

    // --------------------------------------------------------- announcements
    notificationContext: b.query<{ channels: { id: number; name: string }[] }, string>({
      query: (platformKey) =>
        `/api/notification/v1/orgs/${enc(platformKey)}/notification-builder/context/`,
      transformResponse: (r: { data?: { channels?: { id: number; name: string }[] } }) => ({
        channels: r.data?.channels ?? [],
      }),
    }),
    previewNotification: b.mutation<
      NotificationPreview,
      { platformKey: string; body: NotificationPreviewRequest }
    >({
      query: ({ platformKey, body }) => ({
        url: `/api/notification/v1/orgs/${enc(platformKey)}/notification-builder/preview/`,
        method: "POST",
        body,
      }),
    }),
    sendNotification: b.mutation<
      { status: string; notifications_sent: number; build_id: string; message: string },
      { platformKey: string; build_id: string }
    >({
      query: ({ platformKey, build_id }) => ({
        url: `/api/notification/v1/orgs/${enc(platformKey)}/notification-builder/send/`,
        method: "POST",
        body: { build_id },
      }),
    }),

    // ------------------------------------------------------------- analytics
    registeredUsers: b.query<OverTime, AxdParams>({
      query: (p) => axd("overview", p, "registered-users"),
    }),
    activeUsers: b.query<OverTime, AxdParams>({
      query: (p) => axd("overview", p, "active-users"),
    }),
    courseCompletions: b.query<{ data: unknown; meta?: unknown }, AxdParams>({
      query: (p) => axd("overview", p, "courses/completions"),
    }),
    averageGrade: b.query<AxdValue<number | null>, AxdParams>({
      query: (p) => axd("overview", p, "average-grade"),
    }),
    mostActiveCourses: b.query<AxdPage<Record<string, unknown>>, AxdParams>({
      query: (p) => axd("overview", p, "most-active-courses"),
    }),
    learnersOverview: b.query<AxdPage<Record<string, unknown>>, AxdParams>({
      query: (p) => axd("overview", p, "learners"),
    }),
    enrollmentsOverTime: b.query<OverTime, AxdParams>({
      query: (p) => axd("audience", p, "enrollments/over-time"),
    }),
    usersCount: b.query<AxdValue<{ count?: number }>, AxdParams>({
      query: (p) => axd("platform", p, "users/count"),
    }),
    coursesCount: b.query<AxdValue<number>, AxdParams>({
      query: (p) => axd("platform", p, "courses/count"),
    }),
    coursesGrades: b.query<unknown, AxdParams>({
      query: (p) => axd("platform", p, "courses/grades"),
    }),
    learnerGradesPerCourse: b.query<AxdValue<unknown>, AxdParams & { username: string }>({
      query: ({ username, ...p }) =>
        axd("perlearner", p, `users/${enc(username)}/grades/per-course`),
    }),
    learnerLastAccess: b.query<AxdValue<unknown>, AxdParams & { username: string }>({
      query: ({ username, ...p }) => axd("perlearner", p, `users/${enc(username)}/last-access`),
    }),
    courseGradingSummary: b.query<AxdValue<unknown>, AxdParams & { courseId: string }>({
      query: ({ courseId, ...p }) =>
        axd("performance", p, `courses/${enc(courseId)}/grading/summary`),
    }),
    courseGradingAverage: b.query<AxdValue<number | null>, AxdParams & { courseId: string }>({
      query: ({ courseId, ...p }) =>
        axd("performance", p, `courses/${enc(courseId)}/grading/average`),
    }),
  }),
});

export const {
  usePlatformUsersQuery,
  useLazyPlatformUsersQuery,
  useUserLinksQuery,
  useSetUserLinkMutation,
  useDemographicsQuery,
  usePutDemographicsMutation,
  useFieldDefinitionsQuery,
  useCreateFieldMutation,
  useUpdateFieldMutation,
  useDeleteFieldMutation,
  useImportFieldsMutation,
  useExportFieldsMutation,
  usePlatformMetadataQuery,
  useLazyPlatformMetadataQuery,
  useUpdatePlatformMetadataMutation,
  useUserGroupsQuery,
  useUserGroupQuery,
  useCreateUserGroupMutation,
  useUpdateUserGroupMutation,
  useDeleteUserGroupMutation,
  usePlatformInvitationsQuery,
  useCourseInvitationsQuery,
  useCreateCourseInvitationMutation,
  useBulkCourseInvitationsMutation,
  useMyEnrollmentsQuery,
  useWatchedGroupsQuery,
  useWatchedGroupQuery,
  useCreateWatchedGroupMutation,
  useDeleteWatchedGroupMutation,
  useAddWatcherMutation,
  useRemoveWatcherMutation,
  useWatcherEventsQuery,
  useReportsQuery,
  useReportDetailQuery,
  useLazyReportDetailQuery,
  useCreateReportMutation,
  useDownloadReportMutation,
  useCredentialsQuery,
  useUserAssertionsQuery,
  useIssueAssertionMutation,
  useRevokeAssertionMutation,
  useNotificationContextQuery,
  usePreviewNotificationMutation,
  useSendNotificationMutation,
  useRegisteredUsersQuery,
  useActiveUsersQuery,
  useCourseCompletionsQuery,
  useAverageGradeQuery,
  useMostActiveCoursesQuery,
  useLearnersOverviewQuery,
  useEnrollmentsOverTimeQuery,
  useUsersCountQuery,
  useCoursesCountQuery,
  useCoursesGradesQuery,
  useLearnerGradesPerCourseQuery,
  useLearnerLastAccessQuery,
  useCourseGradingSummaryQuery,
  useCourseGradingAverageQuery,
} = sisApi;

export { errorMessage, errorStatus } from "./errors";
