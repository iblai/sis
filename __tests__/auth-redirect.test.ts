import { describe, expect, it } from "vitest";

import { authSpaLoginUrl, isAuthSpaUrl } from "../lib/iblai/auth-redirect";

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

describe("authSpaLoginUrl", () => {
  it("sends the app, the encoded destination and the platform to the Auth SPA's login", () => {
    const url = authSpaLoginUrl(
      "skills",
      "https://lms.ibl.ai/platform/acme/courses/course-v1:acme+Alg+Fall",
      "acme",
      "https://login.iblai.app",
    );
    expect(url).toBe(
      "https://login.iblai.app/login?app=skills&redirect-to=https%3A%2F%2Flms.ibl.ai%2Fplatform%2Facme%2Fcourses%2Fcourse-v1%3Aacme%2BAlg%2BFall&tenant=acme",
    );
    expect(isAuthSpaUrl(url, "https://login.iblai.app")).toBe(true);
  });

  it("falls back to the configured Auth SPA", () => {
    expect(authSpaLoginUrl("skills", "https://lms.ibl.ai/", "acme")).toMatch(
      /^https:\/\/login\.iblai\.app\/login\?/,
    );
  });
});
