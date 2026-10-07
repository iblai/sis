import { describe, expect, it } from "vitest";

import { isAuthSpaUrl } from "../lib/iblai/auth-redirect";

describe("isAuthSpaUrl", () => {
  const auth = "https://login.iblai.app";

  it("accepts the Auth SPA's own origin, any path and query", () => {
    expect(isAuthSpaUrl("https://login.iblai.app/login?app=mentor&tenant=acme", auth)).toBe(true);
  });

  it("refuses look-alike hosts, other schemes and relative paths", () => {
    expect(isAuthSpaUrl("https://login-iblai.evil.example/login", auth)).toBe(false);
    expect(isAuthSpaUrl("https://login.iblai.app.evil.example/", auth)).toBe(false);
    expect(isAuthSpaUrl("http://login.iblai.app/login", auth)).toBe(false);
    expect(isAuthSpaUrl(["javascript", "alert(1)"].join(":"), auth)).toBe(false);
    expect(isAuthSpaUrl("/login", auth)).toBe(false);
    expect(isAuthSpaUrl("", auth)).toBe(false);
  });

  it("falls back to the configured Auth SPA", () => {
    expect(isAuthSpaUrl("https://login.iblai.app/login")).toBe(true);
  });
});
