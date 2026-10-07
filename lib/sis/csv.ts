/** Minimal RFC 4180 reader: quotes, escaped quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function escapeCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[],
): string {
  return [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** One line of the LMS's `register_and_enroll_students` CSV. */
export interface ImportRow {
  email: string;
  username: string;
  name: string;
  country: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A pasted or uploaded CSV → the rows the LMS import takes, with a header
 * row (`email,username,name,country`, any order) or without one (positional).
 * Blank usernames are derived from the email; a missing country stays empty.
 */
export function parseImportRows(text: string): { rows: ImportRow[]; errors: string[] } {
  const parsed = parseCsv(text);
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  if (parsed.length === 0) return { rows, errors };
  const head = parsed[0].map((h) => h.trim().toLowerCase());
  const hasHeader = head.includes("email");
  const idx = (name: string, fallback: number) => (hasHeader ? head.indexOf(name) : fallback);
  const iEmail = idx("email", 0);
  const iUser = idx("username", 1);
  const iName = idx("name", 2);
  const iCountry = idx("country", 3);
  const body = hasHeader ? parsed.slice(1) : parsed;
  body.forEach((cells, n) => {
    const line = n + (hasHeader ? 2 : 1);
    const email = (cells[iEmail] ?? "").trim();
    const name = (cells[iName] ?? "").trim();
    if (!EMAIL.test(email)) {
      errors.push(`${line}: ${email || "(empty)"}`);
      return;
    }
    const username = (cells[iUser] ?? "").trim() || email.split("@")[0].replace(/[^\w.-]/g, "_");
    rows.push({ email, username, name: name || username, country: (cells[iCountry] ?? "").trim() });
  });
  return { rows, errors };
}

/** The exact file the LMS import wants: no header, `email,username,name,country`. */
export function buildImportCsv(rows: readonly ImportRow[]): string {
  return rows
    .map((r) => [r.email, r.username, r.name, r.country].map(escapeCell).join(","))
    .join("\n");
}
