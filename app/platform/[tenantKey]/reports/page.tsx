"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileChartColumn, Play } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/sis/page-header";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { StatusPill } from "@/components/sis/status-pill";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useCreateReportMutation,
  useDownloadReportMutation,
  useReportDetailQuery,
  useReportsQuery,
} from "@/lib/sis/api";
import {
  useInstructorReportsQuery,
  useInstructorTasksQuery,
  useRosterCsvMutation,
} from "@/lib/sis/lms-api";
import { downloadFile } from "@/lib/sis/download";
import { formatDateTime } from "@/lib/sis/format";
import type { ReportInfo } from "@/lib/sis/types";

/** The platform's reports (DM): run, poll, download; and a section's instructor reports (LMS). */
export default function ReportsPage() {
  const t = useTranslations("reports");
  const tn = useTranslations("nav");
  const { tenantKey, href } = useSession();
  const reports = useReportsQuery(tenantKey);
  useBreadcrumbs([{ label: tn("reports"), href: href("/reports") }]);
  return (
    <>
      <PageHeader icon={<FileChartColumn />} title={tn("reports")} description={t("description")} />
      <div className="flex-1 space-y-6 overflow-auto p-4 md:p-6">
        {reports.error ? (
          <LoadError error={reports.error} />
        ) : reports.isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (reports.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<FileChartColumn strokeWidth={1.75} />} title={t("none")} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {reports.data!.map((r) => (
              <ReportCard key={r.report_name} report={r} />
            ))}
          </div>
        )}
        <SectionReports />
      </div>
    </>
  );
}

function ReportCard({ report }: { report: ReportInfo }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const { tenantKey } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const [dates, setDates] = useState({ start: "", end: "" });
  const [create, createState] = useCreateReportMutation();
  const [download, downloadState] = useDownloadReportMutation();
  const running = report.status?.state === "pending" || report.status?.state === "running";
  const detail = useReportDetailQuery(
    { platformKey: tenantKey, report_name: report.report_name },
    { skip: !running, pollingInterval: 5000 },
  );
  const status = detail.data?.status ?? report.status;
  const wantsDates = report.extra_query_params?.some((p) => /date/.test(p)) ?? true;

  const run = async () => {
    try {
      await create({
        platformKey: tenantKey,
        report_name: report.report_name,
        start_date: dates.start || undefined,
        end_date: dates.end || undefined,
      }).unwrap();
      toast.success(t("started", { name: report.display_name }));
    } catch (err) {
      toastError(err);
    }
  };
  const save = async () => {
    if (!status?.report_id) return;
    try {
      const blob = await download({
        platformKey: tenantKey,
        taskId: status.report_id,
        format: "csv",
      }).unwrap();
      downloadFile(`${report.report_name}.csv`, blob);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{report.display_name}</h2>
        <p className="text-muted-foreground text-xs">{report.description}</p>
      </div>
      {status?.state ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <StatusPill
            label={t(`state.${status.state}` as "state.completed")}
            tone={status.state === "completed" ? "ok" : status.state === "failed" ? "bad" : "muted"}
          />
          {status.started_on ? <span>{formatDateTime(status.started_on, locale)}</span> : null}
          {status.expires ? (
            <span>· {t("expires", { when: formatDateTime(status.expires, locale) })}</span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-end gap-2">
        {isLiveAdmin && wantsDates ? (
          <>
            <Input
              type="date"
              value={dates.start}
              onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))}
              className="h-8 w-36 text-xs"
              aria-label={t("from")}
            />
            <Input
              type="date"
              value={dates.end}
              onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))}
              className="h-8 w-36 text-xs"
              aria-label={t("to")}
            />
          </>
        ) : null}
        {isLiveAdmin ? (
          <Button
            size="sm"
            variant="outline"
            disabled={createState.isLoading || running}
            onClick={() => void run()}
          >
            {createState.isLoading || running ? (
              <Spinner size="sm" className="size-4 text-current" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {t("run")}
          </Button>
        ) : null}
        {status?.state === "completed" && status.report_id ? (
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={downloadState.isLoading}
            onClick={() => void save()}
          >
            {downloadState.isLoading ? (
              <Spinner size="sm" className="size-4 text-current" />
            ) : (
              <Download data-icon="inline-start" />
            )}
            {t("download")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** A section's instructor reports and tasks from the LMS; the roster CSV can be requested here. */
function SectionReports() {
  const t = useTranslations("reports.lms");
  const locale = useLocale();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const sections = useSections();
  const [courseId, setCourseId] = useState("");
  const downloads = useInstructorReportsQuery(courseId, { skip: !courseId });
  const tasks = useInstructorTasksQuery(courseId, { skip: !courseId });
  const [rosterCsv, rosterState] = useRosterCsvMutation();
  const request = async () => {
    try {
      await rosterCsv(courseId).unwrap();
      toast.success(t("rosterRequested"));
    } catch (err) {
      toastError(err);
    }
  };
  return (
    <section className="space-y-3 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t("title")}</h2>
          <p className="text-muted-foreground text-xs">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SimpleSelect
            value={courseId}
            onChange={setCourseId}
            options={sections.rows.map((r) => ({ value: r.course.id, label: r.course.name }))}
            placeholder={t("pickSection")}
            size="sm"
            className="w-64"
            aria-label={t("pickSection")}
          />
          {isLiveAdmin ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!courseId || rosterState.isLoading}
              onClick={() => void request()}
            >
              {rosterState.isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
              {t("rosterCsv")}
            </Button>
          ) : null}
        </div>
      </div>
      {courseId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-medium">{t("downloads")}</p>
            {downloads.error ? (
              <LoadError error={downloads.error} className="py-4" />
            ) : downloads.isLoading ? (
              <Skeleton className="mt-1 h-12" />
            ) : (downloads.data?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground mt-1 text-sm">—</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {downloads.data!.map((d) => (
                  <li key={d.name}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0058cc] hover:underline"
                    >
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">{t("tasks")}</p>
            {tasks.error ? (
              <LoadError error={tasks.error} className="py-4" />
            ) : tasks.isLoading ? (
              <Skeleton className="mt-1 h-12" />
            ) : (tasks.data?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground mt-1 text-sm">—</p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs">
                {tasks.data!.slice(0, 8).map((task) => (
                  <li key={task.task_id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{task.task_type}</span>
                    <span className="text-muted-foreground">
                      {task.task_state} · {formatDateTime(task.created, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
