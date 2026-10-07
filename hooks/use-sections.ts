"use client";

import { useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useCoursesQuery } from "@/lib/sis/lms-api";
import { joinSections, sortSections, type SectionRow } from "@/lib/sis/sections";

/** The platform's course runs joined with the school's section data. */
export function useSections(options?: { skip?: boolean }) {
  const { org, username } = useSession();
  const courses = useCoursesQuery({ org, username }, { skip: options?.skip || !username });
  const metadata = useSisMetadata();
  const rows = useMemo<SectionRow[]>(
    () => sortSections(joinSections(courses.data?.results ?? [], metadata.meta)),
    [courses.data, metadata.meta],
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
