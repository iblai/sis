"use client";

import { cn } from "@/lib/utils";

/** A quiet state pill: grey dot by default, green for `tone="ok"`, rose for `tone="bad"`. */
export function StatusPill({
  label,
  tone = "muted",
  className,
}: {
  label: string;
  tone?: "ok" | "bad" | "muted";
  className?: string;
}) {
  const dot = { ok: "bg-emerald-500", bad: "bg-rose-400", muted: "bg-gray-400" }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
