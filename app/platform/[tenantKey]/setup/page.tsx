"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  CalendarRange,
  Clock,
  DoorOpen,
  IdCard,
  Layers,
  Library,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/sis/page-header";
import { LoadError } from "@/components/sis/load-error";
import { LoadingScreen } from "@/components/loading-screen";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { ListEditor, type Column } from "@/components/sis/setup/list-editor";
import { FieldsTab } from "@/components/sis/setup/fields-tab";
import { useSession } from "@/hooks/use-session";
import { useSisMetadata } from "@/hooks/use-sis-metadata";
import { useToastError } from "@/hooks/use-toast-error";
import { useCreateUserGroupMutation } from "@/lib/sis/api";
import {
  EMPTY_SIS_METADATA,
  type GradeLevel,
  type Period,
  type Room,
  type SchoolYear,
  type SisMetadata,
  type Subject,
  type Term,
} from "@/lib/sis/metadata";

const TABS = ["school", "terms", "levels", "periods", "rooms", "subjects", "fields"] as const;
type Tab = (typeof TABS)[number];

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SetupView />
    </Suspense>
  );
}

/** The school's own data, each tab one list of the platform metadata's `sis` block. */
function SetupView() {
  const t = useTranslations("setup");
  const tn = useTranslations("nav");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { href } = useSession();
  const metadata = useSisMetadata();
  useBreadcrumbs([{ label: tn("setup"), href: href("/setup") }]);
  const tab = useMemo<Tab>(() => {
    const raw = searchParams.get("tab");
    return TABS.includes(raw as Tab) ? (raw as Tab) : "school";
  }, [searchParams]);
  const setTab = useCallback(
    (value: Tab) =>
      router.replace(value === "school" ? href("/setup") : `${href("/setup")}?tab=${value}`),
    [router, href],
  );
  const icons = {
    school: Building2,
    terms: CalendarRange,
    levels: Layers,
    periods: Clock,
    rooms: DoorOpen,
    subjects: Library,
    fields: IdCard,
  } as const;
  const meta = metadata.meta ?? EMPTY_SIS_METADATA;

  return (
    <>
      <PageHeader icon={<Settings />} title={tn("setup")} description={t("description")} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {metadata.error ? (
          <LoadError error={metadata.error} />
        ) : metadata.isLoading ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : metadata.invalid ? (
          <LoadError error={{ status: 0, detail: t("invalidVersion") }} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
            <TabsList variant="line" className="h-9 flex-wrap border-b border-gray-200 pb-1">
              {TABS.map((key) => {
                const Icon = icons[key];
                return (
                  <TabsTrigger key={key} value={key}>
                    <Icon strokeWidth={1.75} /> {t(`tabs.${key}`)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="school">
              <SchoolTab key={JSON.stringify([meta.school, meta.gpaScale])} meta={meta} />
            </TabsContent>
            <TabsContent value="terms">
              <TermsTab key={JSON.stringify([meta.years, meta.terms])} meta={meta} />
            </TabsContent>
            <TabsContent value="levels">
              <LevelsTab key={JSON.stringify(meta.gradeLevels)} meta={meta} />
            </TabsContent>
            <TabsContent value="periods">
              <PeriodsTab key={JSON.stringify(meta.periods)} meta={meta} />
            </TabsContent>
            <TabsContent value="rooms">
              <RoomsTab key={JSON.stringify(meta.rooms)} meta={meta} />
            </TabsContent>
            <TabsContent value="subjects">
              <SubjectsTab key={JSON.stringify(meta.subjects)} meta={meta} />
            </TabsContent>
            <TabsContent value="fields">
              <FieldsTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

function SchoolTab({ meta }: { meta: SisMetadata }) {
  const t = useTranslations("setup.school");
  const tc = useTranslations("common");
  const toastError = useToastError();
  const { saveSchool, isSaving } = useSisMetadata();
  const [school, setSchool] = useState(meta.school);
  const [scale, setScale] = useState(
    Object.entries(meta.gpaScale).map(([letter, points]) => ({ letter, points: String(points) })),
  );
  const submit = async () => {
    try {
      await saveSchool(
        {
          address: school.address || undefined,
          phone: school.phone || undefined,
          timezone: school.timezone || undefined,
        },
        Object.fromEntries(
          scale
            .filter((s) => s.letter.trim())
            .map((s) => [s.letter.trim().toUpperCase(), Number(s.points) || 0]),
        ),
      );
      toast.success(t("saved"));
    } catch (err) {
      toastError(err);
    }
  };
  const field = (key: "address" | "phone" | "timezone", label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`school-${key}`}>{label}</Label>
      <Input
        id={`school-${key}`}
        value={school[key] ?? ""}
        onChange={(e) => setSchool((s) => ({ ...s, [key]: e.target.value }))}
      />
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">{t("title")}</h2>
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        {field("address", t("address"))}
        {field("phone", t("phone"))}
        {field("timezone", t("timezone"))}
      </section>
      <section className="space-y-4 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">{t("gpaScale")}</h2>
        <p className="text-muted-foreground text-xs">{t("gpaHint")}</p>
        <div className="space-y-2">
          {scale.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={row.letter}
                onChange={(e) =>
                  setScale((s) => s.map((x, j) => (j === i ? { ...x, letter: e.target.value } : x)))
                }
                className="h-8 w-16 text-center text-sm"
                aria-label={t("letter")}
              />
              <Input
                type="number"
                step="0.1"
                value={row.points}
                onChange={(e) =>
                  setScale((s) => s.map((x, j) => (j === i ? { ...x, points: e.target.value } : x)))
                }
                className="h-8 w-24 text-sm"
                aria-label={t("points")}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScale((s) => s.filter((_, j) => j !== i))}
              >
                {tc("remove")}
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => [...s, { letter: "", points: "0" }])}
          >
            {t("addLetter")}
          </Button>
        </div>
      </section>
      <div className="flex justify-end lg:col-span-2">
        <Button className="ibl-button-primary" disabled={isSaving} onClick={() => void submit()}>
          {isSaving ? <Spinner size="sm" className="size-4 text-current" /> : null}
          {tc("save")}
        </Button>
      </div>
    </div>
  );
}

function TermsTab({ meta }: { meta: SisMetadata }) {
  const t = useTranslations("setup.terms");
  const { saveList } = useSisMetadata();
  const yearColumns: Column<SchoolYear>[] = [
    { key: "name", label: t("yearName"), required: true },
    { key: "start", label: t("start"), type: "date", required: true },
    { key: "end", label: t("end"), type: "date", required: true },
  ];
  const termColumns: Column<Term>[] = [
    { key: "name", label: t("termName"), required: true },
    {
      key: "yearId",
      label: t("year"),
      options: meta.years.map((y) => ({ value: y.id, label: y.name })),
      required: true,
    },
    { key: "start", label: t("start"), type: "date", required: true },
    { key: "end", label: t("end"), type: "date", required: true },
  ];
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t("years")}</h2>
        <ListEditor
          rows={meta.years}
          columns={yearColumns}
          blank={() => ({ name: "", start: "", end: "" })}
          save={(rows, base) => saveList("years", rows, base)}
          description={t("yearsHint")}
        />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t("title")}</h2>
        <ListEditor
          rows={meta.terms}
          columns={termColumns}
          blank={() => ({ name: "", yearId: meta.years[0]?.id ?? "", start: "", end: "" })}
          save={(rows, base) => saveList("terms", rows, base)}
          description={t("hint")}
        />
      </section>
    </div>
  );
}

function LevelsTab({ meta }: { meta: SisMetadata }) {
  const t = useTranslations("setup.levels");
  const { tenantKey } = useSession();
  const { saveList } = useSisMetadata();
  const toastError = useToastError();
  const [createGroup, createState] = useCreateUserGroupMutation();
  const columns: Column<GradeLevel>[] = [
    { key: "name", label: t("name"), required: true },
    { key: "order", label: t("order"), type: "number", width: "6rem" },
  ];
  // The cohort group is created at once and its id written into the row the editor saves.
  const makeGroup = async (row: GradeLevel, update: (patch: Partial<GradeLevel>) => void) => {
    try {
      const group = await createGroup({
        platform_key: tenantKey,
        name: t("groupName", { name: row.name }),
      }).unwrap();
      update({ groupId: group.id });
      toast.success(t("groupCreated", { name: group.name }));
    } catch (err) {
      toastError(err);
    }
  };
  return (
    <ListEditor
      rows={[...meta.gradeLevels].sort((a, b) => a.order - b.order)}
      columns={columns}
      blank={() => ({ name: "", order: meta.gradeLevels.length + 1 })}
      save={(rows, base) => saveList("gradeLevels", rows, base)}
      description={t("hint")}
      extra={(row, update) =>
        row.groupId ? (
          <span className="text-muted-foreground text-xs">
            {t("groupLinked", { id: row.groupId })}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={!row.name.trim() || createState.isLoading}
            onClick={() => void makeGroup(row, update)}
          >
            {t("createGroup")}
          </Button>
        )
      }
    />
  );
}

function PeriodsTab({ meta }: { meta: SisMetadata }) {
  const t = useTranslations("setup.periods");
  const { saveList } = useSisMetadata();
  const columns: Column<Period>[] = [
    { key: "name", label: t("name"), required: true },
    { key: "startTime", label: t("startTime"), type: "time", required: true },
    { key: "endTime", label: t("endTime"), type: "time", required: true },
  ];
  return (
    <ListEditor
      rows={meta.periods}
      columns={columns}
      blank={() => ({ name: "", startTime: "", endTime: "" })}
      save={(rows, base) => saveList("periods", rows, base)}
      description={t("hint")}
    />
  );
}

function RoomsTab({ meta }: { meta: SisMetadata }) {
  const t = useTranslations("setup.rooms");
  const { saveList } = useSisMetadata();
  const columns: Column<Room>[] = [
    { key: "name", label: t("name"), required: true },
    { key: "capacity", label: t("capacity"), type: "number", width: "8rem" },
  ];
  return (
    <ListEditor
      rows={meta.rooms}
      columns={columns}
      blank={() => ({ name: "" })}
      save={(rows, base) => saveList("rooms", rows, base)}
      description={t("hint")}
    />
  );
}

function SubjectsTab({ meta }: { meta: SisMetadata }) {
  const t = useTranslations("setup.subjects");
  const { saveList } = useSisMetadata();
  const columns: Column<Subject>[] = [{ key: "name", label: t("name"), required: true }];
  return (
    <ListEditor
      rows={meta.subjects}
      columns={columns}
      blank={() => ({ name: "" })}
      save={(rows, base) => saveList("subjects", rows, base)}
      description={t("hint")}
    />
  );
}
