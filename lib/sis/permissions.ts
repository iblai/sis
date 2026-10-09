/**
 * Who may open a page under `/platform/<key>/…`. Admin surfaces need an admin
 * in Admin mode; admin lists open to an admin in either mode; a student's
 * own record opens to that student; courses, home and notifications to every
 * member. The layout redirects home when this says no.
 */
export function canOpen(
  pathname: string,
  session: { isAdmin: boolean; adminMode: boolean; username: string },
): boolean {
  const rest = pathname.split(/[?#]/)[0].replace(/^\/platform\/[^/]+/, "") || "/";
  if (/^\/(admin|setup)(\/|$)/.test(rest)) return session.isAdmin && session.adminMode;
  const own = rest.match(/^\/students\/([^/]+)/);
  if (own) return session.isAdmin || decodeURIComponent(own[1]) === session.username;
  if (/^\/(students|staff|groups|grades|credentials|reports|messages)(\/|$)/.test(rest)) {
    return session.isAdmin;
  }
  return true;
}
