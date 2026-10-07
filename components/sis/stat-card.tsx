"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { InfoTip } from "@/components/sis/info-tip";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  labelText,
  value,
  hint,
  info,
  icon,
  tone = "default",
  className,
}: {
  label: ReactNode;
  /** Plain-text label, used to name the info tip for screen readers. */
  labelText?: string;
  value: ReactNode;
  hint?: ReactNode;
  /** One short sentence explaining how the number is calculated. */
  info?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "brand" | "success" | "warning" | "danger";
  className?: string;
}) {
  const t = useTranslations("fields");
  const tones = {
    default: "bg-gray-100 text-gray-600",
    brand: "bg-[#eef6fc] text-[#0058cc]",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  }[tone];
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
          <span className="truncate">{label}</span>
          {info ? (
            <InfoTip
              label={labelText == null ? t("aboutThisMetric") : t("about", { label: labelText })}
            >
              {info}
            </InfoTip>
          ) : null}
        </p>
        <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-gray-900">
          {value}
        </p>
        {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      </div>
      {icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
            tones,
          )}
        >
          {icon}
        </span>
      ) : null}
    </div>
  );
}
