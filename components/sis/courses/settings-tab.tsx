"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { UserPicker } from "@/components/sis/user-picker";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { WhereTip, type WhereKey } from "@/components/sis/where-tip";
import { useGateLoading } from "@/components/sis/page-gate";
import { MetadataConflictError, useSisMetadata } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import { useModifyAccessMutation, useRoleMembersQuery } from "@/lib/sis/lms-api";
import {
  useCourseDetailsQuery,
  useCourseGradingQuery,
  useUpdateCourseDetailsMutation,
  useUpdateCourseGradingMutation,
} from "@/lib/sis/studio-api";
import { WEEKDAYS, type Section, type Weekday } from "@/lib/sis/metadata";
import { upsertSection, type SectionRow } from "@/lib/sis/sections";
import type { CourseGrading, CourseRole, PlatformUser, StudioCourseDetails } from "@/lib/sis/types";

const Card = ({
  title,
  where,
  children,
}: {
  title: string;
  where?: WhereKey;
  children: React.ReactNode;
}) => (
  <section className="space-y-3 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
    <h2 className="flex items-center gap-1 text-sm font-semibold text-gray-900">
      <span>{title}</span>
      {where ? <WhereTip k={where} /> : null}
    </h2>
    {children}
  </section>
);

/** Term and dates (Studio), grading policy (Studio), teachers (LMS roles), the section row (metadata). */
export function SettingsTab({ courseId, row }: { courseId: string; row?: SectionRow }) {
  const t = useTranslations("courses.settings");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DatesCard courseId={courseId} />
      <SectionCard courseId={courseId} row={row} />
      <TeachersCard courseId={courseId} />
      <GradingCard courseId={courseId} />
      <p className="text-muted-foreground text-xs lg:col-span-2">{t("hint")}</p>
    </div>
  );
}

const day = (v?: string | null) => (v ? v.slice(0, 10) : "");

function DatesCard({ courseId }: { courseId: string }) {
  const t = useTranslations("courses.settings");
  const details = useCourseDetailsQuery(courseId);
  useGateLoading(details.isLoading);
  if (details.error)
    return (
      <Card title={t("dates")} where="courseDates">
        <LoadError error={details.error} />
      </Card>
    );
  if (!details.data) return null;
  return (
    <DatesForm key={JSON.stringify(details.data)} courseId={courseId} details={details.data} />
  );
}

function DatesForm({ courseId, details }: { courseId: string; details: StudioCourseDetails }) {
  const t = useTranslations("courses.settings");
  const tc = useTranslations("common");
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const { meta } = useSisMetadata();
  const [form, setForm] = useState({
    start: day(details.start_date),
    end: day(details.end_date),
    enrollStart: day(details.enrollment_start),
    enrollEnd: day(details.enrollment_end),
    selfPaced: !!details.self_paced,
  });
  const [save, { isLoading }] = useUpdateCourseDetailsMutation();
  const applyTerm = (termId: string) => {
    const term = meta?.terms.find((x) => x.id === termId);
    if (term) setForm((f) => ({ ...f, start: term.start, end: term.end }));
  };
  const submit = async () => {
    try {
      await save({
        courseId,
        body: {
          ...details,
          start_date: form.start ? `${form.start}T00:00:00Z` : null,
          end_date: form.end ? `${form.end}T23:59:59Z` : null,
          enrollment_start: form.enrollStart ? `${form.enrollStart}T00:00:00Z` : null,
          enrollment_end: form.enrollEnd ? `${form.enrollEnd}T23:59:59Z` : null,
          self_paced: form.selfPaced,
        },
      }).unwrap();
      toast.success(t("saved"));
    } catch (err) {
      toastError(err);
    }
  };
  const field = (key: "start" | "end" | "enrollStart" | "enrollEnd", label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`dates-${key}`}>{label}</Label>
      <Input
        id={`dates-${key}`}
        type="date"
        value={form[key]}
        disabled={!isLiveAdmin}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );
  return (
    <Card title={t("dates")} where="courseDates">
      {meta?.terms.length && isLiveAdmin ? (
        <SimpleSelect
          value=""
          onChange={applyTerm}
          options={meta.terms.map((x) => ({ value: x.id, label: x.name }))}
          placeholder={t("applyTerm")}
          size="sm"
          className="w-56"
          aria-label={t("applyTerm")}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("start", t("start"))}
        {field("end", t("end"))}
        {field("enrollStart", t("enrollStart"))}
        {field("enrollEnd", t("enrollEnd"))}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="dates-self-paced"
          checked={form.selfPaced}
          disabled={!isLiveAdmin}
          onCheckedChange={(v) => setForm((f) => ({ ...f, selfPaced: Boolean(v) }))}
        />
        <Label htmlFor="dates-self-paced">{t("selfPaced")}</Label>
      </div>
      {isLiveAdmin ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {tc("save")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function SectionCard({ courseId, row }: { courseId: string; row?: SectionRow }) {
  const t = useTranslations("courses.settings");
  const tw = useTranslations("courses.weekday");
  const tc = useTranslations("common");
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const { meta, saveList, isSaving, isLoading } = useSisMetadata();
  useGateLoading(isLoading);
  const current = row?.section;
  const [form, setForm] = useState<Section>({
    courseId,
    termId: current?.termId,
    subjectId: current?.subjectId,
    gradeLevelId: current?.gradeLevelId,
    roomId: current?.roomId,
    periodId: current?.periodId,
    days: current?.days ?? [],
    credits: current?.credits,
    seats: current?.seats,
  });
  if (!meta)
    return (
      <Card title={t("section")} where="section">
        <p className="text-muted-foreground text-sm">{t("noSetup")}</p>
      </Card>
    );
  const pick = (key: keyof Section, label: string, rows: { id: string; name: string }[]) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <SimpleSelect
        value={(form[key] as string | undefined) ?? ""}
        onChange={(v) => setForm((f) => ({ ...f, [key]: v || undefined }))}
        options={rows.map((x) => ({ value: x.id, label: x.name }))}
        allowEmpty
        size="sm"
        disabled={!isLiveAdmin}
      />
    </div>
  );
  const toggleDay = (d: Weekday) =>
    setForm((f) => ({
      ...f,
      days: f.days?.includes(d) ? f.days.filter((x) => x !== d) : [...(f.days ?? []), d],
    }));
  const submit = async () => {
    try {
      const next: Section = {
        ...form,
        days: form.days?.length ? form.days : undefined,
        credits: form.credits || undefined,
        seats: form.seats || undefined,
      };
      await saveList("sections", upsertSection(meta.sections, next), meta.sections);
      toast.success(t("saved"));
    } catch (err) {
      if (err instanceof MetadataConflictError) toast.error(t("conflict"));
      else toastError(err);
    }
  };
  return (
    <Card title={t("section")} where="section">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pick("termId", t("term"), meta.terms)}
        {pick("subjectId", t("subject"), meta.subjects)}
        {pick("gradeLevelId", t("gradeLevel"), meta.gradeLevels)}
        {pick("periodId", t("period"), meta.periods)}
        {pick("roomId", t("room"), meta.rooms)}
        <div className="space-y-1">
          <Label htmlFor="section-credits">{t("credits")}</Label>
          <Input
            id="section-credits"
            type="number"
            min={0}
            step="0.5"
            value={form.credits ?? ""}
            disabled={!isLiveAdmin}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                credits: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="section-seats">{t("seats")}</Label>
          <Input
            id="section-seats"
            type="number"
            min={0}
            value={form.seats ?? ""}
            disabled={!isLiveAdmin}
            onChange={(e) =>
              setForm((f) => ({ ...f, seats: e.target.value ? Number(e.target.value) : undefined }))
            }
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("days")}</Label>
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!isLiveAdmin}
              onClick={() => toggleDay(d)}
              className={
                form.days?.includes(d)
                  ? "rounded-md bg-[#eef6fc] px-2 py-1 text-xs font-medium text-[#0058cc]"
                  : "rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600"
              }
              aria-pressed={form.days?.includes(d)}
            >
              {tw(d)}
            </button>
          ))}
        </div>
      </div>
      {isLiveAdmin ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={isSaving}
            onClick={() => void submit()}
          >
            {isSaving ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {tc("save")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function TeachersCard({ courseId }: { courseId: string }) {
  const t = useTranslations("courses.settings");
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const staff = useRoleMembersQuery({ courseId, rolename: "staff" });
  const instructors = useRoleMembersQuery({ courseId, rolename: "instructor" });
  useGateLoading(staff.isLoading || instructors.isLoading);
  const [picked, setPicked] = useState<PlatformUser | null>(null);
  const [modify, { isLoading }] = useModifyAccessMutation();
  const change = async (identifier: string, rolename: CourseRole, action: "allow" | "revoke") => {
    try {
      const res = await modify({
        courseId,
        unique_student_identifier: identifier,
        rolename,
        action,
      }).unwrap();
      if (res.success === "no") throw new Error(t("roleRefused"));
      toast.success(action === "allow" ? t("teacherAdded") : t("teacherRemoved"));
      setPicked(null);
    } catch (err) {
      toastError(err);
    }
  };
  const list = (title: string, rolename: CourseRole, q: typeof staff) => (
    <div>
      <p className="text-muted-foreground text-xs font-medium">{title}</p>
      {q.error ? (
        <LoadError error={q.error} className="py-4" />
      ) : (q.data?.users.length ?? 0) === 0 ? (
        <p className="text-muted-foreground mt-1 text-sm">—</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {q.data!.users.map((u) => (
            <li key={u.username} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username}
                <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
              </span>
              {isLiveAdmin ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={isLoading}
                  onClick={() => void change(u.email, rolename, "revoke")}
                  aria-label={t("removeTeacher")}
                >
                  <X />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <Card title={t("teachers")} where="teachers">
      <p className="text-muted-foreground text-xs">{t("teachersHint")}</p>
      {list(t("courseStaff"), "staff", staff)}
      {list(t("courseInstructors"), "instructor", instructors)}
      {isLiveAdmin ? (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <UserPicker
              value={picked}
              onChange={setPicked}
              placeholder={t("pickTeacher")}
              size="sm"
            />
          </div>
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={!picked || isLoading}
            onClick={() => picked && void change(picked.email || picked.username, "staff", "allow")}
          >
            {isLoading ? (
              <Spinner size="sm" className="size-4 text-current" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {t("addTeacher")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function GradingCard({ courseId }: { courseId: string }) {
  const t = useTranslations("courses.settings");
  const grading = useCourseGradingQuery(courseId);
  useGateLoading(grading.isLoading);
  if (grading.error)
    return (
      <Card title={t("grading")} where="courseGrading">
        <LoadError error={grading.error} />
      </Card>
    );
  if (!grading.data) return null;
  return (
    <GradingForm key={JSON.stringify(grading.data)} courseId={courseId} grading={grading.data} />
  );
}

function GradingForm({ courseId, grading }: { courseId: string; grading: CourseGrading }) {
  const t = useTranslations("courses.settings");
  const tc = useTranslations("common");
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const [graders, setGraders] = useState(grading.graders);
  const [cutoffs, setCutoffs] = useState(
    Object.entries(grading.grade_cutoffs).map(([letter, cut]) => ({
      letter,
      cut: String(Math.round(cut * 100)),
    })),
  );
  const [save, { isLoading }] = useUpdateCourseGradingMutation();
  const total = graders.reduce((s, g) => s + (Number(g.weight) || 0), 0);
  const submit = async () => {
    try {
      await save({
        courseId,
        body: {
          ...grading,
          graders: graders.map((g) => ({
            ...g,
            min_count: Number(g.min_count),
            drop_count: Number(g.drop_count),
            weight: Number(g.weight),
          })),
          grade_cutoffs: Object.fromEntries(
            cutoffs
              .filter((c) => c.letter.trim())
              .map((c) => [c.letter.trim(), Number(c.cut) / 100]),
          ),
        },
      }).unwrap();
      toast.success(t("saved"));
    } catch (err) {
      toastError(err);
    }
  };
  const edit = (i: number, patch: Partial<CourseGrading["graders"][number]>) =>
    setGraders((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Card title={t("grading")} where="courseGrading">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground text-left text-[11px] font-semibold tracking-wide uppercase">
            <tr>
              <th className="py-1">{t("assignmentType")}</th>
              <th className="py-1">{t("count")}</th>
              <th className="py-1">{t("drop")}</th>
              <th className="py-1">{t("weight")}</th>
              <th aria-label={tc("actions")} />
            </tr>
          </thead>
          <tbody>
            {graders.map((g, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <Input
                    value={g.type}
                    disabled={!isLiveAdmin}
                    onChange={(e) =>
                      edit(i, {
                        type: e.target.value,
                        short_label: g.short_label || e.target.value.slice(0, 3),
                      })
                    }
                    className="h-7 min-w-28 text-xs"
                  />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    type="number"
                    min={1}
                    value={g.min_count}
                    disabled={!isLiveAdmin}
                    onChange={(e) => edit(i, { min_count: Number(e.target.value) })}
                    className="h-7 w-16 text-xs"
                  />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    type="number"
                    min={0}
                    value={g.drop_count}
                    disabled={!isLiveAdmin}
                    onChange={(e) => edit(i, { drop_count: Number(e.target.value) })}
                    className="h-7 w-16 text-xs"
                  />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={g.weight}
                    disabled={!isLiveAdmin}
                    onChange={(e) => edit(i, { weight: Number(e.target.value) })}
                    className="h-7 w-16 text-xs"
                  />
                </td>
                <td className="py-1">
                  {isLiveAdmin ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setGraders((x) => x.filter((_, j) => j !== i))}
                      aria-label={tc("remove")}
                    >
                      <X />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p className={total === 100 ? "text-muted-foreground text-xs" : "text-xs text-red-500"}>
          {t("weightTotal", { total })}
        </p>
        {isLiveAdmin ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setGraders((g) => [
                ...g,
                { type: "", min_count: 1, drop_count: 0, short_label: "", weight: 0 },
              ])
            }
          >
            <Plus data-icon="inline-start" /> {t("addGrader")}
          </Button>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label>{t("cutoffs")}</Label>
        <div className="flex flex-wrap gap-2">
          {cutoffs.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={c.letter}
                disabled={!isLiveAdmin}
                onChange={(e) =>
                  setCutoffs((x) =>
                    x.map((y, j) => (j === i ? { ...y, letter: e.target.value } : y)),
                  )
                }
                className="h-7 w-12 text-center text-xs"
                aria-label={t("letter")}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={c.cut}
                disabled={!isLiveAdmin}
                onChange={(e) =>
                  setCutoffs((x) => x.map((y, j) => (j === i ? { ...y, cut: e.target.value } : y)))
                }
                className="h-7 w-16 text-xs"
                aria-label={t("cutoff")}
              />
              <span className="text-muted-foreground text-xs">%</span>
            </div>
          ))}
          {isLiveAdmin ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCutoffs((x) => [...x, { letter: "", cut: "0" }])}
            >
              <Plus data-icon="inline-start" /> {t("addCutoff")}
            </Button>
          ) : null}
        </div>
      </div>
      {isLiveAdmin ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="ibl-button-primary"
            disabled={isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {tc("save")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
