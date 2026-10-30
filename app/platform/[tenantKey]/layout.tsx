"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { FirstRunGate } from "@/components/house/first-run-gate";
import { OrganizationPreview } from "@/components/house/organization-preview";
import { SampleNotice } from "@/components/house/sample-notice";
import { UpgradeModal } from "@/components/house/upgrade-modal";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";
import { readStoredTenantKey } from "@/lib/iblai/tenant";
import { decideEntry, isSampleOrg } from "@/lib/iblai/house-journeys";
import { SAMPLE_SCHOOL } from "@/lib/sis/sample/school";
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
 * A platform the user does not belong to is previewed (/iblai-vibe-house-journeys).
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  const { isAdmin, tenantKey, tenants, href } = useSession();
  const [sidebarOpen] = useState(readSidebarOpen);

  if (!tenantKey) return <LoadingScreen />;
  const entry = decideEntry({ routeOrg: tenantKey, stored: readStoredTenantKey(), tenants });
  if (entry.kind === "preview" && entry.preview) {
    return <OrganizationPreview org={entry.preview} app={config.iblPlatform()} />;
  }

  // The community platform shows the sample school to everyone as its admin; the SDK
  // (sidebar footer, profile menu, first run) still sees the session's own role.
  const sample = isSampleOrg(tenantKey);

  return (
    <AdminModeProvider isAdmin={isAdmin || sample} tenantKey={tenantKey}>
      <LanguagePreferenceSync />
      <UpgradeModal org={tenantKey} app={config.iblPlatform()} />
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
                      {sample ? <SampleNotice name={SAMPLE_SCHOOL} /> : null}
                      <AccessGate>
                        <main
                          id="main-content"
                          className="flex min-h-0 flex-1 flex-col md:overflow-hidden"
                        >
                          <FirstRunGate
                            org={tenantKey}
                            isAdmin={isAdmin}
                            onboardingPath={href("/onboarding")}
                          >
                            {children}
                          </FirstRunGate>
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
