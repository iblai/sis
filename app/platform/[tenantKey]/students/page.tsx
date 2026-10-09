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
import { LoadingScreen } from "@/components/loading-screen";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { ImportDialog } from "@/components/sis/students/import-dialog";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { usePlatformInvitationsQuery, usePlatformUsersQuery } from "@/lib/sis/api";
import { displayName, formatDate, roleOf } from "@/lib/sis/format";

const PAGE_SIZE = 25;

export default function StudentsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StudentsView />
    </Suspense>
  );
}

/** The directory of students: the platform's members with neither flag, invitations and the LMS import. */
function StudentsView() {
  const t = useTranslations("students");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantKey, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showPending, setShowPending] = useState(false);
  const q = useDebounced(query.trim(), 300);
  useBreadcrumbs([{ label: tn("students"), href: href("/students") }]);

  const { data, isLoading, isFetching, error } = usePlatformUsersQuery({
    platformKey: tenantKey,
    query: q,
    page,
    page_size: PAGE_SIZE,
  });
  // The directory has no role filter yet: the page keeps the members with neither flag.
  const rows = (data?.results ?? []).filter((u) => roleOf(u) === "student");
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
    next_page: data?.next_page ?? null,
    previous_page: data?.previous_page ?? null,
    results: rows,
  };

  return (
    <>
      <PageHeader
        icon={<Users />}
        title={tn("students")}
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
                <TableHead className="hidden md:table-cell">{tc("email")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.joined")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <Link
                      href={href(`/students/${encodeURIComponent(u.username)}`)}
                      className="flex items-center gap-2 font-medium text-gray-900 hover:underline"
                    >
                      <EntityAvatar name={displayName(u)} seed={u.username} size="sm" />
                      <span className="truncate">{displayName(u)}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {u.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {formatDate(u.added_on, locale)}
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
