"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/sis/simple-select";
import { MetadataConflictError } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import { newId } from "@/lib/sis/metadata";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "date" | "time" | "number";
  /** A select instead of an input. */
  options?: { value: string; label: string }[];
  required?: boolean;
  width?: string;
}

/**
 * A table of metadata rows with inline inputs: add, remove, save the list
 * whole. `save` throws `MetadataConflictError` when the list changed under
 * the form; the toast says so and the page's refetch brings the new rows.
 */
export function ListEditor<T extends { id: string }>({
  rows: initial,
  columns,
  blank,
  save,
  description,
  extra,
}: {
  rows: T[];
  columns: Column<T>[];
  blank: () => Omit<T, "id">;
  save: (rows: T[], base: T[]) => Promise<void>;
  description?: string;
  /** Extra cells per row (e.g. a cohort-group action). */
  extra?: (row: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const t = useTranslations("setup.editor");
  const tc = useTranslations("common");
  const toastError = useToastError();
  const [rows, setRows] = useState<T[]>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);
  const update = (id: string, patch: Partial<T>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const valid = rows.every((r) =>
    columns.every((c) => !c.required || String(r[c.key] ?? "").trim() !== ""),
  );

  const submit = async () => {
    setSaving(true);
    try {
      await save(rows, initial);
      toast.success(t("saved"));
    } catch (err) {
      if (err instanceof MetadataConflictError) toast.error(t("conflict"));
      else toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      <div className="overflow-auto rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr className="border-b border-gray-100">
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium" style={{ width: c.width }}>
                  {c.label}
                  {c.required ? <span className="text-rose-600"> *</span> : null}
                </th>
              ))}
              {extra ? <th aria-label={tc("actions")} /> : null}
              <th className="w-10" aria-label={tc("actions")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="text-muted-foreground px-3 py-6 text-center text-sm"
                >
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1">
                      {c.options ? (
                        <SimpleSelect
                          value={String(r[c.key] ?? "")}
                          onChange={(v) => update(r.id, { [c.key]: v } as Partial<T>)}
                          options={c.options}
                          allowEmpty
                          size="sm"
                          aria-label={c.label}
                        />
                      ) : (
                        <Input
                          type={c.type ?? "text"}
                          value={
                            r[c.key] === undefined || r[c.key] === null ? "" : String(r[c.key])
                          }
                          onChange={(e) =>
                            update(r.id, {
                              [c.key]:
                                c.type === "number"
                                  ? e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                  : e.target.value,
                            } as Partial<T>)
                          }
                          className="h-8 text-sm"
                          aria-label={c.label}
                        />
                      )}
                    </td>
                  ))}
                  {extra ? (
                    <td className="px-2 py-1">{extra(r, (patch) => update(r.id, patch))}</td>
                  ) : null}
                  <td className="px-2 py-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                      aria-label={tc("remove")}
                    >
                      <X />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRows((rs) => [...rs, { id: newId(), ...blank() } as T])}
        >
          <Plus data-icon="inline-start" /> {t("add")}
        </Button>
        <Button
          size="sm"
          className="ibl-button-primary"
          disabled={!dirty || !valid || saving}
          onClick={() => void submit()}
        >
          {saving ? <Spinner size="sm" className="size-4 text-current" /> : null}
          {tc("save")}
        </Button>
      </div>
    </div>
  );
}
