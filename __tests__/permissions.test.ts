import { describe, expect, it } from "vitest";

import { canOpen } from "../lib/sis/permissions";

const admin = { isAdmin: true, adminMode: true, username: "head" };
const userMode = { isAdmin: true, adminMode: false, username: "head" };
const student = { isAdmin: false, adminMode: false, username: "ada" };

describe("canOpen", () => {
  it("opens Setup and Management to admins in Admin mode only", () => {
    expect(canOpen("/platform/acme/setup", admin)).toBe(true);
    expect(canOpen("/platform/acme/admin/users", admin)).toBe(true);
    expect(canOpen("/platform/acme/setup?tab=terms", userMode)).toBe(false);
    expect(canOpen("/platform/acme/admin/users", student)).toBe(false);
  });
  it("opens the admin lists to admins in either mode, never to students", () => {
    for (const path of [
      "students",
      "staff",
      "groups/3",
      "attendance",
      "grades",
      "credentials",
      "reports",
      "messages",
    ]) {
      expect(canOpen(`/platform/acme/${path}`, userMode)).toBe(true);
      expect(canOpen(`/platform/acme/${path}`, student)).toBe(false);
    }
  });
  it("opens a student's own record to that student", () => {
    expect(canOpen("/platform/acme/students/ada", student)).toBe(true);
    expect(canOpen("/platform/acme/students/ada?tab=grades", student)).toBe(true);
    expect(canOpen("/platform/acme/students/grace", student)).toBe(false);
    expect(canOpen("/platform/acme/students/ada%20b", { ...student, username: "ada b" })).toBe(
      true,
    );
    expect(canOpen("/platform/acme/students/grace", userMode)).toBe(true);
  });
  it("opens home, courses and notifications to everyone", () => {
    expect(canOpen("/platform/acme", student)).toBe(true);
    expect(canOpen("/platform/acme/", student)).toBe(true);
    expect(canOpen("/platform/acme/courses/course-v1:O+N+R", student)).toBe(true);
    expect(canOpen("/platform/acme/notifications", student)).toBe(true);
  });
});
