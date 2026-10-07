"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/sis/page-header";
import { LoadError } from "@/components/sis/load-error";
import { FieldRow } from "@/components/sis/inline-field";
import { StatusPill } from "@/components/sis/status-pill";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import { useSetUserLinkMutation, useUserLinksQuery } from "@/lib/sis/api";
import { useRoleMembersQuery, useSetOrgRoleMutation } from "@/lib/sis/lms-api";
import { displayName, formatDate } from "@/lib/sis/format";

/** One staff member: the platform link (admin / staff flags) and the sections they teach. */
export default function StaffMemberPage() {
  const t = useTranslations("staff.member");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const { tenantKey, org, username: me, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const links = useUserLinksQuery({ username });
  const link = links.data?.find((l) => l.key === tenantKey) ?? links.data?.[0];
  const [setLink, linkState] = useSetUserLinkMutation();
  const [setRole, roleState] = useSetOrgRoleMutation();
  const [showSections, setShowSections] = useState(false);
  const sections = useSections({ skip: !showSections });
  const name = link ? displayName(link) : username;
  const base = href(`/staff/${encodeURIComponent(username)}`);
  useBreadcrumbs([
    { label: tn("staff"), href: href("/staff") },
    { label: name, href: base },
  ]);

  const toggleAdmin = async () => {
    if (!link) return;
    try {
      await setLink({
        user_id: link.user_id,
        platform_key: tenantKey,
        is_admin: !link.is_admin,
      }).unwrap();
      toast.success(link.is_admin ? t("adminRemoved") : t("adminGranted"));
    } catch (err) {
      toastError(err);
    }
  };
  const toggleTeacher = async () => {
    if (!link) return;
    try {
      await setRole({ username, role: "org-staff", org, active: !link.is_staff }).unwrap();
      toast.success(link.is_staff ? t("teacherRemoved") : t("teacherGranted"));
      void links.refetch();
    } catch (err) {
      toastError(err);
    }
  };

  if (links.error) {
    return (
      <>
        <PageHeader icon={<UserCog />} title={username} />
        <LoadError error={links.error} className="m-4 md:m-6" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={<UserCog />}
        title={name}
        description={link?.email ?? username}
        actions={
          isLiveAdmin && link && username !== me ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={roleState.isLoading}
                onClick={() => void toggleTeacher()}
              >
                {roleState.isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
                {link.is_staff ? t("removeTeacher") : t("makeTeacher")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={linkState.isLoading}
                onClick={() => void toggleAdmin()}
              >
                {linkState.isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
                {link.is_admin ? t("removeAdmin") : t("makeAdmin")}
              </Button>
            </>
          ) : null
        }
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{t("roles")}</h2>
            {links.isLoading ? (
              <Skeleton className="mt-2 h-24" />
            ) : (
              <dl className="mt-2">
                <FieldRow label={t("admin")} hint={t("adminHint")}>
                  <StatusPill
                    label={link?.is_admin ? t("yes") : t("no")}
                    tone={link?.is_admin ? "ok" : "muted"}
                  />
                </FieldRow>
                <FieldRow label={t("teacher")} hint={t("teacherHint")}>
                  <StatusPill
                    label={link?.is_staff ? t("yes") : t("no")}
                    tone={link?.is_staff ? "ok" : "muted"}
                  />
                </FieldRow>
                <FieldRow label={t("active")}>
                  <StatusPill
                    label={link?.active === false ? t("no") : t("yes")}
                    tone={link?.active === false ? "muted" : "ok"}
                  />
                </FieldRow>
                <FieldRow label={t("joined")}>{formatDate(link?.added_on, locale)}</FieldRow>
              </dl>
            )}
            <p className="text-muted-foreground mt-3 text-xs">{t("v1Note")}</p>
          </section>
          <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{t("sectionsTaught")}</h2>
            <p className="text-muted-foreground mt-1 text-xs">{t("sectionsHint")}</p>
            {!showSections ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowSections(true)}
              >
                <BookOpen data-icon="inline-start" /> {t("checkSections")}
              </Button>
            ) : sections.error ? (
              <LoadError error={sections.error} />
            ) : sections.isLoading ? (
              <Skeleton className="mt-2 h-24" />
            ) : (
              <ul className="mt-2 divide-y divide-gray-100 text-sm">
                {sections.rows.map((r) => (
                  <TaughtRow
                    key={r.course.id}
                    courseId={r.course.id}
                    name={r.course.name}
                    username={username}
                    href={href(`/courses/${encodeURIComponent(r.course.id)}`)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/** Renders the section only when the user holds a course role in it. */
function TaughtRow({
  courseId,
  name,
  username,
  href,
}: {
  courseId: string;
  name: string;
  username: string;
  href: string;
}) {
  const t = useTranslations("staff.member");
  const staff = useRoleMembersQuery({ courseId, rolename: "staff" });
  const instructors = useRoleMembersQuery({ courseId, rolename: "instructor" });
  const isStaff = staff.data?.users.some((u) => u.username === username);
  const isInstructor = instructors.data?.users.some((u) => u.username === username);
  if (!isStaff && !isInstructor) return null;
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <Link href={href} className="font-medium text-gray-900 hover:underline">
        {name}
      </Link>
      <span className="text-muted-foreground text-xs">
        {isInstructor ? t("courseInstructor") : t("courseStaff")}
      </span>
    </li>
  );
}
