import { afterEach, describe, expect, it } from "vitest";

import { resolveLocale } from "../i18n/config";
import { getParentCookieDomain } from "../lib/locale-cookie";

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
});
