import { describe, it, expect } from "vitest";
import {
  isHashLike,
  isUnnamedTenant,
  shortTenantKey,
  tenantDisplayName,
} from "../lib/iblai/tenant";

describe("platform display names", () => {
  it("treats generated keys as identifiers, not names", () => {
    expect(isHashLike("2c0da5f7216d4b639f7a2b200307ebd2")).toBe(true);
    expect(isHashLike("f11cbe65-0d6b-49cd-806f-406f635cfe2d")).toBe(true);
    expect(isHashLike("sfbu")).toBe(false);
    expect(isHashLike("Northwind University")).toBe(false);
    expect(isHashLike("")).toBe(false);
  });

  it("uses the real name when there is one", () => {
    expect(tenantDisplayName({ key: "sfbu", platform_name: "SFBU" })).toBe("SFBU");
    expect(
      tenantDisplayName({ key: "2c0da5f7216d4b639f7a2b200307ebd2", platform_name: "Acme" }),
    ).toBe("Acme");
    expect(tenantDisplayName({ key: "main", platform_name: "ibl" })).toBe("ibl");
  });

  it("falls back to a friendly label for hash-named platforms", () => {
    const t = {
      key: "2c0da5f7216d4b639f7a2b200307ebd2",
      org: "2c0da5f7216d4b639f7a2b200307ebd2",
      platform_name: "2c0da5f7216d4b639f7a2b200307ebd2",
    };
    expect(tenantDisplayName(t)).toBe("Platform");
    expect(isUnnamedTenant(t)).toBe(true);
    expect(shortTenantKey(t.key)).toBe("2c0da5f7");
    expect(isUnnamedTenant({ key: "sfbu", platform_name: "SFBU" })).toBe(false);
    expect(shortTenantKey("sfbu")).toBe("sfbu");
  });
});
