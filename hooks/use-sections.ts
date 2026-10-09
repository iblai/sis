"use client";

import { useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useHomeCoursesQuery } from "@/lib/sis/studio-api";
import { fromStudioCourse, joinSections, sortSections, type SectionRow } from "@/lib/sis/sections";

/** Studio's course list for the org (what the caller can author) joined with the school's section data. */
export function useSections(options?: { skip?: boolean }) {
  const { org } = useSession();
  const courses = useHomeCoursesQuery({ org }, { skip: options?.skip || !org });
  const metadata = useSisMetadata();
  const runs = useMemo(
    () => [
      ...(courses.data?.courses ?? []).map((c) => fromStudioCourse(c)),
      ...(courses.data?.archived_courses ?? []).map((c) => fromStudioCourse(c, true)),
    ],
    [courses.data],
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
    isLoading: courses.isLoading || metadata.isLoading,
    error: courses.error ?? metadata.error,
    refetch: courses.refetch,
  };
}
