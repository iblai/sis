"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail, Search, Upload, UserPlus, Users } from "lucide-react";
import { InviteUserDialog, InvitedUsersDialog } from "@iblai/iblai-js/web-containers";
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
import { PageHeader } from "@/components/sis/page-header";
import { PaginationBar } from "@/components/sis/pagination-bar";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { SimpleSelect } from "@/components/sis/simple-select";
import { StatusPill } from "@/components/sis/status-pill";
import { LoadingScreen } from "@/components/loading-screen";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { ImportDialog } from "@/components/sis/students/import-dialog";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { usePlatformInvitationsQuery, useSearchUsersQuery } from "@/lib/sis/api";
import { displayName, formatDate, formatRelative } from "@/lib/sis/format";
import type { UserStatus } from "@/lib/sis/types";

const PAGE_SIZE = 25;

export default function StudentsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StudentsView />
    </Suspense>
  );
}

/** The directory of students: the users search with `role=Student`, invitations and the LMS import. */
function StudentsView() {
  const t = useTranslations("students");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantKey, username, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | UserStatus>("");
  const [page, setPage] = useState(1);
  const [showPending, setShowPending] = useState(false);
  const q = useDebounced(query.trim(), 300);
  useBreadcrumbs([{ label: tn("students"), href: href("/students") }]);

  const { data, isLoading, isFetching, error } = useSearchUsersQuery({
    platformKey: tenantKey,
    username,
    query: q,
    role: ["Student"],
    status: status ? [status] : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  // The role filter is also applied here, should the server ignore it.
  const rows = (data?.results ?? []).filter((u) => u.role !== "Instructor" && u.role !== "Admin");
  const pending = usePlatformInvitationsQuery(
    { platformKey: tenantKey, active: true, page_size: 50 },
    { skip: !isLiveAdmin },
  );
  const pendingRows = (pending.data?.results ?? []).filter((i) => !i.started);

  const inviteOpen = searchParams.get("invite") === "1";
  const importOpen = searchParams.get("import") === "1";
  const closeDialogs = () => router.replace(href("/students"));
  const count = data?.count ?? 0;
  const paginated = {
    count,
    next_page: page * PAGE_SIZE < count ? page + 1 : null,
    previous_page: page > 1 ? page - 1 : null,
    results: rows,
  };

  return (
    <>
      <PageHeader
        icon={<Users />}
        title={tn("students")}
        count={data?.count}
        description={t("description")}
        actions={
          isLiveAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.replace(href("/students?import=1"))}
              >
                <Upload data-icon="inline-start" /> {t("import")}
              </Button>
              <Button
                size="sm"
                className="ibl-button-primary"
                onClick={() => router.replace(href("/students?invite=1"))}
              >
                <UserPlus data-icon="inline-start" /> {t("invite")}
              </Button>
            </>
          ) : null
        }
        toolbar={
          <>
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
                className="h-8 pl-8 text-sm"
                aria-label={tc("search")}
              />
            </div>
            <SimpleSelect
              value={status}
              onChange={(v) => {
                setStatus(v as "" | UserStatus);
                setPage(1);
              }}
              options={[
                { value: "active", label: t("status.active") },
                { value: "inactive", label: t("status.inactive") },
              ]}
              allowEmpty
              emptyLabel={t("status.all")}
              size="sm"
              className="w-36"
              aria-label={t("status.label")}
            />
          </>
        }
      />
      <div className="flex-1 overflow-auto">
        {isLiveAdmin && pendingRows.length ? (
          <button
            type="button"
            onClick={() => setShowPending(true)}
            className="flex w-full items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-4 py-2 text-left text-xs text-amber-900 hover:bg-amber-50 md:px-6"
          >
            <Mail className="size-3.5" />
            {t("pending", { count: pendingRows.length })}
            <span className="text-muted-foreground truncate">
              {pendingRows
                .slice(0, 3)
                .map((i) => i.email ?? i.username)
                .join(", ")}
            </span>
          </button>
        ) : null}
        {error ? (
          <LoadError error={error} className="m-4" />
        ) : isLoading ? (
          <div className="space-y-2 p-4 md:p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users strokeWidth={1.75} />}
            title={q ? t("empty.noMatch") : t("empty.title")}
            description={q ? undefined : t("empty.body")}
            className="m-4 md:m-6"
          />
        ) : (
          <Table className={isFetching ? "opacity-70" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{tc("email")}</TableHead>
                <TableHead>{t("status.label")}</TableHead>
                <TableHead>{t("columns.joined")}</TableHead>
                <TableHead>{t("columns.lastLogin")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={href(`/students/${encodeURIComponent(u.username)}`)}
                      className="flex items-center gap-2 font-medium text-gray-900 hover:underline"
                    >
                      <EntityAvatar
                        name={displayName(u)}
                        seed={u.username}
                        src={u.profile_image}
                        size="sm"
                      />
                      <span className="truncate">{displayName(u)}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={u.status === "inactive" ? t("status.inactive") : t("status.active")}
                      tone={u.status === "inactive" ? "muted" : "ok"}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(u.joined_date, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelative(u.last_login, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <PaginationBar
        data={paginated}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        label={t("countLabel")}
      />
      <InviteUserDialog isOpen={inviteOpen} onClose={closeDialogs} tenant={tenantKey} />
      {showPending ? (
        <InvitedUsersDialog onClose={() => setShowPending(false)} tenant={tenantKey} />
      ) : null}
      <ImportDialog open={importOpen} onOpenChange={(o) => (o ? null : closeDialogs())} />
    </>
  );
}
