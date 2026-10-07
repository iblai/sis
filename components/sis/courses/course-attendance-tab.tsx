"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { StatusPill } from "@/components/sis/status-pill";
import { useSession } from "@/hooks/use-session";
import { useCourseTimeUsersQuery } from "@/lib/sis/api";
import { useRosterQuery } from "@/lib/sis/lms-api";
import { eachDay, weekRange, weekdayOf } from "@/lib/sis/attendance";
import { isoDay } from "@/lib/sis/dates";
import { formatDay } from "@/lib/sis/format";
import type { Section } from "@/lib/sis/metadata";
import { cn } from "@/lib/utils";

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0);

/** Who had time in the course on each day of the week — one AXD call per day, shared by every row. */
export function CourseAttendanceTab({
  courseId,
  section,
}: {
  courseId: string;
  section?: Section;
}) {
  const t = useTranslations("attendance");
  const locale = useLocale();
  const { href } = useSession();
  const [anchor, setAnchor] = useState(isoDay());
  const range = weekRange(anchor);
  const days = eachDay(range.start, range.end);
  const roster = useRosterQuery(courseId);
  const students = roster.data?.students ?? [];
  const meets = (date: string) => !section?.days?.length || section.days.includes(weekdayOf(date));
  const shift = (delta: number) => {
    const d = new Date(`${anchor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setAnchor(isoDay(d));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusPill label={t("activityBased")} />
          <p className="text-muted-foreground text-xs">{t("activityHint")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shift(-1)}
            aria-label={t("previousWeek")}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm font-medium">
            {formatDay(range.start, locale)} – {formatDay(range.end, locale)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shift(1)}
            aria-label={t("nextWeek")}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {roster.error ? (
          <LoadError error={roster.error} />
        ) : roster.isLoading ? (
          <Skeleton className="m-4 h-32 rounded-lg" />
        ) : students.length === 0 ? (
          <EmptyState title={t("noStudents")} className="border-0" />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 font-medium">{t("student")}</th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={cn(
                      "px-2 py-2 text-center font-medium",
                      !meets(d) && "text-gray-300",
                    )}
                  >
                    {t(`weekday.${weekdayOf(d)}`)}
                    <span className="block text-[10px] font-normal">{d.slice(5)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-1.5">
                    <Link
                      href={href(`/students/${encodeURIComponent(s.username)}`)}
                      className="hover:underline"
                    >
                      {s.name || s.username}
                    </Link>
                  </td>
                  {days.map((d) => (
                    <PresenceCell
                      key={d}
                      courseId={courseId}
                      date={d}
                      username={s.username}
                      schoolDay={meets(d)}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="text-muted-foreground text-xs">
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2">{t("presentCount")}</td>
                {days.map((d) => (
                  <PresentCount key={d} courseId={courseId} date={d} />
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function usePresence(courseId: string, date: string) {
  const { tenantKey } = useSession();
  const { data, isLoading, error } = useCourseTimeUsersQuery({
    platformKey: tenantKey,
    courseId,
    start_date: date,
    end_date: date,
    length: 500,
  });
  const present = new Set(
    ((data?.data ?? []) as Record<string, unknown>[])
      .filter((r) => num(r.time_spent ?? r.total_time ?? r.time ?? r.value ?? 0) > 0)
      .map((r) => String(r.username ?? r.user ?? "")),
  );
  return { present, isLoading, error };
}

function PresenceCell({
  courseId,
  date,
  username,
  schoolDay,
}: {
  courseId: string;
  date: string;
  username: string;
  schoolDay: boolean;
}) {
  const t = useTranslations("attendance");
  const { present, isLoading, error } = usePresence(courseId, date);
  if (isLoading)
    return (
      <td className="px-2 py-1.5 text-center">
        <Skeleton className="mx-auto h-4 w-4 rounded-full" />
      </td>
    );
  if (error) return <td className="px-2 py-1.5 text-center text-rose-600">!</td>;
  const here = present.has(username);
  return (
    <td className="px-2 py-1.5 text-center">
      <span
        className={cn(
          "inline-block size-2.5 rounded-full",
          here ? "bg-emerald-500" : schoolDay ? "bg-rose-300" : "bg-gray-200",
        )}
        aria-hidden
      />
      <span className="sr-only">
        {t(`status.${here ? "present" : schoolDay ? "absent" : "no-school"}`)}
      </span>
    </td>
  );
}

function PresentCount({ courseId, date }: { courseId: string; date: string }) {
  const { present } = usePresence(courseId, date);
  return <td className="px-2 py-2 text-center tabular-nums">{present.size}</td>;
}
