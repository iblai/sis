"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { SimpleSelect } from "@/components/sis/simple-select";
import { useSections } from "@/hooks/use-sections";
import { useToastError } from "@/hooks/use-toast-error";
import { buildImportCsv, parseImportRows } from "@/lib/sis/csv";
import { useRegisterAndEnrollMutation, type ImportResult } from "@/lib/sis/lms-api";

/**
 * Bulk import through the LMS (`register_and_enroll_students`): a CSV of
 * `email, username, name, country` into one section. Existing accounts are
 * enrolled; new emails get an account when the platform allows automated
 * sign-ups — the result says which rows the LMS refused.
 */
export function ImportDialog({
  open,
  onOpenChange,
  courseId: fixedCourseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect and lock the section (opened from a course page). */
  courseId?: string;
}) {
  const t = useTranslations("students.importDialog");
  const tc = useTranslations("common");
  const toastError = useToastError();
  const sections = useSections({ skip: !open });
  const [courseId, setCourseId] = useState(fixedCourseId ?? "");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [run, { isLoading }] = useRegisterAndEnrollMutation();
  const parsed = useMemo(() => parseImportRows(text), [text]);
  const target = fixedCourseId || courseId;

  const readFile = (file: File | undefined) => {
    if (!file) return;
    file
      .text()
      .then(setText)
      .catch(() => toast.error(tc("errorGeneric")));
  };

  const submit = async () => {
    if (!target || !parsed.rows.length) return;
    try {
      const res = await run({ courseId: target, csv: buildImportCsv(parsed.rows) }).unwrap();
      setResult(res);
      const refused = res.row_errors?.length ?? 0;
      toast.success(t("done", { count: parsed.rows.length - refused, refused }));
    } catch (err) {
      toastError(err);
    }
  };

  const close = (o: boolean) => {
    if (!o) {
      setText("");
      setResult(null);
      if (!fixedCourseId) setCourseId("");
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!fixedCourseId ? (
            <div className="space-y-1.5">
              <Label>{t("section")}</Label>
              <SimpleSelect
                value={courseId}
                onChange={setCourseId}
                options={sections.rows.map((r) => ({
                  value: r.course.id,
                  label: r.term ? `${r.course.name} · ${r.term.name}` : r.course.name,
                }))}
                placeholder={t("pickSection")}
                disabled={sections.isLoading}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="import-csv">{t("csv")}</Label>
            <Textarea
              id="import-csv"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"email,username,name,country\nada@example.org,ada,Ada Lovelace,GB"}
              className="font-mono text-xs"
            />
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => readFile(e.target.files?.[0])}
              className="text-muted-foreground block w-full text-xs file:mr-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-2 file:py-1 file:text-xs"
              aria-label={t("file")}
            />
          </div>
          {text ? (
            <p className="text-muted-foreground text-xs">
              {t("preview", { count: parsed.rows.length, errors: parsed.errors.length })}
              {parsed.errors.length ? (
                <span className="mt-1 block truncate text-rose-700">
                  {parsed.errors.slice(0, 5).join(" · ")}
                </span>
              ) : null}
            </p>
          ) : null}
          {result ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
              <p className="font-medium text-gray-900">{t("result")}</p>
              <ul className="mt-1 space-y-0.5">
                {result.general_errors?.map((e, i) => (
                  <li key={`g${i}`} className="text-rose-700">
                    {e.response}
                  </li>
                ))}
                {result.row_errors?.map((e, i) => (
                  <li key={`r${i}`} className="text-rose-700">
                    {e.email ?? e.username}: {e.response}
                  </li>
                ))}
                {result.warnings?.map((e, i) => (
                  <li key={`w${i}`} className="text-amber-700">
                    {e.response}
                  </li>
                ))}
                {!result.general_errors?.length &&
                !result.row_errors?.length &&
                !result.warnings?.length ? (
                  <li className="text-emerald-700">{t("allGood")}</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {tc("cancel")}
          </Button>
          <Button
            className="ibl-button-primary"
            disabled={!target || !parsed.rows.length || isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("submit", { count: parsed.rows.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
