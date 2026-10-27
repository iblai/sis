"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Award, Plus } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/sis/confirm-dialog";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { SimpleSelect } from "@/components/sis/simple-select";
import { SectionPicker } from "@/components/sis/section-picker";
import { StatusPill } from "@/components/sis/status-pill";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { WhereTip } from "@/components/sis/where-tip";
import { useGateLoading } from "@/components/sis/page-gate";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useCredentialsQuery,
  useIssueAssertionMutation,
  useRevokeAssertionMutation,
  useUserAssertionsQuery,
} from "@/lib/sis/api";
import { formatDate, nameOf } from "@/lib/sis/format";
import type { Assertion } from "@/lib/sis/types";

/** The credentials issued to a student (DM assertions); admins issue and revoke. */
export function CredentialsTab({ username }: { username: string }) {
  const t = useTranslations("credentials");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { tenantKey, username: me } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const assertions = useUserAssertionsQuery({
    platformKey: tenantKey,
    username,
    include_revoked: true,
    include_expired: true,
    page_size: 100,
  });
  useGateLoading(assertions.isLoading);
  const [issueOpen, setIssueOpen] = useState(false);
  const [revoking, setRevoking] = useState<Assertion | null>(null);
  const [reason, setReason] = useState("");
  const [revoke, revokeState] = useRevokeAssertionMutation();
  const rows = assertions.data?.data ?? [];

  const confirmRevoke = async () => {
    if (!revoking) return;
    try {
      await revoke({
        platformKey: tenantKey,
        callerUsername: me,
        entityId: revoking.entityId,
        reason: reason || t("revokeDefaultReason"),
        username,
      }).unwrap();
      toast.success(t("revoked"));
      setRevoking(null);
      setReason("");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {t("studentHint")} <WhereTip k="studentCredentials" />
        </p>
        {isLiveAdmin ? (
          <Button size="sm" className="ibl-button-primary" onClick={() => setIssueOpen(true)}>
            <Plus data-icon="inline-start" /> {t("issue")}
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {assertions.error ? (
          <LoadError error={assertions.error} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Award strokeWidth={1.75} />} title={t("none")} className="border-0" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.credential")}</TableHead>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.issued")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.expires")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                {isLiveAdmin ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.entityId}>
                  <TableCell className="font-medium text-gray-900">
                    {a.credentialDetails?.name ?? a.entityId}
                    <span className="text-muted-foreground block font-mono text-[11px]">
                      {a.entityId}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {nameOf(a.course) ?? nameOf(a.program) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(a.issuedOn, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {formatDate(a.expires, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={a.revoked ? t("status.revoked") : t("status.valid")}
                      tone={a.revoked ? "bad" : "ok"}
                    />
                  </TableCell>
                  {isLiveAdmin ? (
                    <TableCell className="text-right">
                      {!a.revoked ? (
                        <Button variant="ghost" size="sm" onClick={() => setRevoking(a)}>
                          {t("revoke")}
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <IssueDialog open={issueOpen} onOpenChange={setIssueOpen} username={username} />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => (o ? null : setRevoking(null))}
        title={t("revokeTitle", { name: revoking?.credentialDetails?.name ?? "" })}
        description={
          <span className="block space-y-2">
            <span className="block">{t("revokeBody")}</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("revokeReason")}
              aria-label={t("revokeReason")}
            />
          </span>
        }
        confirmLabel={t("revoke")}
        cancelLabel={tc("cancel")}
        destructive
        loading={revokeState.isLoading}
        onConfirm={confirmRevoke}
      />
    </div>
  );
}

/** Issue one of the platform's credentials to the student for a section. */
export function IssueDialog({
  open,
  onOpenChange,
  username,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
}) {
  const t = useTranslations("credentials.issueDialog");
  const tc = useTranslations("common");
  const { tenantKey, username: me } = useSession();
  const toastError = useToastError();
  const credentials = useCredentialsQuery(
    { platformKey: tenantKey, username: me, page_size: 100 },
    { skip: !open },
  );
  const sections = useSections({ skip: !open });
  const [entityId, setEntityId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [issue, { isLoading }] = useIssueAssertionMutation();

  const submit = async () => {
    if (!entityId || !courseId) return;
    try {
      await issue({
        platformKey: tenantKey,
        callerUsername: me,
        entityId,
        body: {
          recipient: { identity: username },
          course: courseId,
          narrative: narrative || undefined,
        },
      }).unwrap();
      toast.success(t("done"));
      onOpenChange(false);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-credential">{t("credential")}</Label>
            {credentials.error ? (
              <LoadError error={credentials.error} />
            ) : (
              <SimpleSelect
                id="issue-credential"
                value={entityId}
                onChange={setEntityId}
                options={(credentials.data?.data ?? []).map((c) => ({
                  value: c.entityId,
                  label: c.name,
                }))}
                placeholder={t("pickCredential")}
                disabled={credentials.isLoading}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credential-course">{t("course")}</Label>
            <SectionPicker
              id="credential-course"
              value={courseId}
              onChange={setCourseId}
              rows={sections.rows}
              placeholder={t("pickCourse")}
              disabled={sections.isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-narrative">{t("narrative")}</Label>
            <Input
              id="issue-narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            className="ibl-button-primary"
            disabled={!entityId || !courseId || isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
