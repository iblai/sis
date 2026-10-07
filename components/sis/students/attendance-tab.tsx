"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceGrid } from "@/components/sis/attendance-grid";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { StatCard } from "@/components/sis/stat-card";
import { StatusPill } from "@/components/sis/status-pill";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useLearnerTimeOverTimeQuery, useLearnerTimeOverallQuery } from "@/lib/sis/api";
import { useUserEnrollmentsQuery } from "@/lib/sis/lms-api";
import { attendanceDays, monthRange, secondsByDay, summarize } from "@/lib/sis/attendance";
import { formatPercent } from "@/lib/sis/format";

/** A student's month: present when the AXD saw time in the course that day. */
export function AttendanceTab({ username }: { username: string }) {
  const t = useTranslations("attendance");
  const locale = useLocale();
  const { tenantKey } = useSession();
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
  });
  const [courseId, setCourseId] = useState("");
  const range = monthRange(month.year, month.month);
  const enrollments = useUserEnrollmentsQuery(username, { skip: !username });
  const sections = useSections();
  const overall = useLearnerTimeOverallQuery(
    { platformKey: tenantKey, username, ...range },
    { skip: !!courseId },
  );
  const perCourse = useLearnerTimeOverTimeQuery(
    { platformKey: tenantKey, username, courseId, ...range },
    { skip: !courseId },
  );
  const query = courseId ? perCourse : overall;
  const section = courseId ? sections.byCourseId.get(courseId) : undefined;
  const days = useMemo(
    () => attendanceDays(secondsByDay(query.data?.data), section?.section, section?.term, range),
    [query.data, section, range],
  );
  const summary = summarize(days);
  const options = (enrollments.data ?? [])
    .filter((e) => e.is_active)
    .map((e) => ({ value: e.course_details.course_id, label: e.course_details.course_name }));
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${range.start}T00:00:00Z`));
  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(Date.UTC(year, m - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusPill label={t("activityBased")} />
          <p className="text-muted-foreground text-xs">{t("activityHint")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SimpleSelect
            value={courseId}
            onChange={setCourseId}
            options={options}
            allowEmpty
            emptyLabel={t("allSections")}
            size="sm"
            className="w-56"
            aria-label={t("section")}
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shift(-1)}
            aria-label={t("previousMonth")}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shift(1)}
            aria-label={t("nextMonth")}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("present")} value={summary.present} tone="success" />
        <StatCard
          label={t("absent")}
          value={summary.absent}
          tone={summary.absent ? "warning" : "default"}
        />
        <StatCard
          label={t("rate")}
          value={formatPercent(summary.rate, locale)}
          info={t("rateInfo")}
        />
      </div>
      <div className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        {query.error ? (
          <LoadError error={query.error} />
        ) : query.isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <AttendanceGrid days={days} />
        )}
      </div>
    </div>
  );
}
