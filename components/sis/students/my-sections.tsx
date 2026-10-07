"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/sis/load-error";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useProgressQuery, useUserEnrollmentsQuery } from "@/lib/sis/lms-api";
import { formatPercent } from "@/lib/sis/format";

/** The LMS enrollments of a user as section rows, each with its grade and progress. */
export function MySections({ username, studentId }: { username: string; studentId?: number }) {
  const t = useTranslations("enrollment");
  const { href } = useSession();
  const enrollments = useUserEnrollmentsQuery(username, { skip: !username });
  const sections = useSections();
  if (enrollments.error) return <LoadError error={enrollments.error} className="m-4" />;
  if (enrollments.isLoading) return <Skeleton className="m-4 h-24 rounded-lg" />;
  const rows = (enrollments.data ?? []).filter((e) => e.is_active);
  if (!rows.length)
    return <p className="text-muted-foreground p-6 text-center text-sm">{t("none")}</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-muted-foreground text-left text-xs">
        <tr className="border-b border-gray-100">
          <th className="px-4 py-2 font-medium">{t("columns.section")}</th>
          <th className="px-4 py-2 font-medium">{t("columns.term")}</th>
          <th className="px-4 py-2 font-medium">{t("columns.grade")}</th>
          <th className="px-4 py-2 font-medium">{t("columns.progress")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((e) => {
          const row = sections.byCourseId.get(e.course_details.course_id);
          return (
            <tr key={e.course_details.course_id}>
              <td className="px-4 py-2">
                <Link
                  href={href(`/courses/${encodeURIComponent(e.course_details.course_id)}`)}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {e.course_details.course_name}
                </Link>
              </td>
              <td className="text-muted-foreground px-4 py-2">{row?.term?.name ?? "—"}</td>
              <ProgressCells courseId={e.course_details.course_id} studentId={studentId} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Grade and completion of one enrollment, from the course-home progress API. */
export function ProgressCells({ courseId, studentId }: { courseId: string; studentId?: number }) {
  const locale = useLocale();
  const t = useTranslations("enrollment");
  const { data, isLoading, error } = useProgressQuery({ courseId, studentId });
  if (isLoading)
    return (
      <td colSpan={2} className="px-4 py-2">
        <Skeleton className="h-4 w-24" />
      </td>
    );
  if (error || !data)
    return (
      <td colSpan={2} className="text-muted-foreground px-4 py-2">
        —
      </td>
    );
  const done = data.completion_summary;
  const total = done ? done.complete_count + done.incomplete_count + done.locked_count : 0;
  return (
    <>
      <td className="px-4 py-2 tabular-nums">
        <span className="font-medium">{data.course_grade.letter_grade ?? "—"}</span>{" "}
        <span className="text-muted-foreground">
          {formatPercent(data.course_grade.percent, locale)}
        </span>
        {data.course_grade.is_passing ? (
          <span className="ml-2 rounded-full bg-emerald-50 px-1.5 py-px text-[11px] text-emerald-700">
            {t("passing")}
          </span>
        ) : null}
      </td>
      <td className="text-muted-foreground px-4 py-2 tabular-nums">
        {total ? formatPercent(done!.complete_count / total, locale) : "—"}
      </td>
    </>
  );
}
