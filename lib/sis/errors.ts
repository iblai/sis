/** Shape of an API error as normalized by the three slices (DM, LMS, Studio). */
export interface SisApiError {
  status: number | string;
  detail: string;
  data?: unknown;
}

/**
 * A backend's error body → one human line; "" when it says nothing usable
 * (HTML, empty). Covers DRF (`detail` string or list, field errors), the AXD
 * (`{error: true, message}`), the instructor API (`{error}` / `{message}`) and
 * Studio (`developer_message`).
 */
export function detailFromBody(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail)) return d.detail.join(" ");
  if (typeof d.message === "string") return d.message;
  if (typeof d.error === "string") return d.error;
  if (typeof d.developer_message === "string") return d.developer_message;
  // DRF field errors: { field: ["msg"] }
  const first = Object.entries(d).find(([, v]) => typeof v === "string" || Array.isArray(v));
  if (!first) return "";
  const [field, msgs] = first;
  return `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : String(msgs)}`;
}

/** The backend's own words for a failure, or the caller's translated fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as Partial<SisApiError> & { error?: string; message?: string };
  if (typeof e.detail === "string" && e.detail) return e.detail;
  if (typeof e.error === "string" && e.error) return e.error;
  if (typeof e.message === "string" && e.message) return e.message;
  return fallback;
}

/** How long a throttled (429) call should wait before its one retry, from `Retry-After` or DRF's "Expected available in N seconds". */
export function throttleWaitMs(retryAfter: string | null | undefined, detail: string): number {
  const header = Number(retryAfter);
  const seconds =
    Number.isFinite(header) && header > 0
      ? header
      : Number(detail.match(/available in (\d+) second/)?.[1] ?? 1);
  return Math.min(seconds, 10) * 1000;
}

export function errorStatus(err: unknown): number | string | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as Partial<SisApiError>).status;
}
