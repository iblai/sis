import { describe, expect, it } from "vitest";
import { customFieldsBySlug } from "@/lib/sis/demographics";

describe("customFieldsBySlug", () => {
  it("turns the DM's list into values by slug, every type kept", () => {
    expect(
      customFieldsBySlug([
        { slug: "student_id", name: "Student ID", field_type: "text", value: "abc" },
        { slug: "credits", name: "Credits", field_type: "number", value: 3 },
        { slug: "bus", name: "Bus", field_type: "boolean", value: false },
        { slug: "homeroom", name: "Homeroom", field_type: "text", value: null },
      ]),
    ).toEqual({ student_id: "abc", credits: 3, bus: false, homeroom: null });
  });

  it("passes the PUT shape through and skips entries without a slug", () => {
    expect(customFieldsBySlug({ student_id: "abc" })).toEqual({ student_id: "abc" });
    expect(customFieldsBySlug([{ value: "x" }, null, { slug: "a", value: 1 }])).toEqual({ a: 1 });
  });

  it("is empty for an empty list, null or nothing", () => {
    expect(customFieldsBySlug([])).toEqual({});
    expect(customFieldsBySlug(null)).toEqual({});
    expect(customFieldsBySlug(undefined)).toEqual({});
    expect(customFieldsBySlug("abc")).toEqual({});
  });
});
