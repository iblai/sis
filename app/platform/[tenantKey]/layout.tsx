"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarInset, SidebarProvider } from "@iblai/iblai-js/web-containers/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountSheetProvider } from "@/components/sis/account-sheet";
import { AppSidebar } from "@/components/sis/app-sidebar";
import { TopBar } from "@/components/sis/top-bar";
import { BreadcrumbProvider } from "@/components/sis/breadcrumbs";
import { CommandPaletteProvider } from "@/components/sis/command-palette";
import { AdminModeProvider, useAdminMode } from "@/components/sis/admin-mode";
import { LanguagePreferenceSync } from "@/components/language-preference-sync";
import { LoadingScreen } from "@/components/loading-screen";
import { NOTICE_PRIMARY, NOTICE_SECONDARY, NoticeCard } from "@/components/notice-card";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";
import { handleLogout, handleTenantSwitch } from "@/lib/iblai/auth-utils";
import { tenantDisplayName } from "@/lib/iblai/tenant";
import { canOpen } from "@/lib/sis/permissions";

// The SDK sidebar remembers its desktop state in this cookie.
function readSidebarOpen(): boolean {
  if (typeof document === "undefined") return true;
  const match = /(?:^|;\s*)sidebar_state=(true|false)/.exec(document.cookie);
  return match ? match[1] === "true" : true;
}

/**
 * Everything under `/platform/[tenantKey]` — the authenticated, platform-scoped
 * shell: the SDK sidebar and inset around the top bar and the page. The
 * providers above us have already verified the session and the membership.
 * The community platform gets a notice, never a working app.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  const { isAdmin, tenantKey } = useSession();
  const [sidebarOpen] = useState(readSidebarOpen);

  if (!tenantKey) return <LoadingScreen />;
  if (tenantKey === config.mainTenantKey()) return <NoSchoolNotice />;

  return (
    <AdminModeProvider isAdmin={isAdmin} tenantKey={tenantKey}>
      <LanguagePreferenceSync />
      <TooltipProvider>
        <AccountSheetProvider>
          <CommandPaletteProvider>
            <BreadcrumbProvider>
              <div className="flex min-h-dvh flex-col bg-white md:h-dvh md:overflow-hidden">
                <SidebarProvider defaultOpen={sidebarOpen} className="min-h-0 flex-1">
                  <AppSidebar />
                  <SidebarInset
                    asChild
                    className="flex min-h-0 w-full flex-1 flex-col bg-[var(--sidebar-bg,#fafbfc)] md:overflow-hidden"
                  >
                    <div>
                      <TopBar />
                      <AccessGate>
                        <main
                          id="main-content"
                          className="flex min-h-0 flex-1 flex-col md:overflow-hidden"
                        >
                          {children}
                        </main>
                      </AccessGate>
                    </div>
                  </SidebarInset>
                </SidebarProvider>
              </div>
            </BreadcrumbProvider>
          </CommandPaletteProvider>
        </AccountSheetProvider>
      </TooltipProvider>
    </AdminModeProvider>
  );
}

/** Admin surfaces for admins (Setup and Management in Admin mode), own records for students; the rest redirects home. */
function AccessGate({ children }: { children: ReactNode }) {
  const { isAdmin, adminMode } = useAdminMode();
  const { username, href } = useSession();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const allowed = canOpen(pathname, { isAdmin, adminMode, username });

  useEffect(() => {
    if (!allowed) router.replace(href());
  }, [allowed, router, href]);

  if (!allowed) return null;
  return <>{children}</>;
}

/** `/platform/main`: the app works inside a school platform, not the community one. */
function NoSchoolNotice() {
  const t = useTranslations("errors");
  const { tenants } = useSession();
  const others = tenants.filter((x) => x.key !== config.mainTenantKey());
  return (
    <NoticeCard title={t("noPlatform.title")} body={t("noPlatform.body")}>
      {others.slice(0, 3).map((x) => (
        <button
          key={x.key}
          type="button"
          onClick={() => void handleTenantSwitch(x.key)}
          className={NOTICE_SECONDARY}
        >
          {tenantDisplayName(x)}
        </button>
      ))}
      <button type="button" onClick={() => handleLogout()} className={NOTICE_PRIMARY}>
        {t("signInAgain")}
      </button>
    </NoticeCard>
  );
}
