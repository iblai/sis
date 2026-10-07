import { LOCALE_COOKIE, OPENEDX_LOCALE_COOKIE, resolveLocale, type Locale } from "@/i18n/config";
import config from "@/lib/iblai/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * The registrable parent domain for the shared Open edX cookie, so the choice
 * is visible to every ibl.ai app on the same base domain (`crm.iblai.app` →
 * `.iblai.app`). `undefined` on localhost and bare IPs, where browsers reject
 * a `domain` attribute.
 */
export function getParentCookieDomain(): string | undefined {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  if (!hostname || hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return undefined;
  }
  const base = config.platformBaseDomain();
  if (base) {
    const normalized = base.startsWith(".") ? base.slice(1) : base;
    if (hostname === normalized || hostname.endsWith(`.${normalized}`)) return `.${normalized}`;
  }
  const labels = hostname.split(".");
  if (labels.length <= 2) return `.${hostname}`;
  return `.${labels.slice(1).join(".")}`;
}

function writeCookie(name: string, value: string, domain?: string) {
  const parts = [`${name}=${value}`, "path=/", `max-age=${ONE_YEAR}`, "samesite=lax"];
  if (domain) parts.push(`domain=${domain}`);
  if (typeof window !== "undefined" && window.location.protocol === "https:") parts.push("secure");
  document.cookie = parts.join("; ");
}

/**
 * Persist the chosen language to `NEXT_LOCALE` (this host, read by next-intl on
 * the next request) and to `openedx-language-preference` on the parent domain
 * (shared with the other ibl.ai apps). Call `router.refresh()` afterwards.
 */
export function syncLanguageCookies(locale: string): Locale {
  const value = resolveLocale(locale);
  writeCookie(LOCALE_COOKIE, value);
  writeCookie(OPENEDX_LOCALE_COOKIE, value, getParentCookieDomain());
  return value;
}
