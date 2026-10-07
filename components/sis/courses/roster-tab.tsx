"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Download, Mail, Plus, Search, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { UserPicker } from "@/components/sis/user-picker";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { ImportDialog } from "@/components/sis/students/import-dialog";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import { useCreateCourseInvitationMutation } from "@/lib/sis/api";
import { useRosterQuery } from "@/lib/sis/lms-api";
import { toCsv } from "@/lib/sis/csv";
import { downloadFile } from "@/lib/sis/download";
import { formatRelative } from "@/lib/sis/format";
import type { DirectoryUser } from "@/lib/sis/types";

/** The section's roster from the instructor API; enroll by invitation, import a CSV, export, email. */
export function RosterTab({ courseId }: { courseId: string }) {
  const t = useTranslations("roster");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { tenantKey, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const roster = useRosterQuery(courseId);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<DirectoryUser | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [invite, inviteState] = useCreateCourseInvitationMutation();
  const needle = query.trim().toLowerCase();
  const rows = (roster.data?.students ?? []).filter(
    (s) =>
      !needle ||
      s.username.toLowerCase().includes(needle) ||
      s.name.toLowerCase().includes(needle) ||
      s.email.toLowerCase().includes(needle),
  );

  const enroll = async () => {
    if (!picked) return;
    try {
      await invite({
        platformKey: tenantKey,
        body: { course_id: courseId, username: picked.username },
      }).unwrap();
      toast.success(t("invited", { name: picked.username }));
      setPicked(null);
    } catch (err) {
      toastError(err);
    }
  };

  const exportCsv = () => {
    const all = roster.data?.students ?? [];
    downloadFile(
      `roster-${courseId.replace(/[^\w.-]+/g, "_")}.csv`,
      toCsv(
        ["username", "name", "email", "mode", "last_login"],
        all.map((s) => [s.username, s.name, s.email, s.enrollment_mode ?? "", s.last_login ?? ""]),
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-8 pl-8 text-sm"
            aria-label={tc("search")}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!roster.data?.students?.length}
          >
            <Download data-icon="inline-start" /> {t("export")}
          </Button>
          {isLiveAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={href(`/messages?course=${encodeURIComponent(courseId)}`)} />}
              >
                <Mail data-icon="inline-start" /> {t("email")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload data-icon="inline-start" /> {t("import")}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {isLiveAdmin ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-3">
          <div className="min-w-64 flex-1">
            <UserPicker value={picked} onChange={setPicked} placeholder={t("pickUser")} size="sm" />
          </div>
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={!picked || inviteState.isLoading}
            onClick={() => void enroll()}
          >
            {inviteState.isLoading ? (
              <Spinner size="sm" className="size-4 text-current" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {t("enroll")}
          </Button>
          <p className="text-muted-foreground w-full text-xs">{t("enrollHint")}</p>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {roster.error ? (
          <LoadError error={roster.error} />
        ) : roster.isLoading ? (
          <Skeleton className="m-4 h-32 rounded-lg" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users strokeWidth={1.75} />}
            title={needle ? t("noMatch") : t("none")}
            className="border-0"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{tc("email")}</TableHead>
                <TableHead>{t("columns.mode")}</TableHead>
                <TableHead>{t("columns.lastLogin")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={href(`/students/${encodeURIComponent(s.username)}`)}
                      className="flex items-center gap-2 font-medium text-gray-900 hover:underline"
                    >
                      <EntityAvatar name={s.name || s.username} seed={s.username} size="sm" />
                      <span className="truncate">{s.name || s.username}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.enrollment_mode ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelative(s.last_login, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {t("count", { count: roster.data?.students_count ?? 0 })}
      </p>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} courseId={courseId} />
    </div>
  );
}
