import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * e2e/coverage.json is the checkpoint ledger: every id in it is one Playwright
 * test titled "<ID> · …" in its spec, every titled test is in it, every
 * platform page is a source file of some journey, and the summary is what the
 * journeys add up to — lowering it is a deliberate, reviewable edit.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const ledger = JSON.parse(fs.readFileSync(path.join(root, "e2e/coverage.json"), "utf8")) as {
  version: number;
  summary: { totalCheckpoints: number; totalJourneys: number };
  journeys: {
    id: string;
    spec: string;
    sourceFiles: string[];
    checkpoints: { id: string; name: string; status?: "covered" | "fixme" }[];
  }[];
};
// A test's title, as test(), test.fixme() or test.skip() write it, wrapped or not.
const TITLE = /\btest(?:\.fixme|\.skip)?\(\s*["'`]([A-Z]+\d+[a-z]?) · /g;
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const titledIds = (file: string) => [...read(file).matchAll(TITLE)].map((m) => m[1]);

function pagesUnder(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return pagesUnder(rel);
    return entry.name === "page.tsx" ? [rel] : [];
  });
}

describe("e2e/coverage.json", () => {
  it("names every journey spec once and each exists", () => {
    const specs = ledger.journeys.map((j) => j.spec);
    expect(new Set(specs).size).toBe(specs.length);
    expect(specs.filter((spec) => !fs.existsSync(path.join(root, "e2e", spec)))).toEqual([]);
    const onDisk = fs
      .readdirSync(path.join(root, "e2e/journeys"))
      .filter((f) => f.endsWith(".spec.ts"))
      .map((f) => `journeys/${f}`);
    expect(onDisk.sort()).toEqual([...specs].sort());
  });

  it("maps every checkpoint id to one titled test in its spec, and back", () => {
    const seen = new Set<string>();
    for (const journey of ledger.journeys) {
      const titled = titledIds(`e2e/${journey.spec}`);
      const listed = journey.checkpoints.map((c) => c.id);
      expect(listed.filter((id) => seen.has(id))).toEqual([]);
      for (const id of listed) seen.add(id);
      expect({ spec: journey.spec, ids: titled.sort() }).toEqual({
        spec: journey.spec,
        ids: [...listed].sort(),
      });
    }
  });

  it("covers every platform page in some journey's source files", () => {
    const covered = new Set(ledger.journeys.flatMap((j) => j.sourceFiles));
    const missing = pagesUnder("app/platform").filter((page) => !covered.has(page));
    expect(missing).toEqual([]);
  });

  it("keeps the summary equal to what the journeys add up to", () => {
    expect(ledger.summary).toEqual({
      totalCheckpoints: ledger.journeys.reduce((n, j) => n + j.checkpoints.length, 0),
      totalJourneys: ledger.journeys.length,
    });
  });
});
