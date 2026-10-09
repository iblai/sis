"use client";

/**
 * ibl.ai provider chain for a MULTI-PLATFORM app (the os.ibl.ai model).
 *
 *   ReduxProvider > AuthProvider > TenantProvider > {children}
 *
 * - AuthProvider: is there a non-expired session? If not, redirect to the
 *   hosted Auth SPA. `PUBLIC_ROUTES` marks the routes that need no sign-in.
 * - TenantProvider: the platform requested by the URL
 *   (`/platform/[tenantKey]/…`) versus the one the session is scoped to. When
 *   they differ it re-authenticates against the requested platform and hands
 *   back a fresh platform-scoped token pair, which we persist (saveUserTokens)
 *   — without that the provider loops on "User still does not belong to tenant".
 *
 * The requested platform is the route's, else the one the SDK remembers; with
 * neither the SDK signs in without `tenant=` and the Auth SPA picks the user's
 * own platform. Nothing here defaults to `main`.
 */

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Provider as ReduxProvider, useDispatch } from "react-redux";
import { useParams, usePathname, useRouter } from "next/navigation";
import { initializeDataLayer, type TokenResponse } from "@iblai/iblai-js/data-layer";
import {
  AuthProvider,
  TenantProvider,
  useTenantSwitchSync,
  refreshTenantSwitchLock,
  isTenantSwitchInProgress,
  clearCurrentTenantCookie,
  deleteCookieOnAllDomains,
  updateRbacPermissions,
  type Tenant,
} from "@iblai/iblai-js/web-utils";
import { Toaster } from "sonner";
import { RadixPointerEventsGuard } from "@/components/radix-pointer-events-guard";
import { LoadingScreen } from "@/components/loading-screen";

import { iblaiStore } from "@/store/iblai-store";
import { LocalStorageService } from "@/lib/iblai/storage-service";
import config from "@/lib/iblai/config";
import { readStoredTenantKey, readUsername } from "@/lib/iblai/tenant";
import { redirectToAuthSpa, handleTenantSwitch, LOCAL_STORAGE_KEYS } from "@/lib/iblai/auth-utils";

// The SDK logs the session tokens with console.log; production keeps warnings and errors only.
if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
  console.log = console.info = console.debug = () => {};
}

const storageService = LocalStorageService.getInstance();

/** Routes that do NOT require authentication (`false` = public). */
const PUBLIC_ROUTES = new Map<RegExp, () => Promise<boolean>>([
  [new RegExp("^/sso-login"), async () => false],
  [new RegExp("^/error/([0-9]+)"), async () => false],
]);

/** One retry of the sign-in without a platform, when a remembered one refused the user. */
const REAUTH_WITHOUT_PLATFORM = "sis_reauth_without_platform";

/** The error page, naming the platform that refused the user. */
export function getErrorPageUrl(code: number, tenant?: string) {
  return tenant ? `/error/${code}?tenant=${encodeURIComponent(tenant)}` : `/error/${code}`;
}

function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const params = useParams<{ tenantKey?: string }>();
  const dispatch = useDispatch();
  const routeTenant = params?.tenantKey ? decodeURIComponent(params.tenantKey) : "";

  // initializeDataLayer MUST run synchronously before any child renders so
  // the SDK's RTK Query hooks know the service URLs on their first call.
  // The SDK never derives the Studio URL (its default does not respond).
  const [isInitialized] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      initializeDataLayer(
        config.dmUrl(),
        config.lmsUrl(),
        config.legacyLmsUrl(),
        storageService,
        { 401: () => redirectToAuthSpa(undefined, undefined, true) },
        config.studioUrl(),
      );
    } catch (e) {
      console.error("[ibl.ai] initializeDataLayer failed:", e);
    }
    return true;
  });

  // Server and first client render both show LOADING; the tree appears on the
  // next commit — avoids a hydration mismatch on every route.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Landing from a platform switch: clear the switching cookie, extend the
  // shared lock so a stale tab cannot revert the switch, and keep this tab in
  // sync with switches made in other tabs.
  useEffect(() => {
    deleteCookieOnAllDomains("ibl_tenant_switching", window.location.hostname);
    refreshTenantSwitchLock();
  }, []);
  useTenantSwitchSync();

  const username = useMemo(() => (mounted ? readUsername() : ""), [mounted]);
  const storedTenant = useMemo(() => (mounted ? readStoredTenantKey() : ""), [mounted]);

  const isPublicRoute = pathname.startsWith("/sso-login") || pathname.startsWith("/error/");

  // Cross-SPA cookie sync mirrors the session into `ibl_*` cookies on the
  // parent domain so sibling apps (os.ibl.ai, lms.ibl.ai, sis.ibl.ai) notice a
  // sign-in or sign-out. On localhost cookies are shared by every dev server on
  // the machine regardless of port, so another app's session would be read as
  // "logged out elsewhere" and force a logout loop — keep the sync for real
  // hosts only, and off on the shared vibe zone (*.iblai.me), where the parent
  // domain's cookies belong to unrelated apps.
  const enableStorageSync =
    typeof window !== "undefined" &&
    !/^(localhost|127\.0\.0\.1|\[::1\])$|\.iblai\.me$/.test(window.location.hostname);

  const LOADING = <LoadingScreen />;
  if (!isInitialized || !mounted) return LOADING;

  const requestedTenant = routeTenant || storedTenant;

  return (
    <>
      <RadixPointerEventsGuard />
      <Toaster position="bottom-right" richColors closeButton />
      <AuthProvider
        skip={isPublicRoute}
        redirectToAuthSpa={(redirectTo, platformKey, logout, saveRedirect) => {
          void redirectToAuthSpa(redirectTo, platformKey, logout, saveRedirect);
        }}
        username={username}
        pathname={pathname}
        storageService={storageService}
        middleware={PUBLIC_ROUTES}
        enableStorageSync={enableStorageSync}
        fallback={LOADING}
      >
        <TenantProvider
          skip={isPublicRoute}
          currentTenant={storedTenant}
          requestedTenant={requestedTenant}
          username={username}
          saveCurrentTenant={(t: Tenant) => {
            localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(t));
            localStorage.setItem(LOCAL_STORAGE_KEYS.TENANT, t.key);
          }}
          saveUserTenants={(t: Tenant[]) =>
            localStorage.setItem(LOCAL_STORAGE_KEYS.TENANTS, JSON.stringify(t))
          }
          saveVisitingTenant={(t: Tenant) =>
            localStorage.setItem(LOCAL_STORAGE_KEYS.VISITING_TENANT, JSON.stringify(t))
          }
          removeVisitingTenant={() => localStorage.removeItem(LOCAL_STORAGE_KEYS.VISITING_TENANT)}
          saveUserTokens={(tokens: TokenResponse) => {
            if (tokens?.axd_token) {
              localStorage.setItem(LOCAL_STORAGE_KEYS.AXD_TOKEN, tokens.axd_token.token);
              localStorage.setItem(LOCAL_STORAGE_KEYS.AXD_TOKEN_EXPIRES, tokens.axd_token.expires);
            }
            if (tokens?.dm_token) {
              localStorage.setItem(LOCAL_STORAGE_KEYS.DM_TOKEN, tokens.dm_token.token);
              localStorage.setItem(LOCAL_STORAGE_KEYS.DM_TOKEN_EXPIRES, tokens.dm_token.expires);
            }
          }}
          saveTenant={(t: string) => localStorage.setItem(LOCAL_STORAGE_KEYS.TENANT, t)}
          handleTenantSwitch={async (tenant: string, saveRedirect: boolean) => {
            await handleTenantSwitch(tenant, saveRedirect);
          }}
          redirectToAuthSpa={(redirectTo, platformKey, logout, saveRedirect) => {
            void redirectToAuthSpa(redirectTo, platformKey, logout, saveRedirect);
          }}
          onAuthFailure={(reason: string) => {
            console.error("[TenantProvider] Auth failure:", reason);
            // A sibling app's cookie remembered the community platform: sign in
            // again with no platform and let the Auth SPA pick the user's own. Once.
            if (
              !routeTenant &&
              requestedTenant === config.mainTenantKey() &&
              !sessionStorage.getItem(REAUTH_WITHOUT_PLATFORM)
            ) {
              sessionStorage.setItem(REAUTH_WITHOUT_PLATFORM, "1");
              localStorage.removeItem(LOCAL_STORAGE_KEYS.TENANT);
              localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_TENANT);
              clearCurrentTenantCookie();
              void redirectToAuthSpa(undefined, undefined, true);
              return;
            }
            router.push(getErrorPageUrl(403, requestedTenant));
          }}
          onLoadPlatformPermissions={(permissions) => {
            dispatch(
              updateRbacPermissions(
                (permissions ?? {}) as Parameters<typeof updateRbacPermissions>[0],
              ),
            );
          }}
          onTenantMismatch={() => {
            // A stale tab legitimately sees its old route != the new session
            // platform during a switch window; do not ping-pong.
            if (isTenantSwitchInProgress()) return;
            window.location.href = "/";
          }}
          fallback={LOADING}
        >
          {children}
        </TenantProvider>
      </AuthProvider>
    </>
  );
}

export function IblaiProviders({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider store={iblaiStore}>
      <Providers>{children}</Providers>
    </ReduxProvider>
  );
}
