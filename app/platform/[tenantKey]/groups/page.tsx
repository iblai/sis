"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { GroupDialog } from "@/components/sis/groups/group-dialog";
import { PageGate } from "@/components/sis/page-gate";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { useUserGroupsQuery } from "@/lib/sis/api";

const PAGE_SIZE = 25;

export default function GroupsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GroupsView />
    </Suspense>
  );
}

/** DM user groups as homerooms and cohorts. */
function GroupsView() {
  const t = useTranslations("groups");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantKey, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim(), 300);
  useBreadcrumbs([{ label: tn("groups"), href: href("/groups") }]);
  const { data, isLoading, isFetching, error } = useUserGroupsQuery({
    platformKey: tenantKey,
    page,
    page_size: PAGE_SIZE,
    name: q || undefined,
  });
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const newOpen = searchParams.get("new") === "1";

  return (
    <PageGate loading={isLoading}>
      <PageHeader
        where="groups"
        icon={<UsersRound />}
        title={tn("groups")}
        count={data?.count}
        description={t("description")}
        actions={
          isLiveAdmin ? (
            <Button
              size="sm"
              className="ibl-button-primary"
              onClick={() => router.replace(href("/groups?new=1"))}
            >
              <Plus data-icon="inline-start" /> {t("new")}
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<UsersRound strokeWidth={1.75} />}
            title={q ? t("empty.noMatch") : t("empty.title")}
            description={q ? undefined : t("empty.body")}
            className="m-4 md:m-6"
          />
        ) : (
          <Table className={isFetching ? "opacity-70" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{tc("description")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link
                      href={href(`/groups/${g.id}`)}
                      className="flex items-center gap-2 font-medium text-gray-900 hover:underline"
                    >
                      <EntityAvatar name={g.name} seed={g.id} kind="group" size="sm" />
                      {g.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal">
                    {g.description || "—"}
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
          next_page: data?.next ? page + 1 : null,
          previous_page: data?.previous ? page - 1 : null,
          results: rows,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        label={t("countLabel")}
      />
      <GroupDialog
        open={newOpen}
        onOpenChange={(o) => (o ? null : router.replace(href("/groups")))}
      />
    </PageGate>
  );
}
