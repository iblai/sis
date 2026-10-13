"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoadError } from "@/components/sis/load-error";
import { PaginationBar } from "@/components/sis/pagination-bar";
import { StatusPill } from "@/components/sis/status-pill";
import { useGateLoading } from "@/components/sis/page-gate";
import { useSession } from "@/hooks/use-session";
import { useUserAssertionsQuery } from "@/lib/sis/api";
import { formatDate, nameOf } from "@/lib/sis/format";

const PAGE_SIZE = 5;

/** A user's credentials, five a page, laid out like the My Courses panel beside it. */
export function MyCredentials({ username }: { username: string }) {
  const t = useTranslations("credentials");
  const locale = useLocale();
  const { tenantKey } = useSession();
  const [page, setPage] = useState(1);
  const assertions = useUserAssertionsQuery({
    platformKey: tenantKey,
    username,
    include_revoked: true,
    include_expired: true,
    page,
    page_size: PAGE_SIZE,
  });
  useGateLoading(assertions.isLoading);
  if (assertions.error) return <LoadError error={assertions.error} className="m-4" />;
  const rows = assertions.data?.data ?? [];
  if (!rows.length && page === 1)
    return <p className="text-muted-foreground p-6 text-center text-sm">{t("none")}</p>;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="text-muted-foreground text-left text-[11px] font-semibold tracking-wide uppercase">
            <tr className="border-b border-gray-100">
              <th className="w-2/5 px-4 py-2">{t("columns.credential")}</th>
              <th className="hidden w-1/5 px-4 py-2 sm:table-cell">{t("columns.course")}</th>
              <th className="w-1/5 px-4 py-2">{t("columns.issued")}</th>
              <th className="w-1/5 px-4 py-2">{t("columns.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((a) => (
              <tr key={a.entityId}>
                <td className="px-4 py-2 font-medium text-gray-900">
                  {a.credentialDetails?.name ?? a.entityId}
                </td>
                <td className="text-muted-foreground hidden px-4 py-2 sm:table-cell">
                  {nameOf(a.course) ?? nameOf(a.program) ?? "—"}
                </td>
                <td className="text-muted-foreground px-4 py-2">
                  {formatDate(a.issuedOn, locale)}
                </td>
                <td className="px-4 py-2">
                  <StatusPill
                    label={a.revoked ? t("status.revoked") : t("status.valid")}
                    tone={a.revoked ? "bad" : "ok"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar
        data={{
          count: assertions.data?.count ?? 0,
          next_page: assertions.data?.next ? page + 1 : null,
          previous_page: assertions.data?.previous ? page - 1 : null,
          results: rows,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        label={t("page.countLabel")}
      />
    </>
  );
}
