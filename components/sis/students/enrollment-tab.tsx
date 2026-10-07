"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, ExternalLink, Plus } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { StatusPill } from "@/components/sis/status-pill";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { EnrollDialog } from "@/components/sis/students/enroll-dialog";
import { ProgressCells } from "@/components/sis/students/my-sections";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useCourseInvitationsQuery } from "@/lib/sis/api";
import { useUserEnrollmentsQuery } from "@/lib/sis/lms-api";
import config from "@/lib/iblai/config";
import { formatDate } from "@/lib/sis/format";

/** A student's sections from the LMS; enroll = course invitation, drop = the instructor dashboard. */
export function EnrollmentTab({ username, studentId }: { username: string; studentId?: number }) {
  const t = useTranslations("enrollment");
  const locale = useLocale();
  const { tenantKey, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const enrollments = useUserEnrollmentsQuery(username, { skip: !username });
  const sections = useSections();
  const pending = useCourseInvitationsQuery(
    { platformKey: tenantKey, username, active: true, page_size: 50 },
    { skip: !isLiveAdmin },
  );
  const rows = enrollments.data ?? [];
  const pendingRows = (pending.data?.results ?? []).filter((i) => !i.started);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        {isLiveAdmin ? (
          <Button size="sm" className="ibl-button-primary" onClick={() => setEnrollOpen(true)}>
            <Plus data-icon="inline-start" /> {t("enroll")}
          </Button>
        ) : null}
      </div>
      {pendingRows.length ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          {t("pendingInvitations", { count: pendingRows.length })}{" "}
          {pendingRows
            .map((i) => sections.byCourseId.get(i.course_id)?.course.name ?? i.course_id)
            .join(", ")}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {enrollments.error ? (
          <LoadError error={enrollments.error} />
        ) : enrollments.isLoading ? (
          <Skeleton className="m-4 h-24 rounded-lg" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen strokeWidth={1.75} />}
            title={t("none")}
            className="border-0"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.section")}</TableHead>
                <TableHead>{t("columns.term")}</TableHead>
                <TableHead>{t("columns.since")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.grade")}</TableHead>
                <TableHead>{t("columns.progress")}</TableHead>
                {isLiveAdmin ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const courseId = e.course_details.course_id;
                const row = sections.byCourseId.get(courseId);
                return (
                  <TableRow key={courseId}>
                    <TableCell>
                      <Link
                        href={href(`/courses/${encodeURIComponent(courseId)}`)}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {e.course_details.course_name}
                      </Link>
                      <span className="text-muted-foreground block text-xs">{e.mode}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row?.term?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(e.created, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={e.is_active ? t("active") : t("dropped")}
                        tone={e.is_active ? "ok" : "muted"}
                      />
                    </TableCell>
                    <ProgressCells courseId={courseId} studentId={studentId} />
                    {isLiveAdmin ? (
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <a
                                href={`${config.legacyLmsUrl()}/courses/${courseId}/instructor#view-membership`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t("drop")}
                                className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-gray-900"
                              />
                            }
                          >
                            {t("drop")} <ExternalLink className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent side="left">{t("dropHint")}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <EnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        username={username}
        exclude={rows.filter((e) => e.is_active).map((e) => e.course_details.course_id)}
      />
    </div>
  );
}
