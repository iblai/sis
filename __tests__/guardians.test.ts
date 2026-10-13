import { describe, expect, it } from "vitest";
import { namesStudent } from "@/lib/sis/guardians";

describe("namesStudent", () => {
  it("matches the username as a whole word in every locale's group name", () => {
    expect(namesStudent("Guardians of jane", "jane")).toBe(true);
    expect(namesStudent("Tutores de jane", "jane")).toBe(true);
    expect(namesStudent("jane 的监护人", "jane")).toBe(true);
  });
  it("does not match another student or an unrelated group", () => {
    expect(namesStudent("Guardians of jane2", "jane")).toBe(false);
    expect(namesStudent("Grade 9 cohort", "jane")).toBe(false);
    expect(namesStudent("", "jane")).toBe(false);
  });
});
