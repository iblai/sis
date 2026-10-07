import { NextResponse } from "next/server";
import { isAuthSpaUrl } from "@/lib/iblai/auth-redirect";

/**
 * Same-origin hop to the Auth SPA (the SDK's `authRedirectProxy`). Only the
 * Auth SPA's own origin is a valid target — anything else is a 400, never a
 * redirect.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("to");
  if (!target || !isAuthSpaUrl(target)) {
    return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 });
  }
  return NextResponse.redirect(target);
}
