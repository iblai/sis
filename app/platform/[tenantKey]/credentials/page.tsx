"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Award, BadgeCheck, Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/sis/page-header";
import { PaginationBar } from "@/components/sis/pagination-bar";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { UserPicker } from "@/components/sis/user-picker";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { PageGate } from "@/components/sis/page-gate";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useCredentialsQuery,
  useIssueAssertionMutation,
  useUserGroupQuery,
  useUserGroupsQuery,
} from "@/lib/sis/api";
import { useStartCertificateGenerationMutation } from "@/lib/sis/lms-api";
import { errorMessage } from "@/lib/sis/errors";
import type { Credential, PlatformUser } from "@/lib/sis/types";

const PAGE_SIZE = 24;

/** The platform's credentials: issue one to a student or a whole group, and generate LMS certificates per section. */
export default function CredentialsPage() {
  const t = useTranslations("credentials.page");
  const tn = useTranslations("nav");
  const { tenantKey, username, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const [page, setPage] = useState(1);
  const [issuing, setIssuing] = useState<Credential | null>(null);
  const [certCourse, setCertCourse] = useState("");
  const credentials = useCredentialsQuery({
    platformKey: tenantKey,
    username,
    page,
    page_size: PAGE_SIZE,
  });
  const sections = useSections();
  const [generate, generateState] = useStartCertificateGenerationMutation();
  useBreadcrumbs([{ label: tn("credentials"), href: href("/credentials") }]);
  const rows = credentials.data?.data ?? [];
  const count = credentials.data?.count ?? 0;

  const runCertificates = async () => {
    if (!certCourse) return;
    try {
      await generate(certCourse).unwrap();
      toast.success(t("certificatesStarted"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <PageGate loading={credentials.isLoading || sections.isLoading}>
      <PageHeader
        where="credentials"
        icon={<Award />}
        title={tn("credentials")}
        count={credentials.data?.count}
        description={t("description")}
        toolbar={
          isLiveAdmin ? (
            <>
              <SimpleSelect
                value={certCourse}
                onChange={setCertCourse}
                options={sections.rows.map((r) => ({ value: r.course.id, label: r.course.name }))}
                placeholder={t("pickSection")}
                size="sm"
                className="w-64"
                aria-label={t("pickSection")}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!certCourse || generateState.isLoading}
                onClick={() => void runCertificates()}
              >
                {generateState.isLoading ? (
                  <Spinner size="sm" className="size-4 text-current" />
                ) : (
                  <BadgeCheck data-icon="inline-start" />
                )}
                {t("generateCertificates")}
              </Button>
              <span className="text-muted-foreground text-xs">{t("certificatesHint")}</span>
            </>
          ) : null
        }
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {credentials.error ? (
          <LoadError error={credentials.error} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Award strokeWidth={1.75} />}
            title={t("empty.title")}
            description={t("empty.body")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <section
                key={c.entityId}
                className="flex gap-3 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4"
              >
                {c.thumbnailImage || c.iconImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(c.thumbnailImage || c.iconImage) as string}
                    alt=""
                    className="size-12 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#eef6fc] text-[#0058cc]">
                    <Award className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-gray-900">{c.name}</h2>
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {c.description || c.credentialType || ""}
                  </p>
                  {isLiveAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setIssuing(c)}
                    >
                      <Plus data-icon="inline-start" /> {t("issue")}
                    </Button>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <PaginationBar
        data={{
          count,
          next_page: credentials.data?.next ? page + 1 : null,
          previous_page: credentials.data?.previous ? page - 1 : null,
          results: rows,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        label={t("countLabel")}
      />
      {issuing ? <BulkIssueDialog credential={issuing} onClose={() => setIssuing(null)} /> : null}
    </PageGate>
  );
}

/** Issue a credential for a section to one student or to every member of a group. */
function BulkIssueDialog({ credential, onClose }: { credential: Credential; onClose: () => void }) {
  const t = useTranslations("credentials.bulkIssue");
  const tc = useTranslations("common");
  const { tenantKey, username: me } = useSession();
  const sections = useSections();
  const groups = useUserGroupsQuery({ platformKey: tenantKey, page_size: 100 });
  const [courseId, setCourseId] = useState("");
  const [target, setTarget] = useState<"student" | "group">("student");
  const [student, setStudent] = useState<PlatformUser | null>(null);
  const [groupId, setGroupId] = useState("");
  const group = useUserGroupQuery(Number(groupId), { skip: !groupId });
  const [issue] = useIssueAssertionMutation();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const recipients =
      target === "student"
        ? student
          ? [student.username]
          : []
        : (group.data?.users ?? []).map((u) => u.username);
    if (!courseId || !recipients.length) return;
    setBusy(true);
    let issued = 0;
    const failed: string[] = [];
    for (const identity of recipients) {
      try {
        await issue({
          platformKey: tenantKey,
          callerUsername: me,
          entityId: credential.entityId,
          body: { recipient: { identity }, course: courseId },
        }).unwrap();
        issued++;
      } catch (err) {
        failed.push(`${identity}: ${errorMessage(err, tc("errorGeneric"))}`);
      }
    }
    setBusy(false);
    if (issued) toast.success(t("done", { count: issued }));
    if (failed.length) toast.error(failed.slice(0, 3).join(" · "));
    if (!failed.length) onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: credential.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("course")}</Label>
            <SimpleSelect
              value={courseId}
              onChange={setCourseId}
              options={sections.rows.map((r) => ({ value: r.course.id, label: r.course.name }))}
              placeholder={t("pickCourse")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("to")}</Label>
            <SimpleSelect
              value={target}
              onChange={(v) => setTarget(v as "student" | "group")}
              options={[
                { value: "student", label: t("oneStudent") },
                { value: "group", label: t("wholeGroup") },
              ]}
            />
          </div>
          {target === "student" ? (
            <UserPicker value={student} onChange={setStudent} placeholder={t("pickStudent")} />
          ) : (
            <SimpleSelect
              value={groupId}
              onChange={setGroupId}
              options={(groups.data?.results ?? []).map((g) => ({
                value: String(g.id),
                label: g.name,
              }))}
              placeholder={t("pickGroup")}
            />
          )}
          {target === "group" && group.data ? (
            <p className="text-muted-foreground text-xs">
              {t("groupSize", { count: group.data.users?.length ?? 0 })}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            className="ibl-button-primary"
            disabled={
              busy || !courseId || (target === "student" ? !student : !group.data?.users?.length)
            }
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
