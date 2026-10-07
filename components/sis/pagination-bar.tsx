"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/sis/types";

/** Page-number pagination for the CRM's `{count, next_page, previous_page}` envelope. */
export function PaginationBar({
  data,
  page,
  pageSize,
  onPageChange,
  label,
}: {
  data?: Paginated<unknown>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const t = useTranslations("fields");
  const tc = useTranslations("common");
  if (!data) return null;
  const start = data.count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, data.count);
  const noun = label ?? t("pagination.items");
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-2 text-xs md:px-6">
      <span>
        {data.count === 0
          ? t("pagination.none", { label: noun })
          : tc("showing", { from: start, to: end, count: data.count, label: noun })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={!data.previous_page}
          onClick={() => data.previous_page && onPageChange(data.previous_page)}
          aria-label={tc("previous")}
        >
          <ChevronLeft />
        </Button>
        <span className="px-1 tabular-nums">
          {tc("page", { page, total: Math.max(1, Math.ceil(data.count / pageSize)) })}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={!data.next_page}
          onClick={() => data.next_page && onPageChange(data.next_page)}
          aria-label={tc("next")}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
