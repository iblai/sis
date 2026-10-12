"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, History, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { StatusPill } from "@/components/sis/status-pill";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { GradebookEmbed } from "@/components/sis/courses/gradebook-embed";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import { errorStatus } from "@/lib/sis/errors";
import {
  useGradebookBulkUpdateMutation,
  useGradebookQuery,
  useGradingInfoQuery,
  useSubsectionHistoryQuery,
} from "@/lib/sis/lms-api";
import { formatDateTime, formatPercent } from "@/lib/sis/format";
import type { GradebookBreakdown, GradebookRow, GradingInfo } from "@/lib/sis/types";
import { cn } from "@/lib/utils";

const cursorOf = (url: string | null) => {
  if (!url) return undefined;
  try {
    return new URL(url, "https://x").searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * The gradebook grid (`/api/grades/v1/gradebook/`): learners × graded
 * subsections, cursor-paged, with overrides written through `bulk-update`.
 * The grid needs the course's `grades.writable_gradebook` flag; without it
 * the LMS answers 403 and the embedded gradebook MFE is the way in.
 */
export function GradebookTab({ courseId }: { courseId: string }) {
  const t = useTranslations("gradebook");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [cursor, setCursor] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [embedOpen, setEmbedOpen] = useState(false);
  const q = useDebounced(query.trim(), 300);
  const info = useGradingInfoQuery(courseId);
  const grid = useGradebookQuery({ courseId, cursor, user_contains: q || undefined });
  const columns = (info.data?.subsections ?? []).filter((s) => s.graded);
  const frozen = info.data?.grades_frozen ?? false;
  const forbidden = errorStatus(grid.error) === 403 || errorStatus(info.error) === 403;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(undefined);
            }}
            placeholder={t("searchPlaceholder")}
            className="h-8 pl-8 text-sm"
            aria-label={tc("search")}
          />
        </div>
        {frozen ? <StatusPill label={t("frozen")} tone="bad" /> : null}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setEmbedOpen(true)}>
          <ExternalLink data-icon="inline-start" /> {t("openEmbed")}
        </Button>
      </div>
      {forbidden ? (
        <EmptyState
          icon={<Lock strokeWidth={1.75} />}
          title={t("flagOff.title")}
          description={t("flagOff.body")}
          action={
            <Button className="ibl-button-primary" onClick={() => setEmbedOpen(true)}>
              {t("openEmbed")}
            </Button>
          }
        />
      ) : grid.error || info.error ? (
        <LoadError error={grid.error ?? info.error} />
      ) : grid.isLoading || info.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (grid.data?.results.length ?? 0) === 0 ? (
        <EmptyState title={q ? t("noMatch") : t("none")} />
      ) : (
        <div className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground text-left text-[11px] font-semibold tracking-wide uppercase">
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2">{t("columns.learner")}</th>
                  <th className="px-3 py-2">{t("columns.total")}</th>
                  {columns.map((c) => (
                    <th key={c.module_id} className="px-3 py-2" title={c.display_name}>
                      <div className="max-w-32 truncate">{c.short_label || c.display_name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grid.data!.results.map((row) => (
                  <tr key={row.user_id} className={grid.isFetching ? "opacity-70" : undefined}>
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                      <Link
                        href={href(`/students/${encodeURIComponent(row.username)}`)}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {row.full_name || row.username}
                      </Link>
                      <span className="text-muted-foreground block text-xs">{row.username}</span>
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {formatPercent(row.percent, locale)}
                      {row.letter_grade ? (
                        <span className="text-muted-foreground ml-1">{row.letter_grade}</span>
                      ) : null}
                    </td>
                    {columns.map((c) => {
                      const cell = row.section_breakdown.find((b) => b.module_id === c.module_id);
                      return (
                        <td key={c.module_id} className="px-1 py-1">
                          <GradeCell
                            courseId={courseId}
                            row={row}
                            column={c}
                            cell={cell}
                            editable={isLiveAdmin && !frozen}
                            locale={locale}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-muted-foreground flex items-center justify-between border-t border-gray-100 px-3 py-2 text-xs">
            <span>
              {t("count", {
                count: grid.data!.filtered_users_count,
                total: grid.data!.total_users_count,
              })}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!grid.data!.previous}
                onClick={() => setCursor(cursorOf(grid.data!.previous))}
              >
                {tc("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!grid.data!.next}
                onClick={() => setCursor(cursorOf(grid.data!.next))}
              >
                {tc("next")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <p className="text-muted-foreground text-xs">{t("hint")}</p>
      <GradebookEmbed courseId={courseId} open={embedOpen} onOpenChange={setEmbedOpen} />
    </div>
  );
}

/** One subsection score; editable cells open the override popover. */
function GradeCell({
  courseId,
  row,
  column,
  cell,
  editable,
  locale,
}: {
  courseId: string;
  row: GradebookRow;
  column: GradingInfo["subsections"][number];
  cell?: GradebookBreakdown;
  editable: boolean;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const label = cell ? (cell.attempted ? `${cell.score_earned}/${cell.score_possible}` : "—") : "—";
  const sub = cell?.attempted ? formatPercent(cell.percent, locale) : "";
  const body = (
    <>
      <span className="tabular-nums">{label}</span>
      {sub ? <span className="text-muted-foreground block text-[11px]">{sub}</span> : null}
    </>
  );
  if (!editable) return <div className="px-2 py-1 text-xs">{body}</div>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`${row.full_name || row.username} · ${column.display_name}`}
            className={cn(
              "w-full rounded-md px-2 py-1 text-left text-xs hover:bg-[#eef6fc]",
              open && "bg-[#eef6fc]",
            )}
          />
        }
      >
        {body}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <GradeEditor
          courseId={courseId}
          row={row}
          column={column}
          cell={cell}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function GradeEditor({
  courseId,
  row,
  column,
  cell,
  onDone,
}: {
  courseId: string;
  row: GradebookRow;
  column: GradingInfo["subsections"][number];
  cell?: GradebookBreakdown;
  onDone: () => void;
}) {
  const t = useTranslations("gradebook.editor");
  const tc = useTranslations("common");
  const locale = useLocale();
  const toastError = useToastError();
  const [earned, setEarned] = useState(cell ? String(cell.score_earned) : "");
  const [possible, setPossible] = useState(cell ? String(cell.score_possible) : "");
  const [comment, setComment] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [update, { isLoading }] = useGradebookBulkUpdateMutation();
  const history = useSubsectionHistoryQuery(
    { usageKey: column.module_id, userId: row.user_id },
    { skip: !showHistory },
  );

  const save = async () => {
    const e = Number(earned);
    const p = Number(possible);
    if (!Number.isFinite(e) || !Number.isFinite(p) || p <= 0 || e < 0) return;
    try {
      await update({
        courseId,
        updates: [
          {
            user_id: row.user_id,
            usage_id: column.module_id,
            grade: {
              earned_graded_override: e,
              possible_graded_override: p,
              earned_all_override: e,
              possible_all_override: p,
              comment: comment || t("defaultComment"),
            },
          },
        ],
      }).unwrap();
      toast.success(t("saved"));
      onDone();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{row.full_name || row.username}</p>
        <p className="text-muted-foreground text-xs">{column.display_name}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="grade-earned">{t("earned")}</Label>
          <Input
            id="grade-earned"
            type="number"
            min={0}
            step="any"
            value={earned}
            onChange={(e) => setEarned(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="grade-possible">{t("possible")}</Label>
          <Input
            id="grade-possible"
            type="number"
            min={0}
            step="any"
            value={possible}
            onChange={(e) => setPossible(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="grade-comment">{t("comment")}</Label>
        <Input
          id="grade-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-gray-900"
        >
          <History className="size-3.5" /> {t("history")}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={isLoading}
            onClick={() => void save()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {tc("save")}
          </Button>
        </div>
      </div>
      {showHistory ? (
        history.error ? (
          <LoadError error={history.error} className="py-4" />
        ) : history.isLoading ? (
          <Skeleton className="h-12" />
        ) : (
          <ul className="max-h-40 space-y-1 overflow-auto border-t border-gray-100 pt-2 text-xs">
            {(history.data?.history ?? []).length === 0 ? (
              <li className="text-muted-foreground">{t("noHistory")}</li>
            ) : (
              history.data!.history.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">
                    {h.earned_graded_override ?? h.earned_all_override ?? "—"}/
                    {h.possible_graded_override ?? h.possible_all_override ?? "—"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {formatDateTime(h.created, locale)}
                    {h.history_user ? ` · ${h.history_user}` : ""}
                    {h.comment ? ` · ${h.comment}` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        )
      ) : null}
    </div>
  );
}
