"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { toast } from "sonner";
import { useGetUserMetadataQuery } from "@iblai/iblai-js/data-layer";
import { useUserProfileUpdate } from "@iblai/iblai-js/web-utils";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n/config";
import { syncLanguageCookies } from "@/lib/locale-cookie";
import { errorMessage } from "@/lib/sis/api";
import { useSession } from "@/hooks/use-session";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Language select in the top bar; saved to the profile, which every ibl.ai app follows. */
export function LanguageMenu({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("language");
  const tc = useTranslations("common");
  const { username } = useSession();
  const { updateProfile } = useUserProfileUpdate(username);
  const { data: userMetadata, isLoading: metadataLoading } = useGetUserMetadataQuery(
    { params: { username } },
    { skip: !username },
  );
  const choose = async (value: string) => {
    // The profile is the language of record; cookies only when there is none.
    if (!username || !userMetadata) {
      syncLanguageCookies(value);
      router.refresh();
      return;
    }
    const current = (userMetadata as { public_metadata?: Record<string, unknown> }).public_metadata;
    try {
      await updateProfile({ public_metadata: { ...current, language: value } });
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
      return;
    }
    // Saved; this tab follows at once and the sync finds nothing left to do.
    syncLanguageCookies(value);
    router.refresh();
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <label className={className}>
            <Languages className="size-4 text-[#5f5f61]" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">{t("label")}</span>
            <select
              value={locale}
              disabled={metadataLoading}
              onChange={(event) => void choose(event.target.value)}
              className="h-8 cursor-pointer rounded-md border border-transparent bg-transparent pr-1 text-xs text-[#4a5568] hover:bg-[#f0f4fa] focus-visible:border-[#0058cc] focus-visible:outline-none"
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <TooltipContent side="bottom">{t("hint")}</TooltipContent>
    </Tooltip>
  );
}
