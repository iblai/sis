"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  findTenant,
  isTenantAdmin,
  readTenants,
  readUserData,
  tenantHref,
  type TenantEntry,
  type UserData,
} from "@/lib/iblai/tenant";

export interface Session {
  /** The platform named by the URL (`/platform/[tenantKey]`). */
  tenantKey: string;
  /** The platform's Open edX org — the LMS course filter. */
  org: string;
  username: string;
  email: string;
  userId: number | null;
  displayName: string;
  user: UserData | null;
  /** Admin of the platform in the URL. */
  isAdmin: boolean;
  tenants: TenantEntry[];
  currentTenant?: TenantEntry;
  /** Build a path inside the current platform. */
  href: (path?: string) => string;
}

/**
 * The signed-in user and the platform in the URL, read once from the session
 * the sign-in stored. Everything under `/platform/[tenantKey]` is rendered
 * after the providers have verified the session, so the values are stable
 * for the life of the page.
 */
export function useSession(): Session {
  const params = useParams<{ tenantKey?: string }>();
  const tenantKey = params?.tenantKey ? decodeURIComponent(params.tenantKey) : "";

  return useMemo(() => {
    const user = readUserData();
    const tenants = readTenants();
    const currentTenant = findTenant(tenantKey);
    return {
      tenantKey,
      org: currentTenant?.org || tenantKey,
      username: user?.user_nicename ?? "",
      email: user?.user_email ?? "",
      userId: typeof user?.user_id === "number" ? user.user_id : null,
      // Stored names can carry trailing spaces ("Search Craft Admin ").
      displayName:
        [user?.user_fullname, user?.user_display_name, user?.user_nicename]
          .map((v) => String(v ?? "").trim())
          .find(Boolean) ?? "",
      user,
      isAdmin: isTenantAdmin(tenantKey),
      tenants,
      currentTenant,
      href: (path = "") => tenantHref(tenantKey, path),
    };
  }, [tenantKey]);
}
