"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserProfileDropdown } from "@iblai/iblai-js/web-containers/next";
import { useTenantMetadata, type Tenant } from "@iblai/iblai-js/web-utils";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";
import { handleLogout, handleTenantSwitch } from "@/lib/iblai/auth-utils";
import { isUnnamedTenant, shortTenantKey, type TenantEntry } from "@/lib/iblai/tenant";

/**
 * The SDK’s profile dropdown — avatar, profile & account modal, platform
 * switcher, help, logout — wired to this app’s multi-platform session.
 */
export function UserMenu() {
  const ts = useTranslations("shell");
  const {
    tenantKey,
    username,
    email,
    isAdmin,
    tenants: rawTenants,
    currentTenant: rawCurrent,
  } = useSession();
  const router = useRouter();
  // The SDK dropdown prints `platform_name`; give unnamed platforms a readable one.
  const friendly = (t: TenantEntry) =>
    isUnnamedTenant(t) ? { ...t, platform_name: `${ts("platform")} ${shortTenantKey(t.key)}` } : t;
  const tenants = rawTenants.map(friendly);
  const currentTenant = rawCurrent ? friendly(rawCurrent) : undefined;
  const { metadata, metadataLoaded } = useTenantMetadata({ org: tenantKey });

  const onTenantUpdate = useCallback(
    (tenant: Tenant) => {
      try {
        const all = JSON.parse(localStorage.getItem("tenants") ?? "[]") as Tenant[];
        localStorage.setItem(
          "tenants",
          JSON.stringify(all.map((t) => (t.key === tenant.key ? { ...t, ...tenant } : t))),
        );
        if (tenant.key === tenantKey) {
          localStorage.setItem("current_tenant", JSON.stringify(tenant));
        }
      } catch {
        /* ignore */
      }
      router.refresh();
    },
    [router, tenantKey],
  );

  return (
    <UserProfileDropdown
      email={email}
      mainPlatformKey={config.mainTenantKey()}
      username={username || undefined}
      userIsAdmin={isAdmin}
      userIsStudent={false}
      tenantKey={tenantKey}
      currentTenant={(currentTenant as unknown as Tenant) ?? undefined}
      userTenants={tenants as unknown as Tenant[]}
      showProfileTab
      showAccountTab={isAdmin}
      showTenantSwitcher={tenants.length > 1}
      showHelpLink
      showLogoutButton
      showLearnerModeSwitch={false}
      showPlatformName
      helpCenterUrl={config.helpCenterUrl()}
      enableGravatarOnProfilePic={config.enableGravatarOnProfilePic()}
      currentSPA="sis"
      currentPlan=""
      metadata={
        metadata as
          | { support_url?: string; help_center_url?: string; show_help?: boolean }
          | undefined
      }
      metadataLoaded={metadataLoaded}
      authURL={config.authUrl()}
      currentPlatformBaseDomain={config.platformBaseDomain()}
      onLogout={() => handleLogout()}
      onTenantChange={(key: string) => void handleTenantSwitch(key)}
      onTenantUpdate={onTenantUpdate}
      onHelpClick={(url: string) => {
        if (/^https?:\/\//.test(url)) window.open(url, "_blank", "noopener");
      }}
      onAccountDeleted={() => handleLogout()}
      enableMemoryTab={false}
    />
  );
}
