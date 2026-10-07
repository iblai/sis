import type { NextRequest } from "next/server";
import { applyCsp } from "@iblai/iblai-js/security/next";
import appConfig from "@/lib/iblai/config";

const mfeOrigin = new URL(appConfig.mfeUrl()).origin;

// Server components don't have direct access to the request URL/pathname.
// Forward the pathname as a header so layouts can read it via `headers()` and
// branch on the current route.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Attach the per-request, nonce-based Content-Security-Policy. applyCsp
  // stamps the nonce onto these same request headers — preserving x-pathname —
  // and returns the response carrying the CSP header.
  //
  // `next dev` runs report-only so React Refresh / eval() and the error
  // overlay work (the SDK auto-allows dev eval in report-only mode); without
  // it every dev page load reports "eval() is not supported in this
  // environment". NODE_ENV is inlined per build command, so production builds
  // pass `undefined` and the SDK's own resolution stays authoritative:
  // enforce by default, overridable at runtime with CSP_MODE=report-only
  // (validated by the SDK — unknown values fall safe to report-only).
  return applyCsp(request, {
    requestHeaders,
    mode: process.env.NODE_ENV === "development" ? "report-only" : undefined,
    // Nothing embeds the SIS; a same-site page must not frame it either.
    frameAncestors: "none",
    // The gradebook micro-frontend is embedded from the LMS's apps host.
    frameSrc: [mfeOrigin],
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
