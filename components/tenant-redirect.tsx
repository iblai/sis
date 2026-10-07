"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadingScreen } from "@/components/loading-screen";
import { NOTICE_PRIMARY, NoticeCard } from "@/components/notice-card";
import { handleLogout, redirectToAuthSpa } from "@/lib/iblai/auth-utils";
import {
  pickLandingTenant,
  readStoredTenantKey,
  readTenants,
  tenantHref,
} from "@/lib/iblai/tenant";

/**
 * A path without a platform (`/`, `/students`, …): prefix the platform the
 * session remembers — or the first one the user belongs to — keeping the rest
 * of the path, query and hash. A signed-in user whose only platform is the
 * community one sees the notice; with no session the SDK signs in without a
 * platform and the Auth SPA picks the user's own. Never `main`.
 */
export function TenantRedirect() {
  const t = useTranslations("errors");
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const stored = readStoredTenantKey();
  const tenants = readTenants();
  const target = pickLandingTenant(stored, tenants);
  const signedOut = tenants.length === 0;

  useEffect(() => {
    if (target) {
      const rest = pathname === "/" ? "" : pathname;
      router.replace(`${tenantHref(target, rest)}${window.location.search}${window.location.hash}`);
    } else if (signedOut) {
      void redirectToAuthSpa(undefined, undefined, true);
    }
  }, [target, signedOut, pathname, router]);

  if (target || signedOut) return <LoadingScreen />;
  return (
    <NoticeCard title={t("noPlatform.title")} body={t("noPlatform.body")}>
      <button type="button" onClick={() => handleLogout()} className={NOTICE_PRIMARY}>
        {t("signInAgain")}
      </button>
    </NoticeCard>
  );
}
