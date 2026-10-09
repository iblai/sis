import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // The pure modules the unit tests own; components and the API slices are exercised by e2e.
      include: [
        "lib/sis/csv.ts",
        "lib/sis/dates.ts",
        "lib/sis/errors.ts",
        "lib/sis/format.ts",
        "lib/sis/grades.ts",
        "lib/sis/metadata.ts",
        "lib/sis/over-time.ts",
        "lib/sis/permissions.ts",
        "lib/sis/qs.ts",
        "lib/sis/sections.ts",
        "lib/sis/seed.ts",
        "lib/iblai/tenant.ts",
        "lib/iblai/sso-redirect.ts",
        "lib/iblai/auth-redirect.ts",
        "lib/locale-cookie.ts",
        "i18n/config.ts",
      ],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
      reporter: ["text-summary"],
    },
  },
});
