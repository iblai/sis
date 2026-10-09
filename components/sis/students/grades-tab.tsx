"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { StatCard } from "@/components/sis/stat-card";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useProgressQuery, useUserEnrollmentsQuery } from "@/lib/sis/lms-api";
import { formatPercent } from "@/lib/sis/format";
import { gpa } from "@/lib/sis/grades";
import { currentTerm } from "@/lib/sis/metadata";
import { isoDay } from "@/lib/sis/dates";
import type { Progress } from "@/lib/sis/types";

/** Per-section grades from the LMS progress API, a term filter and the term's GPA from the school's scale. */
export function GradesTab({ username, studentId }: { username: string; studentId?: number }) {
  const t = useTranslations("grades");
  const locale = useLocale();
  const { href } = useSession();
  const enrollments = useUserEnrollmentsQuery(username, { skip: !username });
  const sections = useSections();
  const terms = sections.meta?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const selected = termId ?? currentTerm(terms, isoDay())?.id ?? "";
  const [letters, setLetters] = useState<Record<string, string | null>>({});
  const onGrade = useCallback(
    (courseId: string, letter: string | null) =>
      setLetters((prev) => (prev[courseId] === letter ? prev : { ...prev, [courseId]: letter })),
    [],
  );

  const rows = useMemo(() => {
    const active = (enrollments.data ?? []).filter((e) => e.is_active);
    return active
      .map((e) => ({ enrollment: e, row: sections.byCourseId.get(e.course_details.course_id) }))
      .filter(({ row }) => !selected || row?.section?.termId === selected);
  }, [enrollments.data, sections.byCourseId, selected]);

  const result = gpa(
    rows.map(({ enrollment, row }) => ({
      letter: letters[enrollment.course_details.course_id],
      credits: row?.section?.credits,
    })),
    sections.meta?.gpaScale ?? {},
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        {terms.length ? (
          <SimpleSelect
            value={selected}
            onChange={(v) => setTermId(v)}
            options={terms.map((x) => ({ value: x.id, label: x.name }))}
            allowEmpty
            emptyLabel={t("allTerms")}
            size="sm"
            className="w-48"
            aria-label={t("term")}
          />
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("gpa.label")}
          value={result.gpa === null ? "—" : result.gpa.toFixed(2)}
          hint={t("gpa.hint", { credits: result.credits, excluded: result.excluded })}
          info={t("gpa.info")}
          icon={<GraduationCap />}
          tone="brand"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {enrollments.error ? (
          <LoadError error={enrollments.error} />
        ) : enrollments.isLoading ? (
          <Skeleton className="m-4 h-24 rounded-lg" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<GraduationCap strokeWidth={1.75} />}
            title={t("none")}
            className="border-0"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.section")}</TableHead>
                <TableHead>{t("columns.credits")}</TableHead>
                <TableHead>{t("columns.percent")}</TableHead>
                <TableHead>{t("columns.letter")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ enrollment, row }) => (
                <GradeRow
                  key={enrollment.course_details.course_id}
                  courseId={enrollment.course_details.course_id}
                  name={enrollment.course_details.course_name}
                  href={href(`/courses/${encodeURIComponent(enrollment.course_details.course_id)}`)}
                  credits={row?.section?.credits}
                  studentId={studentId}
                  locale={locale}
                  onGrade={onGrade}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function GradeRow({
  courseId,
  name,
  href,
  credits,
  studentId,
  locale,
  onGrade,
}: {
  courseId: string;
  name: string;
  href: string;
  credits?: number;
  studentId?: number;
  locale: string;
  onGrade: (courseId: string, letter: string | null) => void;
}) {
  const t = useTranslations("grades");
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useProgressQuery({ courseId, studentId });
  const letter = data?.course_grade.letter_grade ?? null;
  useEffect(() => {
    if (data) onGrade(courseId, letter);
  }, [data, courseId, letter, onGrade]);
  return (
    <>
      <TableRow>
        <TableCell>
          <Link href={href} className="font-medium text-gray-900 hover:underline">
            {name}
          </Link>
        </TableCell>
        <TableCell className="text-muted-foreground tabular-nums">{credits ?? "—"}</TableCell>
        {isLoading ? (
          <TableCell colSpan={3}>
            <Skeleton className="h-4 w-32" />
          </TableCell>
        ) : error || !data ? (
          <TableCell colSpan={3} className="text-muted-foreground">
            {t("unavailable")}
          </TableCell>
        ) : (
          <>
            <TableCell className="tabular-nums">
              {formatPercent(data.course_grade.percent, locale)}
            </TableCell>
            <TableCell className="font-medium">{letter ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">
              {data.course_grade.is_passing ? t("passing") : t("notPassing")}
            </TableCell>
          </>
        )}
        <TableCell className="text-right">
          {data?.section_scores?.length ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-gray-900"
              aria-expanded={open}
            >
              {t("details")}{" "}
              <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </TableCell>
      </TableRow>
      {open && data ? (
        <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
          <TableCell colSpan={6} className="whitespace-normal">
            <SectionScores progress={data} locale={locale} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function SectionScores({ progress, locale }: { progress: Progress; locale: string }) {
  const graded = progress.section_scores.flatMap((s) =>
    s.subsections
      .filter((x) => x.has_graded_assignment)
      .map((x) => ({ chapter: s.display_name, ...x })),
  );
  if (!graded.length) return null;
  return (
    <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
      {graded.map((x) => (
        <li key={x.block_key} className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate">
            <span className="text-muted-foreground">{x.chapter} · </span>
            {x.display_name}
            {x.assignment_type ? (
              <span className="text-muted-foreground"> ({x.assignment_type})</span>
            ) : null}
          </span>
          <span className="tabular-nums">
            {x.num_points_earned}/{x.num_points_possible} ·{" "}
            {formatPercent(x.percent_graded, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}
