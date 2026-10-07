/** `YYYY-MM-DD` of a date in UTC. */
export function isoDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** The `start_date` / `end_date` pair of the last `days` days, today included. */
export function lastDays(
  days: number,
  now: Date = new Date(),
): { start_date: string; end_date: string } {
  const end = isoDay(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start_date: isoDay(start), end_date: end };
}
