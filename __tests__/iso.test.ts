import { afterEach, describe, expect, it, vi } from "vitest";
import { countryOptions, languageOptions } from "@/lib/sis/iso";

describe("iso", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists every ISO 3166-1 country as an alpha-3 code, named in the locale and sorted", () => {
    const en = countryOptions("en");
    expect(en).toHaveLength(249);
    expect(new Set(en.map((o) => o.value)).size).toBe(249);
    expect(en.every((o) => /^[A-Z]{3}$/.test(o.value) && o.label !== o.value)).toBe(true);
    const labels = en.map((o) => o.label);
    expect(labels).toEqual([...labels].sort(new Intl.Collator("en").compare));
    const germany = (locale: string) =>
      countryOptions(locale).find((o) => o.value === "DEU")?.label;
    expect(["en", "es", "fr", "zh"].map(germany)).toEqual([
      "Germany",
      "Alemania",
      "Allemagne",
      "德国",
    ]);
  });

  it("lists every ISO 639-1 language, English first, the rest named in the locale and sorted", () => {
    const fr = languageOptions("fr");
    expect(fr).toHaveLength(182);
    expect(fr[0]?.value).toBe("en");
    const rest = fr.slice(1).map((o) => o.label);
    expect(rest).toEqual([...rest].sort(new Intl.Collator("fr").compare));
    expect(new Set(fr.map((o) => o.value)).size).toBe(182);
    expect(fr.every((o) => /^[a-z]{2}$/.test(o.value) && o.label !== o.value)).toBe(true);
    expect(fr.find((o) => o.value === "en")?.label).toBe("Anglais");
    expect(languageOptions("en").find((o) => o.value === "en")?.label).toBe("English");
  });
  it("falls back to the English name where the browser's ICU has none", () => {
    vi.spyOn(Intl, "DisplayNames").mockImplementation(
      class {
        of() {
          return undefined;
        }
      } as unknown as typeof Intl.DisplayNames,
    );
    const zh = languageOptions("zh");
    expect(zh[0]).toEqual({ value: "en", label: "English" });
    expect(zh.find((o) => o.value === "nd")?.label).toBe("Northern Ndebele");
    expect(countryOptions("zh").find((o) => o.value === "DEU")?.label).toBe("DEU");
  });
});
