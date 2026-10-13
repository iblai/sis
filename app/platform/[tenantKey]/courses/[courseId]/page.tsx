"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, ExternalLink, GraduationCap, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { PageHeader } from "@/components/sis/page-header";
import { LoadingScreen } from "@/components/loading-screen";
import { LoadError } from "@/components/sis/load-error";
import { FieldRow } from "@/components/sis/inline-field";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { RosterTab } from "@/components/sis/courses/roster-tab";
import { GradebookTab } from "@/components/sis/courses/gradebook-tab";
import { SettingsTab } from "@/components/sis/courses/settings-tab";
import { PageGate, useGateLoading } from "@/components/sis/page-gate";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useCourseMetadataQuery, useProgressQuery } from "@/lib/sis/lms-api";
import { courseRunParts } from "@/lib/sis/sections";
import { authSpaLoginUrl } from "@/lib/iblai/auth-redirect";
import config from "@/lib/iblai/config";
import { formatDate, formatPercent } from "@/lib/sis/format";

const TABS = ["roster", "gradebook", "settings"] as const;
type Tab = (typeof TABS)[number];

export default function CoursePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CourseView />
    </Suspense>
  );
}

/** One section: roster and gradebook from the LMS, settings on Studio and the metadata. */
function CourseView() {
  const t = useTranslations("courses");
  const tn = useTranslations("nav");
  const params = useParams<{ courseId: string }>();
  const courseId = decodeURIComponent(params.courseId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { href, org, tenantKey } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const sections = useSections({ skip: !isLiveAdmin });
  const row = sections.byCourseId.get(courseId);
  const meta = useCourseMetadataQuery(courseId, { skip: !!row });
  const parts = courseRunParts(courseId);
  const info =
    row?.course ??
    (meta.data
      ? { name: meta.data.title, number: meta.data.number ?? parts?.number, run: parts?.run }
      : undefined);
  const name = info?.name ?? courseId;
  const base = href(`/courses/${encodeURIComponent(courseId)}`);
  useBreadcrumbs([
    { label: tn("courses"), href: href("/courses") },
    { label: name, href: base },
  ]);
  const tab = useMemo<Tab>(() => {
    const raw = searchParams.get("tab");
    return TABS.includes(raw as Tab) ? (raw as Tab) : "roster";
  }, [searchParams]);
  const setTab = useCallback(
    (value: Tab) => router.replace(value === "roster" ? base : `${base}?tab=${value}`),
    [router, base],
  );
  const icons = {
    roster: Users,
    gradebook: GraduationCap,
    settings: Settings,
  } as const;

  return (
    <PageGate loading={sections.isLoading || meta.isLoading}>
      <PageHeader
        where="course"
        icon={<BookOpen />}
        title={name}
        description={
          [info?.number, info?.run, row?.term?.name].filter(Boolean).join(" · ") || courseId
        }
        actions={
          <>
            <Button
              size="sm"
              className="ibl-button-primary"
              render={
                <a
                  // Through the Auth SPA, so the learner app ("skills" to it) opens signed in.
                  href={authSpaLoginUrl(
                    "skills",
                    `${config.lmsAppUrl()}/platform/${encodeURIComponent(org)}/courses/${courseId}`,
                    tenantKey,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("openInLms")}
                />
              }
            >
              {t("openInLms")} <ExternalLink data-icon="inline-end" />
            </Button>
            {isLiveAdmin ? (
              <a
                href={`${config.legacyLmsUrl()}/courses/${courseId}/instructor`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-gray-900"
              >
                {t("instructorDashboard")} <ExternalLink className="size-3" />
              </a>
            ) : null}
          </>
        }
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {!isLiveAdmin ? (
          <StudentCourseView courseId={courseId} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
            <TabsList
              variant="line"
              className="flex-wrap border-b border-gray-200 pb-1 group-data-horizontal/tabs:h-auto"
            >
              {TABS.map((key) => {
                const Icon = icons[key];
                return (
                  <TabsTrigger key={key} value={key}>
                    <Icon strokeWidth={1.75} /> {t(`tabs.${key}`)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="roster">
              <PageGate inline>
                <RosterTab courseId={courseId} />
              </PageGate>
            </TabsContent>
            <TabsContent value="gradebook">
              <PageGate inline>
                <GradebookTab courseId={courseId} />
              </PageGate>
            </TabsContent>
            <TabsContent value="settings">
              <PageGate inline>
                <SettingsTab courseId={courseId} row={row} />
              </PageGate>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageGate>
  );
}

/** A student's own standing in the section: grade, completion, graded subsections. */
function StudentCourseView({ courseId }: { courseId: string }) {
  const t = useTranslations("grades");
  const locale = useLocale();
  const { data, isLoading, error } = useProgressQuery({ courseId });
  useGateLoading(isLoading);
  if (error) return <LoadError error={error} />;
  if (isLoading || !data) return <Skeleton className="h-48 rounded-xl" />;
  const done = data.completion_summary;
  const total = done ? done.complete_count + done.incomplete_count + done.locked_count : 0;
  const graded = data.section_scores.flatMap((s) =>
    s.subsections.filter((x) => x.has_graded_assignment),
  );
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">{t("myStanding")}</h2>
        <dl className="mt-2">
          <FieldRow label={t("columns.percent")}>
            {formatPercent(data.course_grade.percent, locale)}
          </FieldRow>
          <FieldRow label={t("columns.letter")}>{data.course_grade.letter_grade ?? "—"}</FieldRow>
          <FieldRow label={t("columns.status")}>
            {data.course_grade.is_passing ? t("passing") : t("notPassing")}
          </FieldRow>
          <FieldRow label={t("completion")}>
            {total ? formatPercent(done!.complete_count / total, locale) : "—"}
          </FieldRow>
          {data.certificate_data?.cert_status ? (
            <FieldRow label={t("certificate")}>
              {data.certificate_data.download_url || data.certificate_data.cert_web_view_url ? (
                <a
                  href={
                    data.certificate_data.download_url ??
                    data.certificate_data.cert_web_view_url ??
                    "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0058cc] hover:underline"
                >
                  {data.certificate_data.cert_status}
                </a>
              ) : (
                data.certificate_data.cert_status
              )}
            </FieldRow>
          ) : null}
          {data.end ? <FieldRow label={t("ends")}>{formatDate(data.end, locale)}</FieldRow> : null}
        </dl>
      </section>
      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">{t("gradedWork")}</h2>
        {graded.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">{t("noGradedWork")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {graded.map((x) => (
              <li key={x.block_key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{x.display_name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {x.num_points_earned}/{x.num_points_possible}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
