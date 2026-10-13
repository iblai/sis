"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/sis/simple-select";
import { SectionPicker } from "@/components/sis/section-picker";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import { useRerunCourseMutation, useUpdateCourseDetailsMutation } from "@/lib/sis/studio-api";
import { courseRunParts, upsertSection } from "@/lib/sis/sections";

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30) || "run";

/**
 * A new section is a Studio rerun of an existing course run into a term: the
 * run id is the term's, the dates are the term's, and the section row (term,
 * subject, grade level) lands in the platform metadata.
 */
export function SectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("courses.sectionDialog");
  const tc = useTranslations("common");
  const router = useRouter();
  const { org, href } = useSession();
  const toastError = useToastError();
  const sections = useSections({ skip: !open });
  const { meta, saveList } = useSisMetadata();
  const [source, setSource] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [name, setName] = useState("");
  const [run, setRun] = useState("");
  const [rerun, rerunState] = useRerunCourseMutation();
  const [updateDetails] = useUpdateCourseDetailsMutation();
  const sourceRow = sections.byCourseId.get(source);
  const term = meta?.terms.find((x) => x.id === termId);
  const displayName =
    name ||
    (sourceRow && term ? `${sourceRow.course.name} (${term.name})` : sourceRow?.course.name || "");
  const runId = run || (term ? slug(term.name) : "");
  const busy = rerunState.isLoading;

  const submit = async () => {
    const parts = sourceRow ? courseRunParts(sourceRow.course.id) : null;
    if (!sourceRow || !parts || !runId || !displayName) return;
    try {
      const created = await rerun({
        org: parts.org || org,
        number: parts.number,
        run: runId,
        display_name: displayName,
        start: term ? `${term.start}T00:00:00Z` : undefined,
        source_course_key: sourceRow.course.id,
      }).unwrap();
      if (term) {
        await updateDetails({
          courseId: created.course_key,
          body: { start_date: `${term.start}T00:00:00Z`, end_date: `${term.end}T23:59:59Z` },
        })
          .unwrap()
          .catch(() => toast.message(t("datesNotSet")));
      }
      if (meta) {
        await saveList(
          "sections",
          upsertSection(meta.sections, {
            courseId: created.course_key,
            termId: termId || undefined,
            subjectId: subjectId || undefined,
            gradeLevelId: gradeLevelId || undefined,
          }),
          meta.sections,
        );
      }
      toast.success(t("done", { name: displayName }));
      onOpenChange(false);
      router.push(href(`/courses/${encodeURIComponent(created.course_key)}`));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="section-source">{t("source")}</Label>
            <SectionPicker
              id="section-source"
              value={source}
              onChange={setSource}
              rows={sections.rows}
              placeholder={t("pickSource")}
              disabled={sections.isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("term")}</Label>
            <SimpleSelect
              value={termId}
              onChange={setTermId}
              options={(meta?.terms ?? []).map((x) => ({ value: x.id, label: x.name }))}
              placeholder={meta?.terms.length ? t("pickTerm") : t("noTerms")}
              disabled={!meta?.terms.length}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section-run">{t("run")}</Label>
            <Input id="section-run" value={runId} onChange={(e) => setRun(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="section-name">{t("name")}</Label>
            <Input
              id="section-name"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("subject")}</Label>
            <SimpleSelect
              value={subjectId}
              onChange={setSubjectId}
              options={(meta?.subjects ?? []).map((x) => ({ value: x.id, label: x.name }))}
              allowEmpty
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("gradeLevel")}</Label>
            <SimpleSelect
              value={gradeLevelId}
              onChange={setGradeLevelId}
              options={(meta?.gradeLevels ?? []).map((x) => ({ value: x.id, label: x.name }))}
              allowEmpty
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            className="ibl-button-primary"
            disabled={!source || !runId || !displayName || busy}
            onClick={() => void submit()}
          >
            {busy ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
