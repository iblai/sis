#!/usr/bin/env node
/**
 * The LMS contract probe: which LMS and Studio capabilities this platform
 * admin's browser session really has. Reads the Playwright storage state
 * (`e2e/auth.setup.ts` writes it; it holds `edx_jwt_token` and `dm_token`)
 * and reports status + first bytes per call — never a token.
 *
 *   pnpm exec playwright test --config e2e/playwright.config.ts --project=setup-chromium
 *   pnpm probe:lms --org <edx org> [--course <course-v1:…>] [--student-id <numeric id>]
 *         [--state playwright/.auth/user-setup-chromium.json] [--api https://api.iblai.app]
 *
 * Results go into docs/development.md and the knowledge base; the app trusts
 * nothing the probe has not proven here.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const stateFile = opt("--state", "playwright/.auth/user-setup-chromium.json");
const api = opt("--api", process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.iblai.app").replace(
  /\/$/,
  "",
);
const org = opt("--org", "");
let course = opt("--course", "");
let studentId = opt("--student-id", "");

if (!fs.existsSync(stateFile)) {
  console.error(`No saved session at ${stateFile}. Run the Playwright setup project first.`);
  process.exit(1);
}
if (!org) {
  console.error(
    "Pass --org <the platform's edX org> (the `org` of the platform entry in `tenants`).",
  );
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const storage = Object.fromEntries(
  (state.origins ?? []).flatMap((o) => (o.localStorage ?? []).map((e) => [e.name, e.value])),
);
const jwt = storage.edx_jwt_token;
if (!jwt) {
  console.error("The storage state holds no edx_jwt_token — sign in again through the app.");
  process.exit(1);
}
const me = (() => {
  try {
    return JSON.parse(storage.userData ?? "{}").user_nicename ?? "";
  } catch {
    return "";
  }
})();

const results = [];
async function probe(label, url, init = {}) {
  const started = Date.now();
  let status = "ERR";
  let head = "";
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `JWT ${jwt}`, Accept: "application/json", ...init.headers },
      credentials: "omit",
    });
    status = res.status;
    head = (await res.text()).replace(/\s+/g, " ").slice(0, 160);
  } catch (err) {
    head = err instanceof Error ? err.message : String(err);
  }
  results.push({ label, status, ms: Date.now() - started, head });
  console.log(`${String(status).padEnd(4)} ${label}\n     ${head}`);
  return { status, head };
}
const form = (fields) => new URLSearchParams(fields);

console.log(`Probing ${api} as ${me || "(unknown user)"} for org ${org}\n`);
await probe("GET lms/api/user/v1/me", `${api}/lms/api/user/v1/me`);
await probe(
  "GET lms/api/courses/v1/courses/?org= (403 expected: blocked at the edge for every caller, the app lists from Studio)",
  `${api}/lms/api/courses/v1/courses/?org=${encodeURIComponent(org)}&username=${encodeURIComponent(me)}&page_size=5`,
);
const courses = await probe(
  "GET studio/api/contentstore/v1/home/courses?org= (the section list)",
  `${api}/studio/api/contentstore/v1/home/courses?org=${encodeURIComponent(org)}`,
);
if (!course) {
  try {
    const body = JSON.parse(courses.head.length < 160 ? courses.head : "{}");
    course = body.courses?.[0]?.course_key ?? "";
  } catch {
    /* the head was truncated; pass --course */
  }
}
if (!course) {
  const res = await fetch(
    `${api}/studio/api/contentstore/v1/home/courses?org=${encodeURIComponent(org)}`,
    { headers: { Authorization: `JWT ${jwt}` }, credentials: "omit" },
  )
    .then((r) => r.json())
    .catch(() => null);
  course = res?.courses?.[0]?.course_key ?? "";
}
if (!course) {
  console.error("\nNo course run found for the org; pass --course to continue.");
  process.exit(1);
}
console.log(`\nCourse under test: ${course}\n`);

await probe(
  "POST …/instructor/api/get_students_features (org-instructor implied rights)",
  `${api}/lms/courses/${course}/instructor/api/get_students_features`,
  { method: "POST", body: form({}) },
);
if (!studentId) {
  const res = await fetch(`${api}/lms/courses/${course}/instructor/api/get_students_features`, {
    method: "POST",
    body: form({}),
    headers: { Authorization: `JWT ${jwt}` },
    credentials: "omit",
  })
    .then((r) => r.json())
    .catch(() => null);
  studentId = res?.students?.[0]?.id ?? "";
}
await probe(
  "POST …/instructor/api/list_course_role_members {staff}",
  `${api}/lms/courses/${course}/instructor/api/list_course_role_members`,
  {
    method: "POST",
    body: form({ rolename: "staff" }),
  },
);
await probe(
  "GET lms/api/grades/v1/gradebook/{C}/ (403 = grades.writable_gradebook off)",
  `${api}/lms/api/grades/v1/gradebook/${course}/?page_size=1`,
);
await probe(
  "GET lms/api/grades/v1/gradebook/{C}/grading-info",
  `${api}/lms/api/grades/v1/gradebook/${course}/grading-info`,
);
if (studentId) {
  await probe(
    `GET lms/api/course_home/v1/progress/{C}/${studentId}`,
    `${api}/lms/api/course_home/v1/progress/${course}/${studentId}`,
  );
} else {
  console.log("     (no student on the roster — progress skipped)");
}
await probe(
  "OPTIONS …/instructor/api/students_update_enrollment (401/403 = session-only; 405 = JWT query-param middleware on)",
  `${api}/lms/courses/${course}/instructor/api/students_update_enrollment`,
  { method: "OPTIONS" },
);
await probe(
  "GET lms/api/enrollment/v1/enrollment?user=<me>",
  `${api}/lms/api/enrollment/v1/enrollment?user=${encodeURIComponent(me)}`,
);
await probe(
  "GET lms/api/ibl/users/manage/roles/?username=<me>",
  `${api}/lms/api/ibl/users/manage/roles/?username=${encodeURIComponent(me)}`,
);
await probe("GET lms/api/instructor/v1/tasks/{C}", `${api}/lms/api/instructor/v1/tasks/${course}`);
await probe(
  "GET lms/api/instructor_task/v1/schedules/{C}/bulk_email/",
  `${api}/lms/api/instructor_task/v1/schedules/${course}/bulk_email/`,
);
await probe(
  "GET studio/api/contentstore/v1/course_details/{C}",
  `${api}/studio/api/contentstore/v1/course_details/${course}`,
);
await probe(
  "GET studio/api/contentstore/v1/course_grading/{C}",
  `${api}/studio/api/contentstore/v1/course_grading/${course}`,
);
await probe(
  "GET studio/api/ibl/manage/course/?course_key=",
  `${api}/studio/api/ibl/manage/course/?course_key=${encodeURIComponent(course)}`,
);
await probe(
  "GET lms/api/course_home/v1/course_metadata/{C} (the section header)",
  `${api}/lms/api/course_home/v1/course_metadata/${course}`,
);

console.log("\nSummary");
for (const r of results)
  console.log(`  ${String(r.status).padEnd(4)} ${r.ms.toString().padStart(5)}ms  ${r.label}`);
console.log(
  "\nWrites are proven by hand in the UI: one course invitation, one modify_access allow/revoke, one import CSV,",
  "\none gradebook override, one send_email to myself, one Studio rerun, one course_details PUT.",
);
