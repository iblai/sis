import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("next.config", () => {
  it("lets next/image load the platform logo from the DM host", () => {
    const apiHost = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.iblai.app")
      .hostname;
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([{ protocol: "https", hostname: apiHost }]),
    );
  });

  it("does not advertise the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
