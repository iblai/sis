/**
 * A query string from a params object: `undefined`, `null` and `""` are
 * dropped, arrays repeat the key (`role=Student&role=Admin`, what DRF's
 * `getlist` reads), everything else is stringified. Returns "" or "?a=b".
 */
export function qs(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v === undefined || v === null || v === "") continue;
      search.append(key, String(v));
    }
  }
  const out = search.toString();
  return out ? `?${out}` : "";
}
