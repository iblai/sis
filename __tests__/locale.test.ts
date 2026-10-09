import { afterEach, describe, expect, it } from "vitest";

import { resolveLocale } from "../i18n/config";
import { getParentCookieDomain, syncLanguageCookies } from "../lib/locale-cookie";

describe("resolveLocale", () => {
  it("narrows Open edX codes to a supported locale", () => {
    expect(resolveLocale("zh-cn")).toBe("zh");
    expect(resolveLocale("fr-FR")).toBe("fr");
    expect(resolveLocale(" EN ")).toBe("en");
    expect(resolveLocale("pt-br")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
  });
});

describe("getParentCookieDomain", () => {
  const setHost = (hostname: string) => {
    (globalThis as { window?: unknown }).window = { location: { hostname, protocol: "https:" } };
  };
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("sets no domain on localhost and bare IPs", () => {
    setHost("localhost");
    expect(getParentCookieDomain()).toBeUndefined();
    setHost("127.0.0.1");
    expect(getParentCookieDomain()).toBeUndefined();
  });

  it("drops the first label of a deeper host and keeps a two-label host", () => {
    setHost("sis.iblai.app");
    expect(getParentCookieDomain()).toBe(".iblai.app");
    setHost("iblai.app");
    expect(getParentCookieDomain()).toBe(".iblai.app");
  });

  it("falls back to the host's own parent off the platform domain", () => {
    setHost("sis.iblai.me");
    expect(getParentCookieDomain()).toBe(".iblai.me");
    setHost("example.org");
    expect(getParentCookieDomain()).toBe(".example.org");
  });
});

describe("syncLanguageCookies", () => {
  const writes: string[] = [];
  const setHost = (hostname: string, protocol = "https:") => {
    (globalThis as { window?: unknown }).window = { location: { hostname, protocol } };
    (globalThis as { document?: unknown }).document = {
      set cookie(value: string) {
        writes.push(value);
      },
    };
  };
  afterEach(() => {
    writes.length = 0;
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it("writes this host's cookie and the shared one on the parent domain, secure on https", () => {
    setHost("sis.iblai.app");
    expect(syncLanguageCookies("fr-FR")).toBe("fr");
    expect(writes).toEqual([
      "NEXT_LOCALE=fr; path=/; max-age=31536000; samesite=lax; secure",
      "openedx-language-preference=fr; path=/; max-age=31536000; samesite=lax; domain=.iblai.app; secure",
    ]);
  });

  it("sets no domain and no secure flag on plain localhost", () => {
    setHost("localhost", "http:");
    expect(syncLanguageCookies("pt-br")).toBe("en");
    expect(writes).toEqual([
      "NEXT_LOCALE=en; path=/; max-age=31536000; samesite=lax",
      "openedx-language-preference=en; path=/; max-age=31536000; samesite=lax",
    ]);
  });
});
