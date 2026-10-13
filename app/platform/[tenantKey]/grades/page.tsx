"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FileChartColumn, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/sis/page-header";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { WhereTip } from "@/components/sis/where-tip";
import { PageGate, useGateLoading } from "@/components/sis/page-gate";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useCourseGradingAverageQuery,
  useCreateReportMutation,
  useUserGroupQuery,
} from "@/lib/sis/api";
import { useProgressQuery } from "@/lib/sis/lms-api";
import { isoDay } from "@/lib/sis/dates";
import { formatPercent } from "@/lib/sis/format";
import { gpa } from "@/lib/sis/grades";
import { currentTerm } from "@/lib/sis/metadata";
import type { SectionRow } from "@/lib/sis/sections";
import type { Progress } from "@/lib/sis/types";

/** Per-section averages (AXD) and a term report per grade level (LMS progress per student). */
export default function GradesPage() {
  const t = useTranslations("grades.page");
  const tn = useTranslations("nav");
  const { tenantKey, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const sections = useSections();
  const terms = sections.meta?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const selected = termId ?? currentTerm(terms, isoDay())?.id ?? "";
  const [levelId, setLevelId] = useState("");
  const [createReport, reportState] = useCreateReportMutation();
  useBreadcrumbs([{ label: tn("grades"), href: href("/grades") }]);
  const rows = sections.rows.filter((r) => !selected || r.section?.termId === selected);
  const level = sections.meta?.gradeLevels.find((g) => g.id === levelId);

  const runReport = async () => {
    try {
      await createReport({ platformKey: tenantKey, report_name: "course-grade-report" }).unwrap();
      toast.success(t("reportStarted"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <PageGate loading={sections.isLoading}>
      <PageHeader
        where="grades"
        icon={<GraduationCap />}
        title={tn("grades")}
        description={t("description")}
        actions={
          isLiveAdmin ? (
            <Button
              variant="outline"
              size="sm"
              disabled={reportState.isLoading}
              onClick={() => void runReport()}
            >
              {reportState.isLoading ? (
                <Spinner size="sm" className="size-4 text-current" />
              ) : (
                <FileChartColumn data-icon="inline-start" />
              )}
              {t("runReport")}
            </Button>
          ) : null
        }
        toolbar={
          <>
            {terms.length ? (
              <SimpleSelect
                value={selected}
                onChange={(v) => setTermId(v)}
                options={terms.map((x) => ({ value: x.id, label: x.name }))}
                allowEmpty
                emptyLabel={t("allTerms")}
                size="sm"
                className="w-[calc(50%-0.25rem)] sm:w-44"
                aria-label={t("term")}
              />
            ) : null}
            {sections.meta?.gradeLevels.length ? (
              <SimpleSelect
                value={levelId}
                onChange={setLevelId}
                options={sections.meta.gradeLevels.map((g) => ({ value: g.id, label: g.name }))}
                allowEmpty
                emptyLabel={t("pickLevel")}
                size="sm"
                className="w-[calc(50%-0.25rem)] sm:w-44"
                aria-label={t("level")}
              />
            ) : null}
          </>
        }
      />
      <div className="flex-1 space-y-4 overflow-auto p-4 md:p-6">
        <section className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
          <h2 className="flex items-center gap-1 border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900">
            <span>{t("sections")}</span>
            <WhereTip k="gradeAverages" />
          </h2>
          {sections.error ? (
            <LoadError error={sections.error} />
          ) : rows.length === 0 ? (
            <EmptyState title={t("noSections")} className="border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.section")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("columns.term")}</TableHead>
                  <TableHead>{t("columns.average")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <SectionAverageRow key={r.course.id} row={r} />
                ))}
              </TableBody>
            </Table>
          )}
        </section>
        {level?.groupId && selected ? (
          <TermReport groupId={level.groupId} termId={selected} rows={rows} />
        ) : (
          <p className="text-muted-foreground text-xs">{t("termReportHint")}</p>
        )}
      </div>
    </PageGate>
  );
}

function SectionAverageRow({ row }: { row: SectionRow }) {
  const t = useTranslations("grades.page");
  const locale = useLocale();
  const { tenantKey, href } = useSession();
  const avg = useCourseGradingAverageQuery({ platformKey: tenantKey, courseId: row.course.id });
  useGateLoading(avg.isLoading);
  const value = typeof avg.data?.data === "number" ? avg.data.data : null;
  return (
    <TableRow>
      <TableCell>
        <Link
          href={href(`/courses/${encodeURIComponent(row.course.id)}?tab=gradebook`)}
          className="font-medium text-gray-900 hover:underline"
        >
          {row.course.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground hidden md:table-cell">
        {row.term?.name ?? "—"}
      </TableCell>
      <TableCell className="tabular-nums">
        {avg.isLoading ? (
          <Skeleton className="h-4 w-12" />
        ) : value === null ? (
          "—"
        ) : (
          formatPercent(value > 1 ? value / 100 : value, locale)
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-right text-xs">{t("cached")}</TableCell>
    </TableRow>
  );
}

/** Every student of the grade level's cohort group: a letter per section of the term and the GPA. */
function TermReport({
  groupId,
  termId,
  rows,
}: {
  groupId: number;
  termId: string;
  rows: SectionRow[];
}) {
  const t = useTranslations("grades.page");
  const { href } = useSession();
  const sections = useSections();
  const group = useUserGroupQuery(groupId);
  useGateLoading(group.isLoading);
  const inTerm = rows.filter((r) => r.section?.termId === termId);
  const scale = sections.meta?.gpaScale ?? {};
  if (group.error) return <LoadError error={group.error} />;
  if (group.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  const users = group.data?.users ?? [];
  return (
    <section className="overflow-auto rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
      <h2 className="flex items-center gap-1 border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900">
        <span>{t("termReport", { group: group.data?.name ?? "", count: users.length })}</span>
        <WhereTip k="termReport" />
      </h2>
      {users.length === 0 ? (
        <EmptyState title={t("noMembers")} className="border-0" />
      ) : (
        <table className="min-w-full text-sm">
          <thead className="text-muted-foreground text-left text-[11px] font-semibold tracking-wide uppercase">
            <tr className="border-b border-gray-100">
              <th className="sticky left-0 z-10 bg-white px-3 py-2">{t("columns.student")}</th>
              {inTerm.map((r) => (
                <th key={r.course.id} className="px-3 py-2" title={r.course.name}>
                  <div className="max-w-32 truncate">{r.course.number}</div>
                </th>
              ))}
              <th className="px-3 py-2">{t("columns.gpa")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <StudentTermRow
                key={u.id}
                username={u.username}
                userId={u.id}
                name={u.username}
                sections={inTerm}
                scale={scale}
                href={href(`/students/${encodeURIComponent(u.username)}?tab=grades`)}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function StudentTermRow({
  username,
  userId,
  name,
  sections,
  scale,
  href,
}: {
  username: string;
  userId: number;
  name: string;
  sections: SectionRow[];
  scale: Record<string, number>;
  href: string;
}) {
  const [letters, setLetters] = useState<Record<string, string | null>>({});
  const onLetter = useCallback(
    (courseId: string, letter: string | null) =>
      setLetters((prev) => (prev[courseId] === letter ? prev : { ...prev, [courseId]: letter })),
    [],
  );
  const result = gpa(
    sections.map((s) => ({ letter: letters[s.course.id], credits: s.section?.credits })),
    scale,
  );
  return (
    <tr>
      <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
        <Link href={href} className="font-medium text-gray-900 hover:underline">
          {name}
        </Link>
        <span className="text-muted-foreground block text-xs">{username}</span>
      </td>
      {sections.map((s) => (
        <LetterCell
          key={s.course.id}
          courseId={s.course.id}
          studentId={userId}
          onLetter={onLetter}
        />
      ))}
      <td className="px-3 py-1.5 font-medium tabular-nums">
        {result.gpa === null ? "—" : result.gpa.toFixed(2)}
      </td>
    </tr>
  );
}

function LetterCell({
  courseId,
  studentId,
  onLetter,
}: {
  courseId: string;
  studentId: number;
  onLetter: (c: string, l: string | null) => void;
}) {
  const locale = useLocale();
  const { data, isLoading, error } = useProgressQuery({ courseId, studentId });
  useGateLoading(isLoading);
  useLetterEffect(data, courseId, onLetter);
  if (isLoading)
    return (
      <td className="px-3 py-1.5">
        <Skeleton className="h-4 w-8" />
      </td>
    );
  if (error || !data) return <td className="text-muted-foreground px-3 py-1.5">—</td>;
  return (
    <td className="px-3 py-1.5 tabular-nums">
      <span className="font-medium">{data.course_grade.letter_grade ?? "—"}</span>{" "}
      <span className="text-muted-foreground text-xs">
        {formatPercent(data.course_grade.percent, locale)}
      </span>
    </td>
  );
}

function useLetterEffect(
  data: Progress | undefined,
  courseId: string,
  onLetter: (c: string, l: string | null) => void,
) {
  useEffect(() => {
    if (data) onLetter(courseId, data.course_grade.letter_grade ?? null);
  }, [data, courseId, onLetter]);
}
