/**
 * ibl.ai auth helpers — thin wrappers over the SDK's auth utilities so every
 * redirect, logout and platform switch goes through the same hosted round
 * trip the OS uses (login.<domain>/login?app=…&redirect-to=…&tenant=…).
 */
import {
  redirectToAuthSpa as sdkRedirectToAuthSpa,
  handleLogout as sdkHandleLogout,
  handleTenantSwitch as sdkHandleTenantSwitch,
  clearCurrentTenantCookie,
} from "@iblai/iblai-js/web-utils";

import config from "./config";

export const LOCAL_STORAGE_KEYS = {
  CURRENT_TENANT: "current_tenant",
  USER_DATA: "userData",
  TENANTS: "tenants",
  TENANT: "tenant",
  AXD_TOKEN: "axd_token",
  AXD_TOKEN_EXPIRES: "axd_token_expires",
  DM_TOKEN: "dm_token",
  DM_TOKEN_EXPIRES: "dm_token_expires",
  EDX_TOKEN_KEY: "edx_jwt_token",
  REDIRECT_TO: "redirect-to",
  VISITING_TENANT: "visiting_tenant",
} as const;

export const QUERY_PARAMS = {
  APP: "app",
  REDIRECT_TO: "redirect-to",
  TENANT: "tenant",
} as const;

/** Non-expired session token present? */
export function hasNonExpiredAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AXD_TOKEN);
    if (!token) return false;
    const expiry = localStorage.getItem(LOCAL_STORAGE_KEYS.AXD_TOKEN_EXPIRES);
    if (!expiry) return true;
    return new Date(expiry) > new Date();
  } catch {
    return false;
  }
}

/** Whether a user is signed in (has a session token). */
export function isLoggedIn(): boolean {
  return hasNonExpiredAuthToken();
}

/**
 * Redirect the browser to the ibl.ai Auth SPA for login (or logout + login).
 * `platformKey` passes straight through: with none, the SDK sends no
 * `tenant=` and the Auth SPA picks the user's own platform — never `main`.
 * Signature matches what the SDK's AuthProvider / TenantProvider expect.
 */
export async function redirectToAuthSpa(
  redirectTo?: string,
  platformKey?: string,
  logout = false,
  saveRedirect = true,
  explicitUserAction = false,
) {
  return sdkRedirectToAuthSpa({
    redirectTo,
    platformKey,
    logout,
    saveRedirect,
    forceRedirect: explicitUserAction,
    authUrl: config.authUrl(),
    appName: config.iblPlatform(),
    queryParams: {
      app: QUERY_PARAMS.APP,
      redirectTo: QUERY_PARAMS.REDIRECT_TO,
      tenant: QUERY_PARAMS.TENANT,
    },
    redirectPathStorageKey: LOCAL_STORAGE_KEYS.REDIRECT_TO,
    hasNonExpiredAuthToken,
    preserveTokenKey: LOCAL_STORAGE_KEYS.EDX_TOKEN_KEY,
    authRedirectProxy: "/api/auth-redirect",
  });
}

/** Log out: clear the session and go through the Auth SPA's logout. */
export function handleLogout() {
  sdkHandleLogout({
    authUrl: config.authUrl(),
    redirectUrl: typeof window !== "undefined" ? window.location.origin : undefined,
    tenantStorageKey: LOCAL_STORAGE_KEYS.TENANT,
  });
}

/**
 * Switch the active platform: clears storage, re-enters the Auth SPA with
 * `tenant=<new>` and broadcasts to other tabs. We land on `/`, which sends the
 * user to `/platform/<new platform>`.
 */
export async function handleTenantSwitch(tenantKey: string, saveRedirect = false) {
  await sdkHandleTenantSwitch(tenantKey, {
    authUrl: config.authUrl(),
    redirectPathStorageKey: LOCAL_STORAGE_KEYS.REDIRECT_TO,
    preserveTokenKey: LOCAL_STORAGE_KEYS.EDX_TOKEN_KEY,
    tenantStorageKey: LOCAL_STORAGE_KEYS.TENANT,
    queryParams: { tenant: QUERY_PARAMS.TENANT, redirectTo: QUERY_PARAMS.REDIRECT_TO },
    saveRedirect,
    clearCurrentTenantCookie,
  });
}
