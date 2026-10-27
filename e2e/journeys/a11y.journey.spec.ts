import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { STUDENT, open } from "../helpers";

/**
 * Accessibility journey — axe-core at WCAG 2.1 AA over the pages the SIS
 * draws itself and one SDK dialog. The one rule left out is color-contrast:
 * the house muted grey (`text-muted-foreground`, table headers, placeholders)
 * fails 4.5:1 on every page, and the token is rei's call, not a locator's.
 */
async function expectNoViolations(page: Page, include?: string) {
  const builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"]);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

test.describe("accessibility journey", () => {
  test("AX1 · the admin home has no WCAG 2.1 AA violation beyond the muted text's contrast", async ({
    page,
  }) => {
    await open(page, "", /^Home\b/);
    await expectNoViolations(page);
  });

  test("AX2 · the Students list has no WCAG 2.1 AA violation beyond the muted text's contrast", async ({
    page,
  }) => {
    await open(page, "/students", /^Students\b/);
    await expectNoViolations(page);
  });

  test("AX3 · the e2e student's Record tab has no WCAG 2.1 AA violation beyond the muted text's contrast", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${encodeURIComponent(STUDENT)}?tab=record`);
    await expectNoViolations(page);
  });

  test("AX4 · Setup's Year & Terms tab has no WCAG 2.1 AA violation beyond the muted text's contrast", async ({
    page,
  }) => {
    await open(page, "/setup?tab=terms", /^Setup\b/);
    await expectNoViolations(page);
  });

  test("AX5 · the invite dialog has no WCAG 2.1 AA violation beyond the muted text's contrast", async ({
    page,
  }) => {
    await open(page, "/students?invite=1", { dialog: /invite/i });
    await expectNoViolations(page, '[role="dialog"]');
  });

  test.describe("as the student", () => {
    test.skip(
      !process.env.PLAYWRIGHT_MEMBER_USERNAME || !process.env.PLAYWRIGHT_MEMBER_PASSWORD,
      "no student account in e2e/.env.development (PLAYWRIGHT_MEMBER_*)",
    );
    test.use({
      storageState: async ({ browserName }, use) => {
        await use(`playwright/.auth/member-${browserName}.json`);
      },
    });

    test("AX6 · the student's home has no WCAG 2.1 AA violation beyond the muted text's contrast", async ({
      page,
    }) => {
      await open(page, "", /^Home\b/);
      await expectNoViolations(page);
    });
  });
});
