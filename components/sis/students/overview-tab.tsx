"use client";

import { useLocale, useTranslations } from "next-intl";
import { FieldRow } from "@/components/sis/inline-field";
import { StatusPill } from "@/components/sis/status-pill";
import { WhereTip } from "@/components/sis/where-tip";
import { useGateLoading } from "@/components/sis/page-gate";
import { useGuardians } from "@/hooks/use-guardians";
import { useAdminMode } from "@/components/sis/admin-mode";
import { useSession } from "@/hooks/use-session";
import { useLearnerLastAccessQuery } from "@/lib/sis/api";
import { useUserEnrollmentsQuery } from "@/lib/sis/lms-api";
import { formatDate, formatDateTime } from "@/lib/sis/format";
import { isEnrollmentStatus } from "@/lib/sis/seed";
import type { Demographics, UserPlatformLink } from "@/lib/sis/types";

const str = (v: unknown) => (typeof v === "string" && v ? v : "—");

/** The student at a glance: record summary, guardians, sections, last access. */
export function OverviewTab({
  username,
  link,
  demographics,
}: {
  username: string;
  link?: UserPlatformLink;
  demographics?: Demographics;
}) {
  const t = useTranslations("students.record");
  const tf = useTranslations("students.fields");
  const ts = useTranslations("students.enrollmentStatus");
  const locale = useLocale();
  const { tenantKey } = useSession();
  const { isAdmin } = useAdminMode();
  const enrollments = useUserEnrollmentsQuery(username, { skip: !username });
  const guardians = useGuardians(username, isAdmin);
  const lastAccess = useLearnerLastAccessQuery(
    { platformKey: tenantKey, username },
    { skip: !isAdmin },
  );
  useGateLoading(enrollments.isLoading || guardians.isLoading || lastAccess.isLoading);
  const custom = demographics?.custom_fields ?? {};
  const watchers = guardians.watchers;
  const status = custom.enrollment_status;
  const access = lastAccess.data?.data as Record<string, unknown> | string | undefined;
  const lastSeen =
    typeof access === "string"
      ? access
      : access && typeof access === "object"
        ? ((access.last_access as string | undefined) ?? (access.date as string | undefined))
        : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        <h2 className="flex items-center gap-1 text-sm font-semibold text-gray-900">
          <span>{t("summary")}</span>
          <WhereTip k="overviewStatus" />
        </h2>
        <dl className="mt-2">
          <FieldRow label={t("statusLabel")}>
            <StatusPill
              label={link?.active === false ? t("inactive") : t("active")}
              tone={link?.active === false ? "muted" : "ok"}
            />
          </FieldRow>
          <FieldRow label={tf("student_id")}>{str(custom.student_id)}</FieldRow>
          <FieldRow label={tf("grade_level")}>{str(custom.grade_level)}</FieldRow>
          <FieldRow label={tf("enrollment_status")}>
            {typeof status === "string" && isEnrollmentStatus(status) ? ts(status) : str(status)}
          </FieldRow>
          <FieldRow label={tf("homeroom")}>{str(custom.homeroom)}</FieldRow>
          <FieldRow label={tf("date_of_birth")}>
            {formatDate(demographics?.date_of_birth, locale)}
          </FieldRow>
          <FieldRow label={t("joined")}>{formatDate(link?.added_on, locale)}</FieldRow>
          {isAdmin ? (
            <FieldRow label={t("lastAccess")} hint={t("lastAccessHint")}>
              {lastSeen ? formatDateTime(lastSeen, locale) : "—"}
            </FieldRow>
          ) : null}
        </dl>
      </section>
      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
        <h2 className="flex items-center gap-1 text-sm font-semibold text-gray-900">
          <span>{t("sectionsAndGuardians")}</span>
          <WhereTip k="overviewSections" />
        </h2>
        <dl className="mt-2">
          <FieldRow label={t("sections")}>
            {String((enrollments.data ?? []).filter((e) => e.is_active).length)}
          </FieldRow>
          {isAdmin ? (
            <FieldRow label={t("guardians")}>
              {watchers.length ? watchers.map((w) => w.email || w.username).join(", ") : "—"}
            </FieldRow>
          ) : null}
          <FieldRow label={tf("guardian_name")}>{str(custom.guardian_name)}</FieldRow>
          <FieldRow label={tf("guardian_phone")}>{str(custom.guardian_phone)}</FieldRow>
          <FieldRow label={tf("emergency_contact_name")}>
            {str(custom.emergency_contact_name)}
          </FieldRow>
          <FieldRow label={tf("emergency_contact_phone")}>
            {str(custom.emergency_contact_phone)}
          </FieldRow>
        </dl>
      </section>
    </div>
  );
}
