"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Award, BookOpen, GraduationCap, IdCard, LayoutGrid, User, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/sis/page-header";
import { ConfirmDialog } from "@/components/sis/confirm-dialog";
import { LoadingScreen } from "@/components/loading-screen";
import { LoadError } from "@/components/sis/load-error";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { OverviewTab } from "@/components/sis/students/overview-tab";
import { RecordForm } from "@/components/sis/students/record-form";
import { EnrollmentTab } from "@/components/sis/students/enrollment-tab";
import { GradesTab } from "@/components/sis/students/grades-tab";
import { CredentialsTab } from "@/components/sis/students/credentials-tab";
import { GuardiansTab } from "@/components/sis/students/guardians-tab";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import { useDemographicsQuery, useSetUserLinkMutation, useUserLinksQuery } from "@/lib/sis/api";
import { displayName } from "@/lib/sis/format";

const ADMIN_TABS = [
  "overview",
  "record",
  "enrollment",
  "grades",
  "credentials",
  "guardians",
] as const;
const SELF_TABS = ["overview", "enrollment", "grades", "credentials"] as const;
type Tab = (typeof ADMIN_TABS)[number];

export default function StudentPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StudentView />
    </Suspense>
  );
}

/** One student: the record (DM demographics), sections and grades (LMS), credentials, guardians. */
function StudentView() {
  const t = useTranslations("students.record");
  const tn = useTranslations("nav");
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantKey, isAdmin, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const links = useUserLinksQuery({ username });
  const link = links.data?.find((l) => l.key === tenantKey) ?? links.data?.[0];
  const demographics = useDemographicsQuery({ platformKey: tenantKey, username });
  const [setLink, linkState] = useSetUserLinkMutation();
  const tabs = isAdmin ? ADMIN_TABS : SELF_TABS;
  const base = href(`/students/${encodeURIComponent(username)}`);
  const name = link ? displayName(link) : username;
  useBreadcrumbs([
    { label: tn("students"), href: href("/students") },
    { label: name, href: base },
  ]);

  const tab = useMemo<Tab>(() => {
    const raw = searchParams.get("tab");
    return (tabs as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "overview";
  }, [searchParams, tabs]);
  const setTab = useCallback(
    (value: Tab) => router.replace(value === "overview" ? base : `${base}?tab=${value}`),
    [router, base],
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const toggleActive = async () => {
    if (!link) return;
    setConfirmOpen(false);
    try {
      await setLink({
        user_id: link.user_id,
        platform_key: tenantKey,
        active: link.active === false,
      }).unwrap();
      toast.success(link.active === false ? t("reactivated") : t("deactivated"));
    } catch (err) {
      toastError(err);
    }
  };

  const icons = {
    overview: LayoutGrid,
    record: IdCard,
    enrollment: BookOpen,
    grades: GraduationCap,
    credentials: Award,
    guardians: UsersRound,
  } as const;

  if (links.error) {
    return (
      <>
        <PageHeader icon={<User />} title={username} />
        <LoadError error={links.error} className="m-4 md:m-6" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={<User />}
        title={name}
        description={link?.email ?? username}
        actions={
          isLiveAdmin && link ? (
            <Button
              variant="outline"
              size="sm"
              disabled={linkState.isLoading}
              onClick={() => (link.active === false ? void toggleActive() : setConfirmOpen(true))}
            >
              {link.active === false ? t("reactivate") : t("deactivate")}
            </Button>
          ) : null
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("deactivateTitle")}
        description={t("deactivateBody")}
        confirmLabel={t("deactivate")}
        destructive
        loading={linkState.isLoading}
        onConfirm={() => void toggleActive()}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
          <TabsList
            variant="line"
            className="flex-wrap border-b border-gray-200 pb-1 group-data-horizontal/tabs:h-auto"
          >
            {tabs.map((key) => {
              const Icon = icons[key];
              return (
                <TabsTrigger key={key} value={key}>
                  <Icon strokeWidth={1.75} /> {t(`tabs.${key}`)}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="overview">
            <OverviewTab username={username} link={link} demographics={demographics.data} />
          </TabsContent>
          {isAdmin ? (
            <TabsContent value="record">
              <RecordForm username={username} link={link} />
            </TabsContent>
          ) : null}
          <TabsContent value="enrollment">
            <EnrollmentTab username={username} studentId={link?.user_id} />
          </TabsContent>
          <TabsContent value="grades">
            <GradesTab username={username} studentId={link?.user_id} />
          </TabsContent>
          <TabsContent value="credentials">
            <CredentialsTab username={username} />
          </TabsContent>
          {isAdmin ? (
            <TabsContent value="guardians">
              <GuardiansTab username={username} userId={link?.user_id} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  );
}
