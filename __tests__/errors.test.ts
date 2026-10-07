import { describe, expect, it } from "vitest";

import { detailFromBody, errorMessage, errorStatus } from "../lib/sis/errors";

describe("detailFromBody", () => {
  it("reads DRF's detail, as a string or a list", () => {
    expect(detailFromBody({ detail: "Not found." })).toBe("Not found.");
    expect(detailFromBody({ detail: ["Pass", "one"] })).toBe("Pass one");
  });
  it("reads the AXD, the instructor API and Studio shapes", () => {
    expect(detailFromBody({ error: true, message: "No data" })).toBe("No data");
    expect(detailFromBody({ error: "Course not found" })).toBe("Course not found");
    expect(detailFromBody({ developer_message: "Bad key" })).toBe("Bad key");
  });
  it("names the field of a DRF field error", () => {
    expect(detailFromBody({ name: ["This field is required."] })).toBe(
      "name: This field is required.",
    );
    expect(detailFromBody({ count: 3, slug: "taken" })).toBe("slug: taken");
  });
  it("says nothing for an HTML page, an empty body or only non-string fields", () => {
    expect(detailFromBody("<html>500</html>")).toBe("");
    expect(detailFromBody(undefined)).toBe("");
    expect(detailFromBody({})).toBe("");
    expect(detailFromBody({ count: 3 })).toBe("");
  });
});

describe("errorMessage / errorStatus", () => {
  it("prefers detail, then error, then message, then the fallback", () => {
    expect(errorMessage({ detail: "d", error: "e" }, "f")).toBe("d");
    expect(errorMessage({ error: "e", message: "m" }, "f")).toBe("e");
    expect(errorMessage({ message: "m" }, "f")).toBe("m");
    expect(errorMessage({ detail: "" }, "f")).toBe("f");
    expect(errorMessage("nope", "f")).toBe("f");
    expect(errorMessage(null, "f")).toBe("f");
  });
  it("reads the status", () => {
    expect(errorStatus({ status: 403, detail: "" })).toBe(403);
    expect(errorStatus({ status: "FETCH_ERROR" })).toBe("FETCH_ERROR");
    expect(errorStatus(undefined)).toBeUndefined();
  });
});
