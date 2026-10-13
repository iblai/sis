import config from "@/lib/iblai/config";

/** Only the Auth SPA's own origin is a valid `?to=` for the same-origin hop. */
export function isAuthSpaUrl(target: string, authUrl: string = config.authUrl()): boolean {
  try {
    return new URL(target).origin === new URL(authUrl).origin;
  } catch {
    return false;
  }
}

/** The Auth SPA's sign-in URL that lands, already signed in, on `redirectTo` in another ibl.ai app. */
export function authSpaLoginUrl(
  app: string,
  redirectTo: string,
  tenant: string,
  authUrl: string = config.authUrl(),
): string {
  return `${authUrl}/login?${new URLSearchParams({ app, "redirect-to": redirectTo, tenant })}`;
}
