"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { WhereTip } from "@/components/sis/where-tip";
import { useGateLoading } from "@/components/sis/page-gate";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useDemographicsQuery,
  useFieldDefinitionsQuery,
  usePutDemographicsMutation,
  useUpdateUserGroupMutation,
  sisApi,
} from "@/lib/sis/api";
import { useDispatch } from "react-redux";
import type { IblaiAppDispatch } from "@/store/iblai-store";
import type { Demographics, FieldDefinition, UserPlatformLink } from "@/lib/sis/types";

const BASE_FIELDS = ["date_of_birth", "gender", "primary_language", "nationality"] as const;
type BaseField = (typeof BASE_FIELDS)[number];

/**
 * The student record: the DM demographics (base fields + the platform's
 * custom field definitions). PUT resets what it does not receive, so the
 * save sends the whole record. A new grade level also moves the student
 * between the grade-level cohort groups.
 */
export function RecordForm({ username, link }: { username: string; link?: UserPlatformLink }) {
  const { tenantKey } = useSession();
  const record = useDemographicsQuery({ platformKey: tenantKey, username });
  const fields = useFieldDefinitionsQuery(tenantKey);
  useGateLoading(record.isLoading || fields.isLoading);
  if (record.error) return <LoadError error={record.error} />;
  if (!record.data) return null;
  return (
    <RecordFormFields
      key={record.data.updated_at}
      username={username}
      link={link}
      record={record.data}
      definitions={fields.data ?? []}
      fieldsError={fields.error}
    />
  );
}

function RecordFormFields({
  username,
  link,
  record: previous,
  definitions: allDefinitions,
  fieldsError,
}: {
  username: string;
  link?: UserPlatformLink;
  record: Demographics;
  definitions: FieldDefinition[];
  fieldsError: unknown;
}) {
  const t = useTranslations("students.record");
  const tf = useTranslations("students.fields");
  const tc = useTranslations("common");
  const { tenantKey } = useSession();
  const toastError = useToastError();
  const dispatch = useDispatch<IblaiAppDispatch>();
  const { meta, isLoading: metaLoading } = useSisMetadata();
  useGateLoading(metaLoading);
  const [save, saveState] = usePutDemographicsMutation();
  const [updateGroup] = useUpdateUserGroupMutation();
  const [base, setBase] = useState<Record<BaseField, string>>({
    date_of_birth: previous.date_of_birth ?? "",
    gender: previous.gender ?? "",
    primary_language: previous.primary_language ?? "",
    nationality: previous.nationality ?? "",
  });
  const [custom, setCustom] = useState<Record<string, unknown>>(previous.custom_fields ?? {});

  const definitions = useMemo(
    () =>
      [...allDefinitions]
        .filter((f) => f.active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [allDefinitions],
  );

  const moveCohort = async (from: string | undefined, next: string | undefined) => {
    if (!meta || !link || from === next) return;
    const levelOf = (name?: string) => meta.gradeLevels.find((g) => g.name === name);
    const steps = [
      [levelOf(from)?.groupId, false],
      [levelOf(next)?.groupId, true],
    ] as const;
    for (const [groupId, add] of steps) {
      if (!groupId) continue;
      const group = await dispatch(
        sisApi.endpoints.userGroup.initiate(groupId, { forceRefetch: true }),
      ).unwrap();
      const ids = new Set((group.users ?? []).map((u) => u.id));
      if (add) ids.add(link.user_id);
      else ids.delete(link.user_id);
      await updateGroup({ id: groupId, body: { users_to_set: [...ids] } }).unwrap();
    }
  };

  const submit = async () => {
    // The DM's text fields refuse null; only the date takes it.
    const body: Partial<Demographics> = {
      gender: base.gender,
      ethnicity: previous.ethnicity ?? "",
      date_of_birth: base.date_of_birth || null,
      primary_language: base.primary_language,
      country_of_birth: previous.country_of_birth ?? "",
      nationality: base.nationality,
      disability_status: previous.disability_status ?? "",
      custom_fields: custom,
    };
    try {
      await save({ platformKey: tenantKey, username, body }).unwrap();
      await moveCohort(
        previous.custom_fields?.grade_level as string | undefined,
        custom.grade_level as string | undefined,
      );
      toast.success(t("saved"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <form
      className="space-y-6 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4 md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-muted-foreground text-xs">
        {t("visibleToStudent")} <WhereTip k="record" />
      </p>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-gray-900">{t("baseFields")}</legend>
        {BASE_FIELDS.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`base-${key}`}>{tf(key)}</Label>
            <Input
              id={`base-${key}`}
              type={key === "date_of_birth" ? "date" : "text"}
              value={base[key]}
              onChange={(e) => setBase((b) => ({ ...b, [key]: e.target.value }))}
            />
          </div>
        ))}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-gray-900">{t("customFields")}</legend>
        {definitions.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:col-span-2">{t("noFields")}</p>
        ) : (
          definitions.map((f) => (
            <CustomField
              key={f.slug}
              definition={f}
              value={custom[f.slug]}
              gradeLevels={meta?.gradeLevels.map((g) => g.name)}
              onChange={(v) => setCustom((c) => ({ ...c, [f.slug]: v }))}
            />
          ))
        )}
      </fieldset>
      {fieldsError ? <LoadError error={fieldsError} /> : null}
      <div className="flex justify-end">
        <Button type="submit" className="ibl-button-primary" disabled={saveState.isLoading}>
          {saveState.isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

/** One custom field as the input its type asks for; `grade_level` lists the school's levels. */
function CustomField({
  definition: f,
  value,
  gradeLevels,
  onChange,
}: {
  definition: FieldDefinition;
  value: unknown;
  gradeLevels?: string[];
  onChange: (value: unknown) => void;
}) {
  const id = `custom-${f.slug}`;
  const label = (
    <Label htmlFor={id}>
      {f.name}
      {f.required ? <span className="text-rose-600"> *</span> : null}
    </Label>
  );
  if (f.field_type === "boolean") {
    return (
      <div className="flex items-center gap-2 pt-6">
        <Checkbox id={id} checked={Boolean(value)} onCheckedChange={(v) => onChange(Boolean(v))} />
        {label}
      </div>
    );
  }
  const choices = f.slug === "grade_level" && gradeLevels?.length ? gradeLevels : (f.choices ?? []);
  if (f.field_type === "select" || choices.length) {
    return (
      <div className="space-y-1.5">
        {label}
        <SimpleSelect
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={choices.map((c) => ({ value: c, label: c }))}
          allowEmpty
        />
        {f.description ? <p className="text-muted-foreground text-xs">{f.description}</p> : null}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {label}
      <Input
        id={id}
        type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
        value={value === undefined || value === null ? "" : String(value)}
        required={f.required}
        onChange={(e) =>
          onChange(
            f.field_type === "number" && e.target.value !== ""
              ? Number(e.target.value)
              : e.target.value,
          )
        }
      />
      {f.description ? <p className="text-muted-foreground text-xs">{f.description}</p> : null}
    </div>
  );
}
