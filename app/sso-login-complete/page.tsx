"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { SsoLogin } from "@iblai/iblai-js/web-containers/next";
import { LoadingScreen } from "@/components/loading-screen";
import { resolveSsoRedirectPath } from "@/lib/iblai/sso-redirect";

/**
 * SSO landing. The Auth SPA redirects here with the session in `?data=`; the
 * SDK's SsoLogin stores it and navigates to the saved return path. This route
 * lives OUTSIDE the providers so AuthProvider cannot bounce it back to login.
 */
export default function SsoLoginCompletePage() {
  const t = useTranslations("auth");
  return (
    <Suspense fallback={<LoadingScreen message={t("completingSignIn")} />}>
      <SsoLogin
        localStorageKeys={{
          CURRENT_TENANT: "current_tenant",
          USER_DATA: "userData",
          TENANTS: "tenants",
          AXD_TOKEN: "axd_token",
          AXD_TOKEN_EXPIRES: "axd_token_expires",
          DM_TOKEN: "dm_token",
          DM_TOKEN_EXPIRES: "dm_token_expires",
          EDX_TOKEN_KEY: "edx_jwt_token",
        }}
        redirectPathKey="redirect-to"
        defaultRedirectPath="/"
        resolveRedirectPath={(resolved, parsedData) =>
          resolveSsoRedirectPath(
            resolved,
            parsedData as Record<string, string>,
            typeof window !== "undefined" ? window.location.search : "",
          )
        }
      />
    </Suspense>
  );
}
