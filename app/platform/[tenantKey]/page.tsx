"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  Award,
  BookOpen,
  GraduationCap,
  Home,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/sis/page-header";
import { SimpleSelect } from "@/components/sis/simple-select";
import { StatCard } from "@/components/sis/stat-card";
import { Panel } from "@/components/sis/dashboard/panel";
import { LoadError } from "@/components/sis/load-error";
import { OnboardingCard } from "@/components/sis/dashboard/onboarding-card";
import { OverTimeChart } from "@/components/sis/dashboard/over-time-chart";
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { MySections } from "@/components/sis/students/my-sections";
import { useSession } from "@/hooks/use-session";
import { useSections } from "@/hooks/use-sections";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import {
  useActiveUsersQuery,
  useAverageGradeQuery,
  useEnrollmentsOverTimeQuery,
  useLearnersOverviewQuery,
  useMostActiveCoursesQuery,
  usePlatformUsersQuery,
  useUsersCountQuery,
} from "@/lib/sis/api";
import { lastDays } from "@/lib/sis/dates";
import { formatDuration, formatPercent } from "@/lib/sis/format";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

export default function HomePage() {
  const t = useTranslations("dashboard");
  const tn = useTranslations("nav");
  const { displayName, isAdmin } = useSession();
  return (
    <>
      <PageHeader
        icon={<Home />}
        title={tn("home")}
        description={displayName ? t("welcomeNamed", { name: displayName }) : t("welcome")}
      />
      {isAdmin ? <AdminDashboard /> : <StudentHome />}
    </>
  );
}

/** Registered and active learners, enrollments, completions, average grade, the most active courses. */
function AdminDashboard() {
  const t = useTranslations("dashboard");
  const ts = useTranslations("students");
  const locale = useLocale();
  const { tenantKey, href } = useSession();
  const [period, setPeriod] = useState<Period>(30);
  const range = lastDays(period);
  const metadata = useSisMetadata();
  const sections = useSections();
  const directory = usePlatformUsersQuery({ platformKey: tenantKey, page_size: 1 });
  const registered = useUsersCountQuery({ platformKey: tenantKey, ...range });
  const active = useActiveUsersQuery({ platformKey: tenantKey, ...range });
  const enrollments = useEnrollmentsOverTimeQuery({ platformKey: tenantKey, ...range });
  const grade = useAverageGradeQuery({ platformKey: tenantKey });
  const mostActive = useMostActiveCoursesQuery({ platformKey: tenantKey, ...range, length: 6 });
  const learners = useLearnersOverviewQuery({ platformKey: tenantKey, length: 8 });

  const memberCount = directory.data?.count ?? null;
  const loading = metadata.isLoading || sections.isLoading;
  const mostActiveRows = (mostActive.data?.data ?? []) as Record<string, unknown>[];
  const learnerRows = (learners.data?.data ?? []) as Record<string, unknown>[];
  const avg = num(grade.data?.data) ?? num(rec(grade.data?.data).average);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
        {metadata.error ? (
          <LoadError error={metadata.error} />
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {metadata.meta ? null : <OnboardingCard />}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">{t("overview")}</h2>
              <div className="flex items-center gap-2">
                <SimpleSelect
                  value={String(period)}
                  onChange={(v) => setPeriod(Number(v) as Period)}
                  options={PERIODS.map((p) => ({
                    value: String(p),
                    label: t("period", { days: p }),
                  }))}
                  size="sm"
                  className="w-36"
                  aria-label={t("periodLabel")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={href("/students?invite=1")} />}
                >
                  <UserPlus data-icon="inline-start" /> {ts("invite")}
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t("stats.members.label")}
                value={memberCount ?? "—"}
                info={t("stats.members.info")}
                icon={<Users />}
                tone="brand"
              />
              <StatCard
                label={t("stats.courses.label")}
                value={sections.rows.length}
                hint={t("stats.courses.hint", { count: metadata.meta?.terms.length ?? 0 })}
                info={t("stats.courses.info")}
                icon={<BookOpen />}
              />
              <StatCard
                label={t("stats.active.label")}
                value={num(active.data?.total) ?? "—"}
                hint={t("stats.active.hint", { count: num(registered.data?.total) ?? 0 })}
                info={t("stats.active.info")}
                icon={<Activity />}
                tone="success"
              />
              <StatCard
                label={t("stats.grade.label")}
                value={avg === null ? "—" : formatPercent(avg > 1 ? avg / 100 : avg, locale)}
                hint={t("stats.grade.hint")}
                info={t("stats.grade.info")}
                icon={<GraduationCap />}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title={t("panels.active.title")}
                info={t("panels.active.info")}
                description={t("panels.cached")}
              >
                {active.error ? (
                  <LoadError error={active.error} />
                ) : (
                  <OverTimeChart series={active.data} label={t("panels.active.series")} />
                )}
              </Panel>
              <Panel
                title={t("panels.enrollments.title")}
                info={t("panels.enrollments.info")}
                description={t("panels.cached")}
              >
                {enrollments.error ? (
                  <LoadError error={enrollments.error} />
                ) : (
                  <OverTimeChart
                    series={enrollments.data}
                    label={t("panels.enrollments.series")}
                    color="#00b0ef"
                  />
                )}
              </Panel>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <Panel
                title={t("panels.mostActive.title")}
                info={t("panels.mostActive.info")}
                href={href("/courses")}
                bodyClassName="p-0"
              >
                {mostActive.error ? (
                  <LoadError error={mostActive.error} className="m-4" />
                ) : mostActiveRows.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">
                    {t("panels.empty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {mostActiveRows.map((row, i) => {
                      const id = String(row.course_id ?? row.id ?? i);
                      const name = String(row.course_name ?? row.name ?? id);
                      const seconds = num(row.time_spent) ?? num(row.total_time) ?? num(row.value);
                      return (
                        <li key={id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <Trophy className="size-4 shrink-0 text-amber-500" />
                          <Link
                            href={href(`/courses/${encodeURIComponent(id)}`)}
                            className="min-w-0 flex-1 truncate hover:underline"
                          >
                            {name}
                          </Link>
                          <span className="text-muted-foreground text-xs">
                            {formatDuration(seconds)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
              <Panel
                title={t("panels.learners.title")}
                info={t("panels.learners.info")}
                href={href("/students")}
                bodyClassName="p-0"
              >
                {learners.error ? (
                  <LoadError error={learners.error} className="m-4" />
                ) : learnerRows.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">
                    {t("panels.empty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {learnerRows.map((row, i) => {
                      const u = String(row.username ?? row.user ?? i);
                      const name = String(row.full_name ?? row.name ?? u);
                      return (
                        <li key={u} className="flex items-center gap-3 px-4 py-2 text-sm">
                          <EntityAvatar name={name} seed={u} size="sm" />
                          <Link
                            href={href(`/students/${encodeURIComponent(u)}`)}
                            className="min-w-0 flex-1 truncate hover:underline"
                          >
                            {name}
                          </Link>
                          <span className="text-muted-foreground hidden truncate text-xs sm:inline">
                            {String(row.email ?? "")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** A student's home: their sections with grade and progress, and their credentials. */
function StudentHome() {
  const t = useTranslations("dashboard");
  const { username, href } = useSession();
  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <Panel title={t("mySections.title")} info={t("mySections.info")} bodyClassName="p-0">
          <MySections username={username} />
        </Panel>
        <Panel
          title={t("myCredentials.title")}
          href={href(`/students/${encodeURIComponent(username)}?tab=credentials`)}
          linkLabel={t("myCredentials.link")}
        >
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Award className="size-4" /> {t("myCredentials.body")}
          </p>
        </Panel>
      </div>
    </div>
  );
}
