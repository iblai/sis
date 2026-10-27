import { fetchBaseQuery, type BaseQueryFn, type FetchArgs } from "@reduxjs/toolkit/query/react";
import { redirectToAuthSpa } from "@/lib/iblai/auth-utils";
import { readCurrentTenantKey, tenantMismatch } from "@/lib/iblai/tenant";
import { detailFromBody, throttleWaitMs, type SisApiError } from "./errors";

/**
 * The base query the three slices share. `credentials: "omit"` always — the
 * gateway answers `Access-Control-Allow-Origin: *`, which refuses cookies —
 * and the bearer token comes from localStorage under `tokenKey` with the
 * backend's own scheme (`Token` for the DM, `JWT` for the LMS and Studio).
 * A stale tab whose URL names another platform than the session is sent
 * home before anything is sent; a 401 signs the user in again; a 429 is
 * retried twice after the wait the backend names.
 */
export function makeBaseQuery(
  baseUrl: string,
  tokenKey: string,
  scheme: "Token" | "JWT",
): BaseQueryFn<string | FetchArgs, unknown, SisApiError> {
  const raw = fetchBaseQuery({
    baseUrl,
    credentials: "omit",
    prepareHeaders: (headers) => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(tokenKey) : null;
      if (token) headers.set("Authorization", `${scheme} ${token}`);
      return headers;
    },
  });
  return async (args, api, extra) => {
    if (
      typeof window !== "undefined" &&
      tenantMismatch(window.location.pathname, readCurrentTenantKey())
    ) {
      window.location.href = "/";
      // No detail: the caller's translated fallback shows while the navigation lands.
      return { error: { status: "CUSTOM_ERROR", detail: "" } };
    }
    let result = await raw(args, api, extra);
    // A throttled call is retried twice: the wait the backend names, then twice that.
    for (let attempt = 1; attempt <= 2 && result.error?.status === 429; attempt++) {
      const wait = throttleWaitMs(
        result.meta?.response?.headers.get("Retry-After"),
        detailFromBody(result.error.data),
      );
      await new Promise((resolve) => setTimeout(resolve, wait * attempt));
      result = await raw(args, api, extra);
    }
    if (result.error) {
      const { status, data } = result.error;
      if (status === 401 && typeof window !== "undefined") {
        void redirectToAuthSpa(undefined, undefined, true);
      }
      return { error: { status, detail: detailFromBody(data), data } };
    }
    return { data: result.data };
  };
}
