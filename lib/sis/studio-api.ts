/**
 * RTK Query slice for Studio (the CMS) through the gateway (`<apiBase>/studio`)
 * with `Authorization: JWT <edx_jwt_token>` and no credentials — never the
 * SDK's Studio service, which sends credentials a `*` origin refuses. A new
 * section is a rerun (`/api/ibl/manage/course/`, open to the org admin); a
 * term's dates and the grading policy live on the run.
 */
import { createApi } from "@reduxjs/toolkit/query/react";
import config from "@/lib/iblai/config";
import { LOCAL_STORAGE_KEYS } from "@/lib/iblai/auth-utils";
import { makeBaseQuery } from "./base-query";
import { qs } from "./qs";
import type {
  CourseGrading,
  ManagedCourse,
  RerunCourseRequest,
  StudioCourseDetails,
} from "./types";

export const studioApi = createApi({
  reducerPath: "studioApi",
  baseQuery: makeBaseQuery(config.studioUrl(), LOCAL_STORAGE_KEYS.EDX_TOKEN_KEY, "JWT"),
  tagTypes: ["CourseDetails", "CourseGrading", "ManagedCourse"],
  keepUnusedDataFor: 60,
  endpoints: (b) => ({
    rerunCourse: b.mutation<ManagedCourse, RerunCourseRequest>({
      query: (body) => ({ url: "/api/ibl/manage/course/", method: "POST", body }),
    }),
    managedCourse: b.query<ManagedCourse, string>({
      query: (courseKey) => `/api/ibl/manage/course/${qs({ course_key: courseKey })}`,
      providesTags: (_r, _e, id) => [{ type: "ManagedCourse", id }],
    }),
    courseDetails: b.query<StudioCourseDetails, string>({
      query: (courseId) => `/api/contentstore/v1/course_details/${courseId}`,
      providesTags: (_r, _e, id) => [{ type: "CourseDetails", id }],
    }),
    updateCourseDetails: b.mutation<
      StudioCourseDetails,
      { courseId: string; body: StudioCourseDetails }
    >({
      query: ({ courseId, body }) => ({
        url: `/api/contentstore/v1/course_details/${courseId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "CourseDetails", id: a.courseId }],
    }),
    courseGrading: b.query<CourseGrading, string>({
      query: (courseId) => `/api/contentstore/v1/course_grading/${courseId}`,
      providesTags: (_r, _e, id) => [{ type: "CourseGrading", id }],
    }),
    updateCourseGrading: b.mutation<CourseGrading, { courseId: string; body: CourseGrading }>({
      query: ({ courseId, body }) => ({
        url: `/api/contentstore/v1/course_grading/${courseId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "CourseGrading", id: a.courseId }],
    }),
  }),
});

export const {
  useRerunCourseMutation,
  useManagedCourseQuery,
  useCourseDetailsQuery,
  useUpdateCourseDetailsMutation,
  useCourseGradingQuery,
  useUpdateCourseGradingMutation,
} = studioApi;
