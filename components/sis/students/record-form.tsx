"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect, type SelectOption } from "@/components/sis/simple-select";
import { WhereTip } from "@/components/sis/where-tip";
import { useGateLoading } from "@/components/sis/page-gate";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useCreateFieldMutation,
  useDemographicsQuery,
  useFieldDefinitionsQuery,
  usePutDemographicsMutation,
  useUpdateFieldMutation,
  useUpdateUserGroupMutation,
  sisApi,
} from "@/lib/sis/api";
import { countryOptions, languageOptions } from "@/lib/sis/iso";
import { withEveryField } from "@/lib/sis/demographics";
import { RESIDENCE, RESIDENCE_FIELD, isEnrollmentStatus, isSeedSlug } from "@/lib/sis/seed";
import { useDispatch } from "react-redux";
import type { IblaiAppDispatch } from "@/store/iblai-store";
import type { Demographics, FieldDefinition, UserPlatformLink } from "@/lib/sis/types";

type BaseField = "date_of_birth" | "gender" | "primary_language" | "nationality";

/**
 * The student record: the DM demographics (base fields + the platform's
 * custom field definitions). PUT resets what it does not receive, so the
 * save sends the whole record. A new grade level also moves the student
 * between the grade-level cohort groups.
 */
export function RecordForm({
  username,
  link,
  readOnly = false,
}: {
  username: string;
  link?: UserPlatformLink;
  /** Every control inert and no Save: a student reading their own record, an admin outside Admin mode. */
  readOnly?: boolean;
}) {
  const { tenantKey, isAdmin } = useSession();
  const record = useDemographicsQuery({ platformKey: tenantKey, username });
  // The field list is an admin read; a student sees the values their own record holds.
  const fields = useFieldDefinitionsQuery(tenantKey, { skip: !isAdmin });
  useGateLoading(record.isLoading || fields.isLoading);
  if (record.error) return <LoadError error={record.error} />;
  if (!record.data) return null;
  return (
    <RecordFormFields
      key={record.data.updated_at}
      username={username}
      link={link}
      record={record.data}
      definitions={isAdmin ? fields.data : null}
      fieldsError={fields.error}
      readOnly={readOnly}
    />
  );
}

function RecordFormFields({
  username,
  link,
  record: previous,
  definitions: allDefinitions,
  fieldsError,
  readOnly,
}: {
  username: string;
  link?: UserPlatformLink;
  record: Demographics;
  /** Undefined while the list is unknown, so no field gets created on a guess; null when the caller may not read it. */
  definitions?: FieldDefinition[] | null;
  fieldsError: unknown;
  readOnly: boolean;
}) {
  const t = useTranslations("students.record");
  const tf = useTranslations("students.fields");
  const ts = useTranslations("students.enrollmentStatus");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { tenantKey } = useSession();
  const toastError = useToastError();
  const dispatch = useDispatch<IblaiAppDispatch>();
  const { meta, isLoading: metaLoading } = useSisMetadata();
  useGateLoading(metaLoading);
  const [save, saveState] = usePutDemographicsMutation();
  const [createField, createState] = useCreateFieldMutation();
  const [updateField, updateState] = useUpdateFieldMutation();
  const [updateGroup] = useUpdateUserGroupMutation();
  const [base, setBase] = useState<Record<BaseField, string>>({
    date_of_birth: previous.date_of_birth ?? "",
    gender: previous.gender ?? "",
    primary_language: previous.primary_language ?? "",
    nationality: previous.nationality ?? "",
  });
  const [custom, setCustom] = useState<Record<string, unknown>>(previous.custom_fields ?? {});
  const setBaseField = (key: BaseField) => (value: string) =>
    setBase((b) => ({ ...b, [key]: value }));
  const residence = custom[RESIDENCE];
  const busy = saveState.isLoading || createState.isLoading || updateState.isLoading;

  const lists = useMemo(
    () => ({
      sex: [
        { value: "male", label: t("male") },
        { value: "female", label: t("female") },
      ],
      languages: languageOptions(locale),
      countries: countryOptions(locale),
    }),
    [locale, t],
  );
  const definitions = useMemo(
    () =>
      (allDefinitions ?? [])
        .filter((f) => f.active !== false && f.slug !== RESIDENCE)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [allDefinitions],
  );
  // Without the field list (a student), the record's own values with the seeded labels.
  const own =
    allDefinitions === null ? Object.entries(custom).filter(([slug]) => slug !== RESIDENCE) : null;

  // `grade_level` lists the school's levels; `enrollment_status` shows its values translated.
  const optionsFor = (f: FieldDefinition): SelectOption[] => {
    const choices =
      f.slug === "grade_level" && meta?.gradeLevels.length
        ? meta.gradeLevels.map((g) => g.name)
        : (f.choices ?? []);
    return choices.map((c) => ({
      value: c,
      label: f.slug === "enrollment_status" && isEnrollmentStatus(c) ? ts(c) : c,
    }));
  };

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
    // The DM refuses a slug it has no definition for; the first value picked creates the field.
    const noResidenceField = allDefinitions && !allDefinitions.some((f) => f.slug === RESIDENCE);
    const customFields =
      noResidenceField && !residence
        ? Object.fromEntries(Object.entries(custom).filter(([slug]) => slug !== RESIDENCE))
        : custom;
    // The DM's text fields refuse null; only the date takes it.
    const body: Partial<Demographics> = {
      gender: base.gender,
      ethnicity: previous.ethnicity ?? "",
      date_of_birth: base.date_of_birth || null,
      primary_language: base.primary_language,
      country_of_birth: previous.country_of_birth ?? "",
      nationality: base.nationality,
      disability_status: previous.disability_status ?? "",
      custom_fields: withEveryField(customFields, definitions),
    };
    try {
      if (noResidenceField && residence) {
        await createField({ platformKey: tenantKey, body: RESIDENCE_FIELD }).unwrap();
      }
      // The DM checks a select against its definition's choices; Setup's levels are the choices.
      const levelField = definitions.find((f) => f.slug === "grade_level");
      const level = custom.grade_level;
      if (levelField && typeof level === "string" && level && meta?.gradeLevels.length) {
        if (!(levelField.choices ?? []).includes(level)) {
          await updateField({
            platformKey: tenantKey,
            slug: levelField.slug,
            body: { choices: meta.gradeLevels.map((g) => g.name) },
          }).unwrap();
        }
      }
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
        if (!readOnly) void submit();
      }}
    >
      {readOnly ? null : (
        <p className="text-muted-foreground text-xs">
          {t("visibleToStudent")} <WhereTip k="record" />
        </p>
      )}
      <fieldset disabled={readOnly} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-gray-900">{t("baseFields")}</legend>
        <Field id="base-date_of_birth" label={tf("date_of_birth")}>
          <Input
            id="base-date_of_birth"
            type="date"
            value={base.date_of_birth}
            onChange={(e) => setBaseField("date_of_birth")(e.target.value)}
          />
        </Field>
        <Field id="base-gender" label={tf("gender")}>
          <SimpleSelect
            id="base-gender"
            value={base.gender}
            onChange={setBaseField("gender")}
            options={lists.sex}
            allowEmpty
          />
        </Field>
        <Field id="base-primary_language" label={tf("primary_language")}>
          <SimpleSelect
            id="base-primary_language"
            value={base.primary_language}
            onChange={setBaseField("primary_language")}
            options={lists.languages}
            allowEmpty
          />
        </Field>
        <Field id="base-nationality" label={tf("nationality")}>
          <SimpleSelect
            id="base-nationality"
            value={base.nationality}
            onChange={setBaseField("nationality")}
            options={lists.countries}
            allowEmpty
          />
        </Field>
        <Field id={`custom-${RESIDENCE}`} label={tf("country_of_residence")}>
          <SimpleSelect
            id={`custom-${RESIDENCE}`}
            value={typeof residence === "string" ? residence : ""}
            onChange={(v) => setCustom((c) => ({ ...c, [RESIDENCE]: v }))}
            options={lists.countries}
            allowEmpty
          />
        </Field>
      </fieldset>
      <fieldset disabled={readOnly} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-gray-900">{t("customFields")}</legend>
        {own ? (
          own.map(([slug, value]) => (
            <Field key={slug} id={`custom-${slug}`} label={isSeedSlug(slug) ? tf(slug) : slug}>
              <Input
                id={`custom-${slug}`}
                readOnly
                value={
                  slug === "enrollment_status" &&
                  typeof value === "string" &&
                  isEnrollmentStatus(value)
                    ? ts(value)
                    : String(value ?? "")
                }
              />
            </Field>
          ))
        ) : definitions.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:col-span-2">{t("noFields")}</p>
        ) : (
          definitions.map((f) => (
            <CustomField
              key={f.slug}
              definition={f}
              label={isSeedSlug(f.slug) ? tf(f.slug) : f.name}
              options={optionsFor(f)}
              value={custom[f.slug]}
              onChange={(v) => setCustom((c) => ({ ...c, [f.slug]: v }))}
            />
          ))
        )}
      </fieldset>
      {fieldsError ? <LoadError error={fieldsError} /> : null}
      {readOnly ? null : (
        <div className="flex justify-end">
          <Button type="submit" className="ibl-button-primary" disabled={busy}>
            {busy ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {tc("save")}
          </Button>
        </div>
      )}
    </form>
  );
}

/** A labelled control; the id ties the label to the input or to the select's button. */
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** One custom field as the input its type asks for; a seeded slug is labelled from the catalog. */
function CustomField({
  definition: f,
  label: text,
  options,
  value,
  onChange,
}: {
  definition: FieldDefinition;
  label: string;
  options: SelectOption[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `custom-${f.slug}`;
  const label = (
    <Label htmlFor={id}>
      {text}
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
  if (f.field_type === "select" || options.length) {
    return (
      <div className="space-y-1.5">
        {label}
        <SimpleSelect
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={options}
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
