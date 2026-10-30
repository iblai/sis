/**
 * Platform resolution for ibl.ai/sis — a MULTI-PLATFORM app.
 *
 * The platform (the school) the user is working in comes from the URL
 * (`/platform/[tenantKey]/…`). This module only answers "which platform should
 * we land on when the URL names none?" and "is the signed-in user an admin of
 * platform X?" from what the sign-in stored in localStorage:
 *
 *   - `tenants`         every platform the user belongs to (`key`, `is_admin`, …)
 *   - `current_tenant`  the platform the session is scoped to (JSON object or key)
 *   - `tenant`          the platform key the SDK last authenticated into
 *   - `userData`        the signed-in user (`user_nicename`, `user_email`, …)
 *
 * The community platform (`main`) is the landing only for a user who belongs
 * to nothing else — the trial-gated shell (/iblai-vibe-house-journeys).
 *
 * Relative import (not @/): vitest resolves no alias for lib files.
 */
import config from "./config";

export const PLATFORM_ROUTE_PREFIX = "/platform";

export type TenantEntry = {
  key: string;
  is_admin?: boolean;
  org?: string;
  name?: string;
  platform_name?: string;
  show_paywall?: boolean;
  enable_monetization?: boolean | null;
  [k: string]: unknown;
};

export type UserData = {
  user_id?: number;
  user_nicename?: string;
  user_email?: string;
  user_display_name?: string;
  user_fullname?: string | null;
  [k: string]: unknown;
};

function ls(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (typeof window.localStorage?.getItem !== "function") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The platforms the sign-in handed the browser (`tenants`), or [] when signed out. */
export function readTenants(): TenantEntry[] {
  const store = ls();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem("tenants") ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The signed-in user, or null. */
export function readUserData(): UserData | null {
  const store = ls();
  if (!store) return null;
  try {
    const raw = store.getItem("userData");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function readUsername(): string {
  return readUserData()?.user_nicename ?? "";
}

export function readUserEmail(): string {
  return readUserData()?.user_email ?? "";
}

export function readUserId(): number | null {
  const id = readUserData()?.user_id;
  return typeof id === "number" ? id : null;
}

/**
 * The platform key the current session is scoped to. `current_tenant` is
 * written as a JSON object by the SDK (SsoLogin / TenantProvider) but tolerate
 * a bare key as well; fall back to the SDK's `tenant` key.
 */
export function readCurrentTenantKey(): string {
  const store = ls();
  if (!store) return "";
  const raw = store.getItem("current_tenant");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && typeof parsed.key === "string") {
        return parsed.key;
      }
      if (typeof parsed === "string") return parsed;
    } catch {
      return raw;
    }
  }
  return store.getItem("tenant") ?? "";
}

/** The platform the SDK remembers (`tenant`, then `current_tenant`), "" when none. */
export function readStoredTenantKey(): string {
  const store = ls();
  if (!store) return "";
  return store.getItem("tenant") || readCurrentTenantKey();
}

/** The `tenants` entry for a platform, if the user belongs to it. */
export function findTenant(tenantKey: string): TenantEntry | undefined {
  return readTenants().find((t) => t.key === tenantKey);
}

/** Whether the signed-in user is an admin of `tenantKey`. */
export function isTenantAdmin(tenantKey: string): boolean {
  return !!findTenant(tenantKey)?.is_admin;
}

/** Whether the signed-in user belongs to `tenantKey`. */
export function isTenantMember(tenantKey: string): boolean {
  return !!findTenant(tenantKey);
}

/**
 * Where to land when the URL names no platform: the remembered platform unless
 * it is the community one, else the first platform the user belongs to that is
 * not the community one, else the community one itself (the trial-gated
 * shell); null only when signed out.
 */
export function pickLandingTenant(
  stored: string,
  tenants: ReadonlyArray<Pick<TenantEntry, "key">>,
  main: string = config.mainTenantKey(),
): string | null {
  if (stored && stored !== main) return stored;
  return tenants.find((t) => t.key && t.key !== main)?.key ?? (tenants.length ? main : null);
}

/** Path of a page inside a platform: `/platform/<key>/<path>`. */
export function tenantHref(tenantKey: string, path = ""): string {
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${PLATFORM_ROUTE_PREFIX}/${encodeURIComponent(tenantKey)}${clean}`;
}

/** Extract the platform key from a pathname, or null when it is not a platform route. */
export function tenantKeyFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/platform\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * The URL names one platform and the stored session another — a tab left
 * open across a switch in another tab. Its token belongs to the session's
 * platform, so any request from here would read or write the wrong one.
 */
export function tenantMismatch(pathname: string, sessionKey: string): boolean {
  const fromPath = tenantKeyFromPath(pathname);
  return !!fromPath && !!sessionKey && fromPath !== sessionKey;
}

/**
 * Platforms created programmatically often carry a generated key as their
 * name (`2c0da5f7216d4b639f7a2b200307ebd2`). That is an identifier, not a name
 * — never show it as one.
 */
export function isHashLike(value?: string | null): boolean {
  if (!value) return false;
  return (
    /^[0-9a-f]{20,}$/i.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** A short, readable id for a platform key (`2c0da5f7`), for secondary lines. */
export function shortTenantKey(key?: string | null): string {
  if (!key) return "";
  return isHashLike(key) ? key.slice(0, 8) : key;
}

/** The generic label of a platform that has no human name; callers translate it. */
export const UNNAMED_TENANT = "Platform";

/**
 * Display name for a platform: its real name when it has one, otherwise the
 * generic label. Pair with `shortTenantKey` in lists where several unnamed
 * platforms must stay distinguishable.
 */
export function tenantDisplayName(t?: TenantEntry | null): string {
  if (!t) return "";
  const candidates = [t.platform_name, t.name, t.org, t.key] as Array<string | undefined>;
  const named = candidates.find((c) => c && !isHashLike(c));
  return named ?? UNNAMED_TENANT;
}

/** `true` when the platform has no human name (its label is the generic fallback). */
export function isUnnamedTenant(t?: TenantEntry | null): boolean {
  if (!t) return false;
  return tenantDisplayName(t) === UNNAMED_TENANT;
}
