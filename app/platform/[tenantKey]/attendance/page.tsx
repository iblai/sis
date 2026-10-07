"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarCheck2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/sis/page-header";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { StatusPill } from "@/components/sis/status-pill";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useCourseTimeUsersQuery } from "@/lib/sis/api";
import { useRosterQuery } from "@/lib/sis/lms-api";
import { weekdayOf } from "@/lib/sis/attendance";
import { isoDay } from "@/lib/sis/dates";
import { currentTerm } from "@/lib/sis/metadata";
import { formatDay } from "@/lib/sis/format";
import type { SectionRow } from "@/lib/sis/sections";

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0);

/** The day view: every section of the term with who had time in it that day. */
export default function AttendancePage() {
  const t = useTranslations("attendance");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { href } = useSession();
  const sections = useSections();
  const [date, setDate] = useState(isoDay());
  const [termId, setTermId] = useState<string | null>(null);
  useBreadcrumbs([{ label: tn("attendance"), href: href("/attendance") }]);
  const terms = sections.meta?.terms ?? [];
  const selected = termId ?? currentTerm(terms, date)?.id ?? "";
  const rows = sections.rows.filter((r) => !selected || r.section?.termId === selected);

  return (
    <>
      <PageHeader
        icon={<CalendarCheck2 />}
        title={tn("attendance")}
        description={t("dayDescription")}
        toolbar={
          <>
            <Input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-8 w-44 text-sm"
              aria-label={t("date")}
            />
            {terms.length ? (
              <SimpleSelect
                value={selected}
                onChange={(v) => setTermId(v)}
                options={terms.map((x) => ({ value: x.id, label: x.name }))}
                allowEmpty
                emptyLabel={t("allTerms")}
                size="sm"
                className="w-44"
                aria-label={t("term")}
              />
            ) : null}
            <StatusPill label={t("activityBased")} />
            <span className="text-muted-foreground text-xs">{t("activityHint")}</span>
          </>
        }
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          {formatDay(date, locale)} · {t(`weekday.${weekdayOf(date)}`)}
        </h2>
        {sections.error ? (
          <LoadError error={sections.error} />
        ) : sections.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : rows.length === 0 ? (
          <EmptyState icon={<CalendarCheck2 strokeWidth={1.75} />} title={t("noSections")} />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <SectionDay key={r.course.id} row={r} date={date} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SectionDay({ row, date }: { row: SectionRow; date: string }) {
  const t = useTranslations("attendance");
  const { tenantKey, href } = useSession();
  const [open, setOpen] = useState(false);
  const meets = !row.section?.days?.length || row.section.days.includes(weekdayOf(date));
  const time = useCourseTimeUsersQuery({
    platformKey: tenantKey,
    courseId: row.course.id,
    start_date: date,
    end_date: date,
    length: 500,
  });
  const roster = useRosterQuery(row.course.id, { skip: !open });
  const present = new Set(
    ((time.data?.data ?? []) as Record<string, unknown>[])
      .filter((x) => num(x.time_spent ?? x.total_time ?? x.time ?? x.value ?? 0) > 0)
      .map((x) => String(x.username ?? x.user ?? "")),
  );
  return (
    <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="font-medium text-gray-900">{row.course.name}</span>
          <span className="text-muted-foreground block text-xs">
            {[row.period?.name, row.room?.name, row.term?.name].filter(Boolean).join(" · ") ||
              row.course.run}
          </span>
        </span>
        {!meets ? <StatusPill label={t("status.no-school")} /> : null}
        {time.isLoading ? (
          <Skeleton className="h-4 w-20" />
        ) : time.error ? (
          <span className="text-xs text-rose-600">{t("unavailable")}</span>
        ) : (
          <span className="text-xs text-emerald-700">
            {t("presentCountN", { count: present.size })}
          </span>
        )}
        <ChevronDown
          className={`text-muted-foreground size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-4 py-3">
          {roster.error ? (
            <LoadError error={roster.error} />
          ) : roster.isLoading ? (
            <Skeleton className="h-16" />
          ) : (
            <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {(roster.data?.students ?? []).map((s) => {
                const here = present.has(s.username);
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <span
                      className={`inline-block size-2 rounded-full ${here ? "bg-emerald-500" : meets ? "bg-rose-300" : "bg-gray-200"}`}
                      aria-hidden
                    />
                    <Link
                      href={href(`/students/${encodeURIComponent(s.username)}`)}
                      className="truncate hover:underline"
                    >
                      {s.name || s.username}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
