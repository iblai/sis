"use client";

import { useTranslations } from "next-intl";
import { InfoTip } from "@/components/sis/info-tip";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";

/** A hint of the `where` catalog: one per place data is added. */
export type WhereKey = Exclude<keyof (typeof import("@/messages/en.json"))["where"], "label">;

/** The question mark that says where this data is added: here, Studio, the learning platform or Skills AI. Admins only. */
export function WhereTip({
  k,
  side = "top",
  className,
}: {
  k: WhereKey;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const t = useTranslations("where");
  if (!useIsLiveAdmin()) return null;
  return (
    <InfoTip label={t("label")} side={side} className={className}>
      {t(k)}
    </InfoTip>
  );
}
