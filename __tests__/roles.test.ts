import { describe, expect, it } from "vitest";
import { roleMembers } from "@/lib/sis/roles";

describe("roleMembers", () => {
  const jane = { username: "jane", email: "jane@example.com" };
  it("reads the list the LMS keys by role name", () => {
    expect(roleMembers({ course_id: "c", staff: [jane] }, "staff")).toEqual([jane]);
    expect(roleMembers({ course_id: "c", instructor: [jane] }, "staff")).toEqual([]);
  });
  it("accepts a users key and nothing else", () => {
    expect(roleMembers({ course_id: "c", users: [jane] }, "staff")).toEqual([jane]);
    expect(roleMembers({ course_id: "c", staff: "nope" }, "staff")).toEqual([]);
    expect(roleMembers({}, "instructor")).toEqual([]);
  });
});
