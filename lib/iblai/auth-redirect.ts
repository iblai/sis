import config from "@/lib/iblai/config";

/** Only the Auth SPA's own origin is a valid `?to=` for the same-origin hop. */
export function isAuthSpaUrl(target: string, authUrl: string = config.authUrl()): boolean {
  try {
    return new URL(target).origin === new URL(authUrl).origin;
  } catch {
    return false;
  }
}
