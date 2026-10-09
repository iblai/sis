/** An AXD over-time `data` as a day → value map, whichever shape the family used. */
export function byDay(
  data: Record<string, number> | { date: string; count: number }[] | null | undefined,
): Record<string, number> {
  if (!data) return {};
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((d) => [String(d.date).slice(0, 10), Number(d.count) || 0]));
  }
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k.slice(0, 10), Number(v) || 0]));
}
