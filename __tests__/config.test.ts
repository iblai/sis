import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/iblai/config.ts` captures `process.env.NEXT_PUBLIC_*` at module load
 * (Next.js inlines those), so each case resets the module registry and
 * re-imports after setting the environment it wants to describe.
 */
const PUBLIC_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_BASE_WS_URL",
  "NEXT_PUBLIC_LEGACY_LMS_URL",
  "NEXT_PUBLIC_PLATFORM_BASE_DOMAIN",
  "NEXT_PUBLIC_MAIN_TENANT_KEY",
  "NEXT_PUBLIC_IBL_PLATFORM",
  "NEXT_PUBLIC_MFE_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_HELP_CENTER_URL",
  "NEXT_PUBLIC_DOCUMENTATION_URL",
  "NEXT_PUBLIC_OS_URL",
  "NEXT_PUBLIC_ENABLE_RBAC",
  "NEXT_PUBLIC_ENABLE_GRAVATAR_ON_PROFILE_PIC",
];

async function loadConfig() {
  vi.resetModules();
  const mod = await import("../lib/iblai/config");
  return mod.default;
}

beforeEach(() => {
  for (const key of PUBLIC_KEYS) delete process.env[key];
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of PUBLIC_KEYS) delete process.env[key];
});

describe("hosted iblai.app defaults", () => {
  it("routes sign-in through login.iblai.app", async () => {
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://login.iblai.app");
  });

  it("routes every service through the consolidated API", async () => {
    const config = await loadConfig();
    expect(config.dmUrl()).toBe("https://api.iblai.app/dm");
    expect(config.lmsUrl()).toBe("https://api.iblai.app/lms");
    expect(config.studioUrl()).toBe("https://api.iblai.app/studio");
    expect(config.axdUrl()).toBe("https://api.iblai.app/axd");
    expect(config.mfeUrl()).toBe("https://apps.learn.iblai.app");
  });

  it("names `main` as the community platform", async () => {
    const config = await loadConfig();
    expect(config.mainTenantKey()).toBe("main");
  });

  it("signs in as the `mentor` app", async () => {
    const config = await loadConfig();
    expect(config.iblPlatform()).toBe("mentor");
  });

  it("fills in the remaining product defaults", async () => {
    const config = await loadConfig();
    expect(config.platformBaseDomain()).toBe("iblai.app");
    expect(config.baseWsUrl()).toBe("wss://asgi.data.iblai.app");
    expect(config.legacyLmsUrl()).toBe("https://learn.iblai.app");
    expect(config.appName()).toBe("ibl.ai/sis");
    expect(config.supportEmail()).toBe("support@ibl.ai");
    expect(config.documentationUrl()).toBe("https://ibl.ai/docs");
    expect(config.helpCenterUrl()).toBe("https://ibl.ai/support");
    expect(config.osUrl()).toBe("https://os.ibl.ai");
    expect(config.enableRBAC()).toBe(false);
    expect(config.enableGravatarOnProfilePic()).toBe(true);
  });
});

describe("build-time env overrides", () => {
  it("honors an explicit auth URL", async () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://auth.example.org";
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://auth.example.org");
  });

  it("hangs every service off an explicit API base", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.org";
    const config = await loadConfig();
    expect(config.dmUrl()).toBe("https://api.example.org/dm");
    expect(config.lmsUrl()).toBe("https://api.example.org/lms");
    expect(config.studioUrl()).toBe("https://api.example.org/studio");
    expect(config.axdUrl()).toBe("https://api.example.org/axd");
  });

  it("honors the community platform key, the sign-in app and the MFE host", async () => {
    process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "community";
    process.env.NEXT_PUBLIC_IBL_PLATFORM = "sis";
    process.env.NEXT_PUBLIC_MFE_URL = "https://apps.example.org";
    const config = await loadConfig();
    expect(config.mainTenantKey()).toBe("community");
    expect(config.iblPlatform()).toBe("sis");
    expect(config.mfeUrl()).toBe("https://apps.example.org");
  });

  it("reads the boolean flags", async () => {
    process.env.NEXT_PUBLIC_ENABLE_RBAC = "true";
    process.env.NEXT_PUBLIC_ENABLE_GRAVATAR_ON_PROFILE_PIC = "false";
    const config = await loadConfig();
    expect(config.enableRBAC()).toBe(true);
    expect(config.enableGravatarOnProfilePic()).toBe(false);
  });

  it("treats an empty value as unset", async () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "";
    process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "";
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://login.iblai.app");
    expect(config.mainTenantKey()).toBe("main");
  });
});

describe("distributed (self-hosted) mode", () => {
  it("uses the per-service subdomains when a custom domain has no API base", async () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "example.org";
    const config = await loadConfig();
    expect(config.platformBaseDomain()).toBe("example.org");
    expect(config.dmUrl()).toBe("https://base.manager.example.org");
    expect(config.axdUrl()).toBe("https://base.manager.example.org");
    expect(config.lmsUrl()).toBe("https://learn.example.org");
    expect(config.studioUrl()).toBe("https://studio.learn.example.org");
    expect(config.mfeUrl()).toBe("https://apps.learn.example.org");
    expect(config.authUrl()).toBe("https://login.example.org");
    expect(config.baseWsUrl()).toBe("wss://asgi.data.example.org");
  });

  it("still prefers an explicit API base on a custom domain", async () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "example.org";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.org";
    const config = await loadConfig();
    expect(config.dmUrl()).toBe("https://api.example.org/dm");
  });
});

describe("runtime window.__ENV__", () => {
  it("wins over the build-time environment", async () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://build.example.org";
    process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "build-org";
    vi.stubGlobal("window", {
      __ENV__: {
        NEXT_PUBLIC_AUTH_URL: "https://runtime.example.org",
        NEXT_PUBLIC_MAIN_TENANT_KEY: "runtime-org",
      },
    });
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://runtime.example.org");
    expect(config.mainTenantKey()).toBe("runtime-org");
  });

  it("redirects the whole API base at runtime", async () => {
    vi.stubGlobal("window", {
      __ENV__: { NEXT_PUBLIC_API_BASE_URL: "https://runtime.example.org/api" },
    });
    const config = await loadConfig();
    expect(config.dmUrl()).toBe("https://runtime.example.org/api/dm");
  });

  it("falls through to the build-time value when the runtime value is empty", async () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://build.example.org";
    vi.stubGlobal("window", { __ENV__: { NEXT_PUBLIC_AUTH_URL: "" } });
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://build.example.org");
  });

  it("falls through to the defaults with no __ENV__ on the window", async () => {
    vi.stubGlobal("window", {});
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://login.iblai.app");
  });
});

describe("getEnv", () => {
  it("returns the fallback for an unset key", async () => {
    vi.resetModules();
    const { getEnv } = await import("../lib/iblai/config");
    expect(getEnv("NEXT_PUBLIC_APP_NAME", "fallback")).toBe("fallback");
    expect(getEnv("NEXT_PUBLIC_APP_NAME")).toBe("");
  });
});
