"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay } from "@/lib/sis/format";
import { byDay } from "@/lib/sis/over-time";
import type { OverTime } from "@/lib/sis/types";

/** One AXD over-time series as daily bars. */
export function OverTimeChart({
  series,
  label,
  color = "#0058cc",
}: {
  series?: OverTime | null;
  label: string;
  color?: string;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const days = byDay(series?.data);
  const data = Object.entries(days)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, value]) => ({ day, value }));
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
        {t("panels.empty")}
      </p>
    );
  }
  return (
    <div className="h-56 w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(d: string) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,88,204,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { day: string; value: number };
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-gray-900">{formatDay(d.day, locale)}</p>
                  <p className="text-[#0058cc]">
                    {label}: {d.value}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
