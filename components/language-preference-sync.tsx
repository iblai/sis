"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useGetUserMetadataQuery } from "@iblai/iblai-js/data-layer";
import { useSession } from "@/hooks/use-session";
import { resolveLocale } from "@/i18n/config";
import { syncLanguageCookies } from "@/lib/locale-cookie";

/**
 * The OS pattern: the profile's `public_metadata.language` is the language of
 * record. When it differs from the active locale (first load, a change in the
 * SDK Profile tab, a change made in another ibl.ai app), write the cookies and
 * refresh. Renders nothing.
 */
export function LanguagePreferenceSync() {
  const { username } = useSession();
  const activeLocale = useLocale();
  const router = useRouter();
  const lastSyncedRef = useRef<string | null>(null);
  const { data } = useGetUserMetadataQuery({ params: { username } }, { skip: !username });
  const stored = (data as { public_metadata?: { language?: string } } | undefined)?.public_metadata
    ?.language;

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
