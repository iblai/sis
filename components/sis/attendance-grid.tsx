"use client";

import { useLocale, useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WEEKDAYS } from "@/lib/sis/metadata";
import { formatDay, formatDuration } from "@/lib/sis/format";
import { weekdayOf, type AttendanceDay } from "@/lib/sis/attendance";
import { cn } from "@/lib/utils";

/** A month of activity-derived attendance as a calendar grid. */
export function AttendanceGrid({ days }: { days: AttendanceDay[] }) {
  const t = useTranslations("attendance");
  const locale = useLocale();
  if (!days.length) return null;
  const lead = WEEKDAYS.indexOf(weekdayOf(days[0].date));
  return (
    <div className="grid grid-cols-7 gap-1 text-center text-xs">
      {WEEKDAYS.map((d) => (
        <div key={d} className="text-muted-foreground py-1 font-medium">
          {t(`weekday.${d}`)}
        </div>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <div key={`lead-${i}`} />
      ))}
      {days.map((d) => (
        <Tooltip key={d.date}>
          <TooltipTrigger
            render={
              <div
                className={cn(
                  "flex h-10 flex-col items-center justify-center rounded-md border text-[11px]",
                  d.status === "present" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                  d.status === "absent" && "border-rose-200 bg-rose-50 text-rose-800",
                  d.status === "no-school" && "border-gray-100 bg-gray-50 text-gray-400",
                )}
              />
            }
          >
            <span className="font-medium">{d.date.slice(8)}</span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {formatDay(d.date, locale)} · {t(`status.${d.status}`)}
            {d.seconds ? ` · ${formatDuration(d.seconds)}` : ""}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
