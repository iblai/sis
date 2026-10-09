"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Plus, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/sis/confirm-dialog";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useCreateFieldMutation,
  useDeleteFieldMutation,
  useExportFieldsMutation,
  useFieldDefinitionsQuery,
  useImportFieldsMutation,
  useUpdateFieldMutation,
} from "@/lib/sis/api";
import { downloadFile } from "@/lib/sis/download";
import { missingSeeds } from "@/lib/sis/seed";
import type { FieldDefinition } from "@/lib/sis/types";

const TYPES = ["text", "number", "date", "select", "boolean"] as const;

/** The platform's custom demographics fields: the student record's shape. */
export function FieldsTab() {
  const t = useTranslations("setup.fields");
  const tc = useTranslations("common");
  const { tenantKey } = useSession();
  const toastError = useToastError();
  const { meta } = useSisMetadata();
  const fields = useFieldDefinitionsQuery(tenantKey);
  const [create, createState] = useCreateFieldMutation();
  const [update] = useUpdateFieldMutation();
  const [remove, removeState] = useDeleteFieldMutation();
  const [exportFields, exportState] = useExportFieldsMutation();
  const [importFields, importState] = useImportFieldsMutation();
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState<FieldDefinition | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    slug: "",
    field_type: "text",
    required: false,
    choices: "",
  });
  const rows = [...(fields.data ?? [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const slugOf = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const add = async () => {
    const slug = draft.slug || slugOf(draft.name);
    if (!draft.name.trim() || !slug) return;
    try {
      await create({
        platformKey: tenantKey,
        body: {
          name: draft.name.trim(),
          slug,
          field_type: draft.field_type,
          required: draft.required,
          choices:
            draft.field_type === "select"
              ? draft.choices
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
              : undefined,
          display_order: rows.length + 1,
          active: true,
        },
      }).unwrap();
      toast.success(t("added", { name: draft.name }));
      setDraft({ name: "", slug: "", field_type: "text", required: false, choices: "" });
    } catch (err) {
      toastError(err);
    }
  };
  const seed = async () => {
    setSeeding(true);
    try {
      const missing = missingSeeds(rows, meta?.gradeLevels.map((g) => g.name) ?? []);
      for (const f of missing) await create({ platformKey: tenantKey, body: f }).unwrap();
      toast.success(t("seeded", { count: missing.length }));
    } catch (err) {
      toastError(err);
    } finally {
      setSeeding(false);
    }
  };
  const toggle = async (f: FieldDefinition, patch: Partial<FieldDefinition>) => {
    try {
      await update({ platformKey: tenantKey, slug: f.slug, body: patch }).unwrap();
    } catch (err) {
      toastError(err);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove({ platformKey: tenantKey, slug: deleting.slug }).unwrap();
      toast.success(t("deleted"));
      setDeleting(null);
    } catch (err) {
      toastError(err);
    }
  };
  const doExport = async () => {
    try {
      downloadFile("student-fields.csv", await exportFields(tenantKey).unwrap());
    } catch (err) {
      toastError(err);
    }
  };
  const doImport = async (file?: File) => {
    if (!file) return;
    try {
      await importFields({ platformKey: tenantKey, file }).unwrap();
      toast.success(t("imported"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{t("description")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={seeding} onClick={() => void seed()}>
            {seeding ? (
              <Spinner size="sm" className="size-4 text-current" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {t("seed")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exportState.isLoading}
            onClick={() => void doExport()}
          >
            <Download data-icon="inline-start" /> {t("export")}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50">
            <Upload className="size-3.5" /> {importState.isLoading ? "…" : t("import")}
            <input
              type="file"
              accept=".csv,.json"
              className="sr-only"
              onChange={(e) => void doImport(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {fields.error ? (
          <LoadError error={fields.error} />
        ) : fields.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 font-medium">{tc("name")}</th>
                <th className="px-3 py-2 font-medium">{t("slug")}</th>
                <th className="px-3 py-2 font-medium">{t("type")}</th>
                <th className="px-3 py-2 font-medium">{t("choices")}</th>
                <th className="px-3 py-2 font-medium">{t("required")}</th>
                <th className="px-3 py-2 font-medium">{t("active")}</th>
                <th className="w-10" aria-label={tc("actions")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-3 py-6 text-center">
                    {t("none")}
                  </td>
                </tr>
              ) : (
                rows.map((f) => (
                  <tr key={f.slug}>
                    <td className="px-3 py-2 font-medium text-gray-900">{f.name}</td>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">{f.slug}</td>
                    <td className="text-muted-foreground px-3 py-2">{f.field_type}</td>
                    <td className="text-muted-foreground px-3 py-2 text-xs">
                      <div className="max-w-48 truncate">{f.choices?.join(", ") || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={!!f.required}
                        onCheckedChange={(v) => void toggle(f, { required: Boolean(v) })}
                        aria-label={t("required")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={f.active !== false}
                        onCheckedChange={(v) => void toggle(f, { active: Boolean(v) })}
                        aria-label={t("active")}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleting(f)}
                        aria-label={tc("delete")}
                      >
                        <X />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder={tc("name")}
          className="h-8 w-full text-sm sm:w-44"
          aria-label={tc("name")}
          required
        />
        <Input
          value={draft.slug}
          onChange={(e) => setDraft((d) => ({ ...d, slug: slugOf(e.target.value) }))}
          placeholder={slugOf(draft.name) || t("slug")}
          className="h-8 w-full font-mono text-xs sm:w-40"
          aria-label={t("slug")}
        />
        <SimpleSelect
          value={draft.field_type}
          onChange={(v) => setDraft((d) => ({ ...d, field_type: v }))}
          options={TYPES.map((x) => ({ value: x, label: x }))}
          size="sm"
          className="w-full sm:w-28"
          aria-label={t("type")}
        />
        {draft.field_type === "select" ? (
          <Input
            value={draft.choices}
            onChange={(e) => setDraft((d) => ({ ...d, choices: e.target.value }))}
            placeholder={t("choicesPlaceholder")}
            className="h-8 w-full text-sm sm:w-56"
            aria-label={t("choices")}
          />
        ) : null}
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox
            checked={draft.required}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, required: Boolean(v) }))}
          />{" "}
          {t("required")}
        </label>
        <Button
          type="submit"
          size="sm"
          className="ibl-button-primary"
          disabled={!draft.name.trim() || createState.isLoading}
        >
          <Plus data-icon="inline-start" /> {t("add")}
        </Button>
      </form>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => (o ? null : setDeleting(null))}
        title={t("deleteTitle", { name: deleting?.name ?? "" })}
        description={t("deleteBody")}
        confirmLabel={tc("delete")}
        destructive
        loading={removeState.isLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
