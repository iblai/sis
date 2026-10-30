"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { redirectToAuthSpa } from "@/lib/iblai/auth-utils";
import {
  pickLandingTenant,
  readStoredTenantKey,
  readTenants,
  tenantHref,
  tenantKeyFromPath,
} from "@/lib/iblai/tenant";

/**
 * A path without a platform (`/`, `/students`, …): prefix the platform the
 * session remembers — or the first one the user belongs to — keeping the rest
 * of the path, query and hash. A signed-in user whose only platform is the
 * community one lands on it (the trial-gated shell); with no session the SDK
 * signs in without a platform and the Auth SPA picks the user's own. A
 * platform path that lands here matched no page: the 404 page, not another prefix.
 */
export function TenantRedirect() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const target = pickLandingTenant(readStoredTenantKey(), readTenants());

  const stray = tenantKeyFromPath(pathname) !== null;

  useEffect(() => {
    if (stray) {
      router.replace("/error/404");
    } else if (target) {
      const rest = pathname === "/" ? "" : pathname;
      router.replace(`${tenantHref(target, rest)}${window.location.search}${window.location.hash}`);
    } else {
      // Null only when signed out.
      void redirectToAuthSpa(undefined, undefined, true);
    }
  }, [stray, target, pathname, router]);

  return <LoadingScreen />;
}
