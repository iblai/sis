import { describe, expect, it } from "vitest";

import { buildImportCsv, parseCsv, parseImportRows, toCsv } from "../lib/sis/csv";

describe("parseCsv", () => {
  it("reads quotes, escaped quotes, embedded commas and newlines", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,"x\ny"\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "x\ny"],
    ]);
  });
  it("drops blank lines and a BOM", () => {
    expect(parseCsv("﻿a,b\n\n ,\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseCsv("")).toEqual([]);
  });
});

describe("toCsv", () => {
  it("quotes what needs quoting", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          ["x,y", 'q"r'],
          [null, 3],
        ],
      ),
    ).toBe('a,b\r\n"x,y","q""r"\r\n,3\r\n');
  });
});

describe("parseImportRows", () => {
  it("reads a header in any order and derives usernames", () => {
    const { rows, errors } = parseImportRows(
      "name,email,country\nAda Lovelace,ada@example.org,GB\n,grace.h@example.org,",
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { email: "ada@example.org", username: "ada", name: "Ada Lovelace", country: "GB" },
      { email: "grace.h@example.org", username: "grace.h", name: "grace.h", country: "" },
    ]);
  });
  it("reads positional rows without a header and reports bad emails with their line", () => {
    const { rows, errors } = parseImportRows(
      "ada@example.org,ada,Ada,GB\nnot-an-email,x,X,\n,x,X,\n,,,",
    );
    expect(rows).toHaveLength(1);
    expect(errors).toEqual(["2: not-an-email", "3: (empty)"]);
  });
  it("is empty for an empty file", () => {
    expect(parseImportRows("")).toEqual({ rows: [], errors: [] });
  });
});

describe("buildImportCsv", () => {
  it("writes the LMS's four columns without a header", () => {
    expect(
      buildImportCsv([
        { email: "ada@example.org", username: "ada", name: "Ada, L", country: "GB" },
        { email: "g@example.org", username: "g", name: "G", country: "" },
      ]),
    ).toBe('ada@example.org,ada,"Ada, L",GB\ng@example.org,g,G,');
  });
});
