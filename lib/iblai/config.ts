/**
 * ibl.ai runtime configuration for ibl.ai/sis.
 *
 * Hosted-iblai.app defaults live in code: with no env vars at all, every
 * service routes through https://api.iblai.app and sign-in goes through
 * https://login.iblai.app. `.env.local` (copied from `.env.example`) holds
 * the optional overrides for self-hosted deployments.
 *
 * Priority: runtime window.__ENV__ → build-time process.env → fallback.
 *
 * This is a MULTI-PLATFORM app (the os.ibl.ai model): the platform — the
 * school — comes from the URL (`/platform/[tenantKey]/…`). Nothing resolves
 * to `NEXT_PUBLIC_MAIN_TENANT_KEY`; it only names the community platform the
 * app refuses to work in.
 */

// Static env declarations — Next.js inlines NEXT_PUBLIC_* values at build
// time only when they appear as literal process.env.NEXT_PUBLIC_* references.
const env = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_BASE_WS_URL: process.env.NEXT_PUBLIC_BASE_WS_URL,
  NEXT_PUBLIC_LEGACY_LMS_URL: process.env.NEXT_PUBLIC_LEGACY_LMS_URL,
  NEXT_PUBLIC_MFE_URL: process.env.NEXT_PUBLIC_MFE_URL,
  NEXT_PUBLIC_PLATFORM_BASE_DOMAIN: process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN,
  NEXT_PUBLIC_MAIN_TENANT_KEY: process.env.NEXT_PUBLIC_MAIN_TENANT_KEY,
  NEXT_PUBLIC_IBL_PLATFORM: process.env.NEXT_PUBLIC_IBL_PLATFORM,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_HELP_CENTER_URL: process.env.NEXT_PUBLIC_HELP_CENTER_URL,
  NEXT_PUBLIC_DOCUMENTATION_URL: process.env.NEXT_PUBLIC_DOCUMENTATION_URL,
  NEXT_PUBLIC_OS_URL: process.env.NEXT_PUBLIC_OS_URL,
  NEXT_PUBLIC_ENABLE_RBAC: process.env.NEXT_PUBLIC_ENABLE_RBAC,
  NEXT_PUBLIC_ENABLE_GRAVATAR_ON_PROFILE_PIC:
    process.env.NEXT_PUBLIC_ENABLE_GRAVATAR_ON_PROFILE_PIC,
};

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

const runtimeEnv = () => (typeof window !== "undefined" ? window.__ENV__ || {} : {});

/** First non-empty value wins: runtime env.js → build-time env → fallback. */
const getEnv = (key: keyof typeof env, fallback = ""): string => {
  const runtime = runtimeEnv()[key];
  if (runtime !== undefined && runtime !== null && runtime !== "") return runtime;
  const build = env[key];
  if (build !== undefined && build !== null && build !== "") return build;
  return fallback;
};

const domain = () => getEnv("NEXT_PUBLIC_PLATFORM_BASE_DOMAIN", "iblai.app");

// With no explicit NEXT_PUBLIC_API_BASE_URL, hosted iblai.app always routes
// through the consolidated API — its per-service subdomains reject the
// session tokens the Auth SPA issues. A non-iblai.app domain with no API
// base opts into distributed mode.
const apiBase = () => {
  const explicit = getEnv("NEXT_PUBLIC_API_BASE_URL");
  if (explicit) return explicit;
  return domain() === "iblai.app" ? "https://api.iblai.app" : "";
};

const config = {
  authUrl: () => getEnv("NEXT_PUBLIC_AUTH_URL", `https://login.${domain()}`),

  /** The LMS (Open edX) — rosters, gradebook, roles; JWT through the gateway. */
  lmsUrl: () => {
    const base = apiBase();
    if (base) return `${base}/lms`;
    return `https://learn.${domain()}`;
  },

  /** Studio (the CMS) — course reruns, dates, grading policy; JWT through the gateway. */
  studioUrl: () => {
    const base = apiBase();
    if (base) return `${base}/studio`;
    return `https://studio.learn.${domain()}`;
  },

  /** The Open edX micro-frontends (the gradebook embed). */
  mfeUrl: () => getEnv("NEXT_PUBLIC_MFE_URL", `https://apps.learn.${domain()}`),

  /** Data Manager — directory, student records, groups, analytics, reports. */
  dmUrl: () => {
    const base = apiBase();
    if (base) return `${base}/dm`;
    return `https://base.manager.${domain()}`;
  },

  axdUrl: () => {
    const base = apiBase();
    if (base) return `${base}/axd`;
    return `https://base.manager.${domain()}`;
  },

  legacyLmsUrl: () => getEnv("NEXT_PUBLIC_LEGACY_LMS_URL", `https://learn.${domain()}`),

  baseWsUrl: () => getEnv("NEXT_PUBLIC_BASE_WS_URL", `wss://asgi.data.${domain()}`),

  /** The community platform — the one place the app never works in. */
  mainTenantKey: () => getEnv("NEXT_PUBLIC_MAIN_TENANT_KEY", "main"),

  /** `app=` sent to the Auth SPA — same as the OS so every platform signs in. */
  iblPlatform: () => getEnv("NEXT_PUBLIC_IBL_PLATFORM", "mentor"),

  platformBaseDomain: () => domain(),

  appName: () => getEnv("NEXT_PUBLIC_APP_NAME", "ibl.ai/sis"),
  supportEmail: () => getEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "support@ibl.ai"),
  helpCenterUrl: () => getEnv("NEXT_PUBLIC_HELP_CENTER_URL", "https://ibl.ai/support"),
  documentationUrl: () => getEnv("NEXT_PUBLIC_DOCUMENTATION_URL", "https://ibl.ai/docs"),
  /** The Agentic OS — where agents, billing and platform admin live. */
  osUrl: () => getEnv("NEXT_PUBLIC_OS_URL", "https://os.ibl.ai"),

  enableRBAC: () => getEnv("NEXT_PUBLIC_ENABLE_RBAC", "false") === "true",
  enableGravatarOnProfilePic: () =>
    getEnv("NEXT_PUBLIC_ENABLE_GRAVATAR_ON_PROFILE_PIC", "true") !== "false",
};

export default config;
export { getEnv };
