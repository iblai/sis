/**
 * Decide the post-SSO landing path.
 *
 * An explicit `?redirect-path=` wins over the path SsoLogin resolved from
 * localStorage (`redirect-to`); whichever wins must be a plain same-origin
 * path (one leading slash, no `//` or `/\` authority, no control characters), or the landing is `/`
 * — both inputs reach this page from the URL, so either could be an open
 * redirect. Finally, a path scoped to `/platform/<org>` for an org other than
 * the one just authenticated is stale — reset to `/`, which resolves the
 * session's org.
 */
const PLAIN_PATH = /^\/(?![/\\])/;
const plain = (p?: string | null): p is string => !!p && PLAIN_PATH.test(p) && !/\p{Cc}/u.test(p);

export function resolveSsoRedirectPath(
  resolvedPath: string,
  parsedData: Record<string, string>,
  search: string,
): string {
  const explicit = new URLSearchParams(search).get("redirect-path");
  let redirectPath = plain(explicit) ? explicit : plain(resolvedPath) ? resolvedPath : "/";

  const match = redirectPath.match(/^\/platform\/([^/]+)/);
  if (match) {
    const pathTenant = decodeURIComponent(match[1]);
    const authenticated = parsedData?.tenant;
    if (authenticated && pathTenant !== authenticated) {
      redirectPath = "/";
    }
  }

  return redirectPath;
}
