#!/usr/bin/env node
/**
 * Validate that every locale catalog (messages/{en,fr,es,zh}.json) exists and
 * contains an identical set of keys. Reports missing/extra keys per locale and
 * flags entries that are byte-identical to English (possible untranslated text),
 * excluding an allowlist of terms that legitimately stay the same. Fails on the
 * words the UI never shows ("tenant", "pupil", "section", "class period"), on ASCII apostrophes and
 * on an English label that is not Title Case (AGENTS.md rule 8).
 *
 * Exits non-zero if any locale file is missing, any key is missing, or a value
 * breaks the vocabulary rule.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "messages");
const LOCALES = ["en", "fr", "es", "zh"];

// Terms that are intentionally identical across languages.
const SAME_OK = new Set([
  "LLM",
  "MCP",
  "API",
  "IBL",
  "URL",
  "ID",
  "AI",
  "SSO",
  "PDF",
  "CSS",
  "HTML",
]);

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

let failed = false;

// 1. All locale files exist.
for (const l of LOCALES) {
  if (!existsSync(join(messagesDir, `${l}.json`))) {
    console.error(`MISSING locale file: messages/${l}.json`);
    failed = true;
  }
}
if (failed) process.exit(1);

const flat = Object.fromEntries(
  LOCALES.map((l) => [
    l,
    flatten(JSON.parse(readFileSync(join(messagesDir, `${l}.json`), "utf8"))),
  ]),
);

// 2. Key parity against the union of all keys.
const allKeys = new Set();
for (const l of LOCALES) Object.keys(flat[l]).forEach((k) => allKeys.add(k));

console.log(`Total unique keys: ${allKeys.size}`);
for (const l of LOCALES) {
  const missing = [...allKeys].filter((k) => !(k in flat[l]));
  const empty = Object.entries(flat[l])
    .filter(([, v]) => v === "" || v == null)
    .map(([k]) => k);
  console.log(
    `\n[${l}] keys=${Object.keys(flat[l]).length} missing=${missing.length} empty=${empty.length}`,
  );
  if (missing.length) {
    failed = true;
    console.log(
      "  MISSING:",
      missing.slice(0, 40).join(", ") + (missing.length > 40 ? ` …(+${missing.length - 40})` : ""),
    );
  }
  if (empty.length) {
    failed = true;
    console.log("  EMPTY:", empty.slice(0, 40).join(", "));
  }
}

// 3. Vocabulary: the words we never show (see AGENTS.md) and ASCII apostrophes.
const FORBIDDEN = {
  en: [/\btenant/i, /\bpupils?\b/i, /\bsections?\b/i, /\bclass periods?\b/i],
  es: [/\btenant/i, /\binquilin/i, /\bsecci[oó]n/i],
  fr: [/\btenant/i, /\blocataire/i, /\bsections?\b/i],
  zh: [/租户/],
};
for (const l of LOCALES) {
  const hits = Object.entries(flat[l]).filter(
    ([, v]) => typeof v === "string" && (FORBIDDEN[l].some((re) => re.test(v)) || v.includes("'")),
  );
  if (hits.length) {
    failed = true;
    console.log(`\n[${l}] ${hits.length} entries use forbidden wording or an ASCII apostrophe:`);
    hits.slice(0, 30).forEach(([k, v]) => console.log(`  ✗ ${k}="${v}"`));
  }
}

// 4. English labels are Title Case (AGENTS.md rule 8); short prose is named for what it is.
const MINOR = /^(a|an|the|of|and|or|nor|for|to|in|on|at|by|with|from|vs|per|as)$/;
const PROSE_KEY = [
  /^(where|auth)\./,
  /^errors\.(?!goHome$|signInAgain$|code$)/,
  /(^|\.)(description|body|bodyNamed|fallbackBody|info|hint|note|empty|noMatch|placeholder|cached|countLabel|previewCount|groupSize|searching|typeToSearch|clickToEdit|loading|showing|groupName|defaultComment|revokeDefaultReason|conflict|roleRefused|invalidVersion|errorGeneric|errorLoadTitle|mine|weightTotal|pendingInvitations)$/,
  /(Hint|Body|Note|Placeholder|Started|Requested|Granted|Added|Removed|Missing|Created|Updated|Scheduled)$/,
  /(^|\.)(pick|no)[A-Z]\w*$/,
  /\.empty\./,
  /^palette\.to[A-Z]/,
  /^fields\.pagination\./,
  /(^|\.)(saved|added|removed|deleted|created|updated|imported|seeded|sent|scheduled|invited|started|deactivated|reactivated|done)$/,
];
const PROSE_KEYS = new Set([
  "courses.seats",
  "courses.selfPaced",
  "reports.expires",
  "students.importDialog.preview",
  "gradebook.flagOff.title",
  "students.pending",
  "roster.count",
  "gradebook.count",
]);
// The words of a label once ICU syntax is a token: `{days}`, `{n, plural, one {# x} other {# y}}`.
const labelWords = (v) =>
  v
    .replace(/\{\w+(,\s*\w+)*,?\s*/g, " ¤ ")
    .replace(/\b(zero|one|two|few|many|other|=\d+)\s*\{/g, " ")
    .replace(/[{}#]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
const isLabel = (k, v) =>
  typeof v === "string" &&
  !/[.?!…:]$/.test(v) &&
  labelWords(v).filter((w) => /[a-z]/i.test(w)).length <= 6 &&
  !PROSE_KEYS.has(k) &&
  !PROSE_KEY.some((re) => re.test(k));
const lowerWords = (v) => {
  const w = labelWords(v);
  return w.filter((x, i) => /^[a-z]/.test(x) && !(MINOR.test(x) && i > 0 && i < w.length - 1));
};
const offenders = Object.entries(flat.en).filter(([k, v]) => isLabel(k, v) && lowerWords(v).length);
if (offenders.length) {
  failed = true;
  console.log(
    `\n[en] ${offenders.length} labels are not Title Case (labels Title Case, prose sentence case):`,
  );
  offenders.slice(0, 40).forEach(([k, v]) => console.log(`  ✗ ${k}="${v}"`));
}

// 5. Soft check: non-English entries identical to English (possible untranslated).
for (const l of LOCALES.filter((l) => l !== "en")) {
  const suspicious = [];
  for (const [k, v] of Object.entries(flat[l])) {
    const en = flat.en[k];
    if (en && v === en && typeof v === "string") {
      const words = v.replace(/\{[^}]*\}/g, "").trim();
      if (words && !SAME_OK.has(words) && /[a-zA-Z]/.test(words) && words.length > 2) {
        suspicious.push(`${k}="${v}"`);
      }
    }
  }
  if (suspicious.length) {
    console.log(`\n[${l}] ${suspicious.length} entries identical to English (review):`);
    suspicious.slice(0, 30).forEach((s) => console.log("  ~ " + s));
    if (suspicious.length > 30) console.log(`  …(+${suspicious.length - 30} more)`);
  }
}

console.log(
  failed ? "\nVALIDATION FAILED" : "\nVALIDATION PASSED — all locales complete and in sync.",
);
process.exit(failed ? 1 : 0);
