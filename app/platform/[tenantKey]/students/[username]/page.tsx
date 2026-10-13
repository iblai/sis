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
import { PageGate } from "@/components/sis/page-gate";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useDemographicsQuery,
  usePlatformUsersQuery,
  useSetUserLinkMutation,
  useUserLinksQuery,
} from "@/lib/sis/api";
import { displayName } from "@/lib/sis/format";

const ADMIN_TABS = [
  "overview",
  "record",
  "enrollment",
  "grades",
  "credentials",
  "guardians",
] as const;
const SELF_TABS = ["overview", "record", "enrollment", "grades", "credentials"] as const;
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
  const { tenantKey, isAdmin, href, displayName: ownName } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const links = useUserLinksQuery({ platformKey: tenantKey, username });
  const link = links.data?.find((l) => l.key === tenantKey);
  // The link carries no name; the directory row does.
  const directory = usePlatformUsersQuery(
    { platformKey: tenantKey, query: username, page_size: 5 },
    { skip: !isAdmin },
  );
  const member = directory.data?.results.find((u) => u.username === username);
  const demographics = useDemographicsQuery({ platformKey: tenantKey, username });
  const [setLink, linkState] = useSetUserLinkMutation();
  const tabs = isAdmin ? ADMIN_TABS : SELF_TABS;
  const base = href(`/students/${encodeURIComponent(username)}`);
  const name = isAdmin ? displayName(member ?? link ?? { username }) : ownName || username;
  useBreadcrumbs(
    isAdmin
      ? [
          { label: tn("students"), href: href("/students") },
          { label: name, href: base },
        ]
      : [{ label: tn("myRecord"), href: base }],
  );

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
    <PageGate loading={links.isLoading || directory.isLoading || demographics.isLoading}>
      <PageHeader
        where="student"
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
            <PageGate inline>
              <OverviewTab username={username} link={link} demographics={demographics.data} />
            </PageGate>
          </TabsContent>
          <TabsContent value="record">
            <PageGate inline>
              <RecordForm username={username} link={link} readOnly={!isLiveAdmin} />
            </PageGate>
          </TabsContent>
          <TabsContent value="enrollment">
            <PageGate inline>
              <EnrollmentTab username={username} studentId={link?.user_id} />
            </PageGate>
          </TabsContent>
          <TabsContent value="grades">
            <PageGate inline>
              <GradesTab username={username} studentId={link?.user_id} />
            </PageGate>
          </TabsContent>
          <TabsContent value="credentials">
            <PageGate inline>
              <CredentialsTab username={username} />
            </PageGate>
          </TabsContent>
          {isAdmin ? (
            <TabsContent value="guardians">
              <PageGate inline>
                <GuardiansTab username={username} userId={link?.user_id} />
              </PageGate>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </PageGate>
  );
}
