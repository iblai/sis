"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/sis/page-header";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { LoadingScreen } from "@/components/loading-screen";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { SectionDialog } from "@/components/sis/courses/section-dialog";
import { MySections } from "@/components/sis/students/my-sections";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { filterSections } from "@/lib/sis/sections";
import { formatDate } from "@/lib/sis/format";

export default function CoursesPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CoursesView />
    </Suspense>
  );
}

/** Sections: the platform's course runs joined with the school's section data; a student sees their own. */
function CoursesView() {
  const t = useTranslations("courses");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, username, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const sections = useSections({ skip: !isAdmin });
  const [query, setQuery] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  useBreadcrumbs([{ label: tn("courses"), href: href("/courses") }]);
  const newOpen = searchParams.get("new") === "1";
  const closeNew = () => router.replace(href("/courses"));

  if (!isAdmin) {
    return (
      <>
        <PageHeader icon={<BookOpen />} title={tn("courses")} description={t("mine")} />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
            <MySections username={username} />
          </div>
        </div>
      </>
    );
  }

  const rows = filterSections(sections.rows, { termId, subjectId, gradeLevelId, query });
  const meta = sections.meta;

  return (
    <>
      <PageHeader
        icon={<BookOpen />}
        title={tn("courses")}
        count={sections.rows.length}
        description={t("description")}
        actions={
          isLiveAdmin ? (
            <Button
              size="sm"
              className="ibl-button-primary"
              onClick={() => router.replace(href("/courses?new=1"))}
            >
              <Plus data-icon="inline-start" /> {t("newSection")}
            </Button>
          ) : null
        }
        toolbar={
          <>
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-8 pl-8 text-sm"
                aria-label={tc("search")}
              />
            </div>
            {meta?.terms.length ? (
              <SimpleSelect
                value={termId}
                onChange={setTermId}
                options={meta.terms.map((x) => ({ value: x.id, label: x.name }))}
                allowEmpty
                emptyLabel={t("filters.allTerms")}
                size="sm"
                className="w-[calc(50%-0.25rem)] sm:w-40"
                aria-label={t("columns.term")}
              />
            ) : null}
            {meta?.subjects.length ? (
              <SimpleSelect
                value={subjectId}
                onChange={setSubjectId}
                options={meta.subjects.map((x) => ({ value: x.id, label: x.name }))}
                allowEmpty
                emptyLabel={t("filters.allSubjects")}
                size="sm"
                className="w-[calc(50%-0.25rem)] sm:w-40"
                aria-label={t("columns.subject")}
              />
            ) : null}
            {meta?.gradeLevels.length ? (
              <SimpleSelect
                value={gradeLevelId}
                onChange={setGradeLevelId}
                options={meta.gradeLevels.map((x) => ({ value: x.id, label: x.name }))}
                allowEmpty
                emptyLabel={t("filters.allLevels")}
                size="sm"
                className="w-[calc(50%-0.25rem)] sm:w-40"
                aria-label={t("columns.gradeLevel")}
              />
            ) : null}
          </>
        }
      />
      <div className="flex-1 overflow-auto">
        {sections.error ? (
          <LoadError error={sections.error} className="m-4" />
        ) : sections.isLoading ? (
          <div className="space-y-2 p-4 md:p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen strokeWidth={1.75} />}
            title={sections.rows.length ? t("empty.noMatch") : t("empty.title")}
            description={sections.rows.length ? undefined : t("empty.body")}
            className="m-4 md:m-6"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.section")}</TableHead>
                <TableHead>{t("columns.term")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.subject")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.gradeLevel")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.schedule")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.credits")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.dates")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.course.id}>
                  <TableCell>
                    <Link
                      href={href(`/courses/${encodeURIComponent(r.course.id)}`)}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {r.course.name}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {r.course.number} · {r.course.run}
                      {r.course.pacing === "self" ? ` · ${t("selfPaced")}` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.term?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {r.subject?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {r.gradeLevel?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {[
                      r.period?.name,
                      r.room?.name,
                      r.section?.days?.map((d) => t(`weekday.${d}`)).join(" "),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden tabular-nums md:table-cell">
                    {r.section?.credits ?? "—"}
                    {r.section?.seats ? ` · ${t("seats", { count: r.section.seats })}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {formatDate(r.course.start, locale)} – {formatDate(r.course.end, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <SectionDialog open={newOpen} onOpenChange={(o) => (o ? null : closeNew())} />
    </>
  );
}
