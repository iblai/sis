"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, UserCog, UserPlus } from "lucide-react";
import { InviteUserDialog } from "@iblai/iblai-js/web-containers";
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
import { StatusPill } from "@/components/sis/status-pill";
import { LoadingScreen } from "@/components/loading-screen";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { useSearchUsersQuery } from "@/lib/sis/api";
import { displayName, formatRelative } from "@/lib/sis/format";

const PAGE_SIZE = 25;

export default function StaffPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StaffView />
    </Suspense>
  );
}

/** Staff: the users search with the Instructor and Admin roles. Teachers are platform admins in this version. */
function StaffView() {
  const t = useTranslations("staff");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantKey, username, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim(), 300);
  useBreadcrumbs([{ label: tn("staff"), href: href("/staff") }]);
  const { data, isLoading, isFetching, error } = useSearchUsersQuery({
    platformKey: tenantKey,
    username,
    query: q,
    role: ["Instructor", "Admin"],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (data?.results ?? []).filter((u) => u.role === "Instructor" || u.role === "Admin");
  const inviteOpen = searchParams.get("invite") === "1";
  const count = data?.count ?? 0;

  return (
    <>
      <PageHeader
        icon={<UserCog />}
        title={tn("staff")}
        count={data?.count}
        description={t("description")}
        actions={
          isLiveAdmin ? (
            <Button
              size="sm"
              className="ibl-button-primary"
              onClick={() => router.replace(href("/staff?invite=1"))}
            >
              <UserPlus data-icon="inline-start" /> {t("invite")}
            </Button>
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
        {error ? (
          <LoadError error={error} className="m-4" />
        ) : isLoading ? (
          <div className="space-y-2 p-4 md:p-6">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<UserCog strokeWidth={1.75} />}
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
                <TableHead>{t("columns.role")}</TableHead>
                <TableHead>{t("columns.lastLogin")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={href(`/staff/${encodeURIComponent(u.username)}`)}
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
                      label={u.role === "Admin" ? t("roles.admin") : t("roles.teacher")}
                      tone={u.role === "Admin" ? "ok" : "muted"}
                    />
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
        data={{
          count,
          next_page: page * PAGE_SIZE < count ? page + 1 : null,
          previous_page: page > 1 ? page - 1 : null,
          results: rows,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        label={t("countLabel")}
      />
      <InviteUserDialog
        isOpen={inviteOpen}
        onClose={() => router.replace(href("/staff"))}
        tenant={tenantKey}
      />
    </>
  );
}
