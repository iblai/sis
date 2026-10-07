import { describe, expect, it } from "vitest";

import { tenantMismatch } from "../lib/iblai/tenant";

describe("tenantMismatch", () => {
  it("flags a tab whose URL names another organization than the session", () => {
    expect(tenantMismatch("/platform/acme/deals", "globex")).toBe(true);
  });

  it("is quiet on the session's own organization, off-org routes and an unset session", () => {
    expect(tenantMismatch("/platform/acme/deals", "acme")).toBe(false);
    expect(tenantMismatch("/platform/acme%20co/deals", "acme co")).toBe(false);
    expect(tenantMismatch("/sso-login-complete", "globex")).toBe(false);
    expect(tenantMismatch("/platform/acme", "")).toBe(false);
  });
});
