"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useStoredUserMetadata } from "@iblai/iblai-js/web-utils";
import { resolveLocale } from "@/i18n/config";
import { syncLanguageCookies } from "@/lib/locale-cookie";

/**
 * The OS pattern: the profile's `public_metadata.language`, read from the stored
 * `user_metadata` the auth app forwards at login and this app's saves refresh, is
 * the language of record. When it differs from the active locale (first load, a
 * change in the SDK Profile tab), write the cookies and refresh. Renders nothing.
 */
export function LanguagePreferenceSync() {
  const activeLocale = useLocale();
  const router = useRouter();
  const lastSyncedRef = useRef<string | null>(null);
  const [userMetadata] = useStoredUserMetadata();
  const stored = userMetadata?.public_metadata?.language;

  useEffect(() => {
    if (!stored) return;
    const target = resolveLocale(stored);
    if (target === activeLocale) {
      lastSyncedRef.current = target;
      return;
    }
    if (lastSyncedRef.current === target) return;
    lastSyncedRef.current = target;
    syncLanguageCookies(target);
    router.refresh();
  }, [stored, activeLocale, router]);

  return null;
}
