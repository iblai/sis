"use client";

import { useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useUserEnrollmentsQuery } from "@/lib/sis/lms-api";
import { useHomeCoursesQuery } from "@/lib/sis/studio-api";
import {
  fromEnrollment,
  fromStudioCourse,
  joinSections,
  sortSections,
  type SectionRow,
} from "@/lib/sis/sections";

/**
 * The caller's course runs joined with the school's section data: Studio's org
 * list (what an admin can author) for an admin, their own enrollments for a
 * student, to whom Studio lists nothing.
 */
export function useSections(options?: { skip?: boolean }) {
  const { org, isAdmin, username } = useSession();
  const skip = options?.skip;
  const courses = useHomeCoursesQuery({ org }, { skip: skip || !org || !isAdmin });
  const enrollments = useUserEnrollmentsQuery(username, { skip: skip || isAdmin || !username });
  const metadata = useSisMetadata();
  const runs = useMemo(
    () =>
      isAdmin
        ? [
            ...(courses.data?.courses ?? []).map((c) => fromStudioCourse(c)),
            ...(courses.data?.archived_courses ?? []).map((c) => fromStudioCourse(c, true)),
          ]
        : (enrollments.data ?? []).filter((e) => e.is_active).map(fromEnrollment),
    [isAdmin, courses.data, enrollments.data],
  );
  const rows = useMemo<SectionRow[]>(
    () => sortSections(joinSections(runs, metadata.meta)),
    [runs, metadata.meta],
  );
  const byCourseId = useMemo(() => new Map(rows.map((r) => [r.course.id, r])), [rows]);
  return {
    rows,
    byCourseId,
    meta: metadata.meta,
    isLoading: courses.isLoading || enrollments.isLoading || metadata.isLoading,
    error: courses.error ?? enrollments.error ?? metadata.error,
    refetch: isAdmin ? courses.refetch : enrollments.refetch,
  };
}
