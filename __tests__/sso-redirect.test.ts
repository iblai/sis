import { describe, expect, it } from "vitest";

import { resolveSsoRedirectPath } from "../lib/iblai/sso-redirect";

describe("resolveSsoRedirectPath", () => {
  it("uses the path SsoLogin resolved", () => {
    expect(resolveSsoRedirectPath("/platform/acme/deals", { tenant: "acme" }, "")).toBe(
      "/platform/acme/deals",
    );
  });

  it("falls back to the root when nothing was resolved", () => {
    expect(resolveSsoRedirectPath("", {}, "")).toBe("/");
  });

  it("refuses a resolved path that is not a plain same-origin path", () => {
    expect(resolveSsoRedirectPath(".evil.example/x", {}, "")).toBe("/");
    expect(resolveSsoRedirectPath("@evil.example", {}, "")).toBe("/");
    expect(resolveSsoRedirectPath("//evil.example", {}, "")).toBe("/");
    expect(resolveSsoRedirectPath("https://evil.example/", {}, "")).toBe("/");
    expect(resolveSsoRedirectPath("/\t/evil.example", {}, "")).toBe("/");
  });

  it("refuses the same when it arrives as the explicit path too", () => {
    expect(resolveSsoRedirectPath(".evil.example/x", {}, "?redirect-path=.evil.example%2Fx")).toBe(
      "/",
    );
  });

  describe("an explicit ?redirect-path", () => {
    it("wins when it is a plain same-origin path", () => {
      expect(resolveSsoRedirectPath("/", {}, "?redirect-path=/platform/acme/tags")).toBe(
        "/platform/acme/tags",
      );
    });

    it("keeps the query string it carries", () => {
      expect(resolveSsoRedirectPath("/", {}, "?redirect-path=%2Factivities%3Fnew%3D1")).toBe(
        "/activities?new=1",
      );
    });

    it("rejects a protocol-relative URL", () => {
      expect(resolveSsoRedirectPath("/home", {}, "?redirect-path=//evil.example.com")).toBe(
        "/home",
      );
    });

    it("rejects a backslash authority", () => {
      expect(resolveSsoRedirectPath("/home", {}, "?redirect-path=/\\evil.example.com")).toBe(
        "/home",
      );
      expect(resolveSsoRedirectPath("/home", {}, "?redirect-path=%2F%5Cevil.example.com")).toBe(
        "/home",
      );
    });

    it("rejects an absolute URL", () => {
      expect(resolveSsoRedirectPath("/home", {}, "?redirect-path=https://evil.example.com")).toBe(
        "/home",
      );
      expect(
        resolveSsoRedirectPath("/home", {}, "?redirect-path=https%3A%2F%2Fevil.example.com"),
      ).toBe("/home");
    });

    it("rejects a relative path with no leading slash", () => {
      expect(resolveSsoRedirectPath("/home", {}, "?redirect-path=evil.example.com")).toBe("/home");
    });

    it("is ignored when empty or absent", () => {
      expect(resolveSsoRedirectPath("/home", {}, "?redirect-path=")).toBe("/home");
      expect(resolveSsoRedirectPath("/home", {}, "?other=1")).toBe("/home");
    });
  });

  describe("a path scoped to another organization", () => {
    it("resets to the root when the authenticated org differs", () => {
      expect(resolveSsoRedirectPath("/platform/other/deals", { tenant: "acme" }, "")).toBe("/");
    });

    it("keeps the path when the org matches", () => {
      expect(resolveSsoRedirectPath("/platform/acme/deals", { tenant: "acme" }, "")).toBe(
        "/platform/acme/deals",
      );
    });

    it("compares the decoded org key", () => {
      expect(resolveSsoRedirectPath("/platform/my%20org/tags", { tenant: "my org" }, "")).toBe(
        "/platform/my%20org/tags",
      );
      expect(resolveSsoRedirectPath("/platform/my%20org/tags", { tenant: "other" }, "")).toBe("/");
    });

    it("also guards the explicit redirect path", () => {
      expect(
        resolveSsoRedirectPath("/", { tenant: "acme" }, "?redirect-path=/platform/other/deals"),
      ).toBe("/");
    });

    it("keeps the path when no org was authenticated", () => {
      expect(resolveSsoRedirectPath("/platform/other/deals", {}, "")).toBe("/platform/other/deals");
    });

    it("leaves non-org paths alone", () => {
      expect(resolveSsoRedirectPath("/settings", { tenant: "acme" }, "")).toBe("/settings");
    });
  });
});
