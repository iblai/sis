import { describe, expect, it } from "vitest";
import { mainOrg } from "../lib/iblai/house-journeys";
import { sampleResponse } from "../lib/sis/sample/respond";
import {
  COURSES,
  GROUPS,
  PEOPLE,
  STUDENTS,
  coursesOf,
  gradeOf,
  rosterOf,
} from "../lib/sis/sample/school";

const MAIN = mainOrg();
const enc = encodeURIComponent;
const first = COURSES[0];
const ava = STUDENTS[0];
// Parsed back from JSON: every sample answer must survive the wire, and the tests read it loosely.
const get = (url: string) => {
  const raw = sampleResponse("GET", url);
  return raw === undefined ? undefined : JSON.parse(JSON.stringify(raw));
};

describe("the sample school", () => {
  it("is deterministic and populated: every student takes a course, every course has students", () => {
    expect(gradeOf(ava, first)).toBe(gradeOf(ava, first));
    for (const s of STUDENTS) expect(coursesOf(s).length).toBeGreaterThan(0);
    for (const c of COURSES) expect(rosterOf(c).length).toBeGreaterThan(0);
  });
});

describe("sampleResponse — the DM reads", () => {
  it("serves the directory, searched and paged", () => {
    expect(get(`/api/core/platform/users/?platform_key=${MAIN}&page_size=50`)).toMatchObject({
      count: PEOPLE.length,
      next_page: null,
    });
    const page1 = get(`/api/core/platform/users/?platform_key=${MAIN}&page_size=20`);
    expect(page1.results).toHaveLength(20);
    expect(page1.next_page).toBe(2);
    const page2 = get(`/api/core/platform/users/?platform_key=${MAIN}&page=2&page_size=20`);
    expect(page2.results).toHaveLength(PEOPLE.length - 20);
    expect(page2.previous_page).toBe(1);
    expect(get(`/api/core/platform/users/?platform_key=${MAIN}&query=ava`).results).toHaveLength(1);
  });

  it("serves a member's link, and shows a visitor as a student of the school", () => {
    const [link] = get(`/api/core/users/platforms/?username=${ava.username}&platform_key=${MAIN}`);
    expect(link).toMatchObject({ username: ava.username, key: MAIN, user_id: ava.id });
    const [visitor] = get(`/api/core/users/platforms/?username=someone.else&platform_key=${MAIN}`);
    expect(visitor).toMatchObject({ username: "someone.else", user_id: ava.id });
  });

  it("serves a record with its custom fields as the DM's list", () => {
    const record = get(`/api/core/platforms/${MAIN}/${ava.username}/demographics/`);
    expect(record.username).toBe(ava.username);
    expect(record.custom_fields).toHaveLength(12);
    expect(get(`/api/core/platforms/${MAIN}/visitor/demographics/`).username).toBe("visitor");
    expect(get(`/api/core/platforms/${MAIN}/demographics/fields/`)).toHaveLength(12);
  });

  it("serves the platform metadata with the school's sis block and sector", () => {
    const meta = get(`/api/core/orgs/${MAIN}/metadata/`);
    expect(meta.metadata.sector).toBe("k12");
    expect(meta.metadata.sis.sections).toHaveLength(COURSES.length);
    expect(meta.metadata.sis.terms.length).toBeGreaterThan(1);
  });

  it("serves groups, filtered and with members on request", () => {
    expect(get(`/api/core/user-groups/?platform_key=${MAIN}`).count).toBe(GROUPS.length);
    expect(get(`/api/core/user-groups/?platform_key=${MAIN}&name=robot`).results).toHaveLength(1);
    const withUsers = get(`/api/core/user-groups/?platform_key=${MAIN}&include_users=true`);
    expect(withUsers.results[0].users.length).toBeGreaterThan(0);
    expect(get("/api/core/user-groups/3/?include_users=true").users).toHaveLength(6);
    expect(get("/api/core/user-groups/99/?include_users=true")).toBeUndefined();
  });

  it("serves pending invitations", () => {
    expect(get(`/api/catalog/invitations/platform/?platform_key=${MAIN}`).count).toBe(2);
    expect(
      get(`/api/catalog/invitations/course/?platform_key=${MAIN}&course_id=${enc(first.key)}`)
        .count,
    ).toBe(1);
    expect(
      get(`/api/catalog/invitations/course/?platform_key=${MAIN}&course_id=${enc(COURSES[1].key)}`)
        .count,
    ).toBe(0);
  });

  it("serves the guardians' watched groups", () => {
    expect(get(`/api/core/watched-groups/?platform_key=${MAIN}&limit=100`).count).toBe(3);
    const detail = get(`/api/core/watched-groups/300/?platform_key=${MAIN}`);
    expect(detail.watchers).toHaveLength(1);
    expect(detail.watched_users[0].username).toBe(ava.username);
    expect(get(`/api/core/watched-groups/999/?platform_key=${MAIN}`)).toBeUndefined();
  });

  it("serves completed reports", () => {
    const list = get(`/api/reports/platforms/${MAIN}/`);
    expect(list.data).toHaveLength(3);
    expect(list.data[0].status.state).toBe("completed");
    expect(get(`/api/reports/platforms/${MAIN}/grades`).data.report_name).toBe("grades");
    expect(get(`/api/reports/platforms/${MAIN}/nope`)).toBeUndefined();
  });

  it("serves credentials and the assertions a student earned", () => {
    expect(get(`/api/credentials/orgs/${MAIN}/users/${ava.username}/`).data).toHaveLength(2);
    const earned = get(`/api/credentials/orgs/${MAIN}/users/${ava.username}/assertions/`);
    expect(earned.data.length).toBeGreaterThan(0);
    expect(earned.data[0].recipient.identity).toBe(ava.username);
    const senior = STUDENTS.find((s) => s.grade === 12)!;
    expect(
      get(`/api/credentials/orgs/${MAIN}/users/${senior.username}/assertions/`).count,
    ).toBeGreaterThanOrEqual(0);
  });

  it("serves the notification channels", () => {
    expect(
      get(`/api/notification/v1/orgs/${MAIN}/notification-builder/context/`).data.channels,
    ).toHaveLength(2);
  });

  it("serves the analytics families over the asked range", () => {
    const active = get(
      `/api/overview/orgs/${MAIN}/active-users?start_date=2026-10-01&end_date=2026-10-30`,
    );
    expect(Object.keys(active.data)).toHaveLength(30);
    expect(active.total).toBe(27);
    expect(Object.keys(get(`/api/overview/orgs/${MAIN}/registered-users`).data)).toHaveLength(30);
    expect(
      get(
        `/api/audience/orgs/${MAIN}/enrollments/over-time?start_date=2026-10-01&end_date=2026-10-09`,
      ).data,
    ).toBeDefined();
    const avg = get(`/api/overview/orgs/${MAIN}/average-grade`).data;
    expect(avg).toBeGreaterThan(0.5);
    expect(avg).toBeLessThan(1);
    expect(get(`/api/overview/orgs/${MAIN}/most-active-courses?length=3`).data).toHaveLength(3);
    expect(get(`/api/overview/orgs/${MAIN}/learners?length=4`).data).toHaveLength(4);
    expect(get(`/api/overview/orgs/${MAIN}/courses/completions`).data).toEqual([]);
    expect(get(`/api/overview/orgs/${MAIN}/unknown`)).toBeUndefined();
    expect(get(`/api/platform/orgs/${MAIN}/users/count`).data.count).toBe(PEOPLE.length);
    expect(get(`/api/platform/orgs/${MAIN}/courses/count`).data).toBe(8);
    expect(get(`/api/platform/orgs/${MAIN}/courses/grades`).data).toEqual([]);
    expect(
      typeof get(`/api/perlearner/orgs/${MAIN}/users/${ava.username}/last-access`).data.last_access,
    ).toBe("string");
    expect(
      get(`/api/perlearner/orgs/${MAIN}/users/${ava.username}/grades/per-course`).data,
    ).toEqual([]);
    expect(
      typeof get(`/api/performance/orgs/${MAIN}/courses/${enc(first.key)}/grading/average`).data,
    ).toBe("number");
    expect(
      get(`/api/performance/orgs/${MAIN}/courses/${enc(first.key)}/grading/summary`).data,
    ).toEqual({});
    expect(get(`/api/performance/orgs/${MAIN}/courses/nope/grading/average`)).toBeUndefined();
  });
});

describe("sampleResponse — the LMS and Studio reads", () => {
  it("serves the course header, enrollments and progress, the visitor's as a student's", () => {
    expect(get(`/api/course_home/v1/course_metadata/${first.key}`).title).toBe(first.name);
    expect(get("/api/course_home/v1/course_metadata/course-v1:X+Y+Z")).toBeUndefined();
    expect(get(`/api/enrollment/v1/enrollment?user=${ava.username}`)).toHaveLength(
      coursesOf(ava).length,
    );
    expect(get(`/api/course_home/v1/progress/${first.key}/${ava.id}`).course_grade.percent).toBe(
      gradeOf(ava, first),
    );
    expect(get(`/api/course_home/v1/progress/${first.key}`).username).toBe(ava.username);
    expect(get(`/api/course_home/v1/progress/${first.key}/999`)).toBeUndefined();
  });

  it("serves the gradebook, its grading info and a subsection's history", () => {
    const book = get(`/api/grades/v1/gradebook/${first.key}/?page_size=50`);
    expect(book.results).toHaveLength(rosterOf(first).length);
    expect(book.results[0].section_breakdown).toHaveLength(5);
    expect(
      get(
        `/api/grades/v1/gradebook/${first.key}/?page_size=50&username=${rosterOf(first)[0].username}`,
      ).results,
    ).toHaveLength(1);
    expect(
      get(`/api/grades/v1/gradebook/${first.key}/?page_size=50&user_contains=zzz`).results,
    ).toHaveLength(0);
    expect(get(`/api/grades/v1/gradebook/${first.key}/grading-info`).subsections).toHaveLength(5);
    const block = book.results[0].section_breakdown[0].module_id;
    const history = get(`/api/grades/v1/subsection/${block}/?user_id=${book.results[0].user_id}`);
    expect(history.original_grade.possible_all).toBe(20);
    expect(
      get(`/api/grades/v1/subsection/block-v1:X+Y+Z+type@sequential+block@hw1/?user_id=1`),
    ).toBeUndefined();
  });

  it("serves course email schedules, instructor tasks and downloads", () => {
    expect(get(`/api/instructor_task/v1/schedules/${first.key}/bulk_email/`)).toHaveLength(1);
    expect(get("/api/instructor_task/v1/schedules/course-v1:X+Y+Z/bulk_email/")).toBeUndefined();
    expect(get(`/api/instructor/v1/tasks/${first.key}`).tasks).toHaveLength(1);
    expect(get(`/api/instructor/v1/reports/${first.key}`).downloads).toEqual([]);
  });

  it("serves Studio's course list, details and grading policy", () => {
    const home = get("/api/contentstore/v1/home/courses?org=Northbridge");
    expect(home.courses).toHaveLength(8);
    expect(home.archived_courses).toHaveLength(2);
    expect(get(`/api/contentstore/v1/course_details/${first.key}`).display_name).toBe(first.name);
    expect(
      get(`/api/contentstore/v1/course_grading/${first.key}`).course_details.graders,
    ).toHaveLength(3);
    expect(get(`/api/ibl/manage/course/?course_key=${enc(first.key)}`).course_key).toBe(first.key);
    expect(get("/api/ibl/manage/course/?course_key=nope")).toBeUndefined();
  });

  it("answers the instructor API's POST reads: the roster and a role's members", () => {
    const roster = sampleResponse(
      "POST",
      `/courses/${first.key}/instructor/api/get_students_features`,
    ) as {
      students_count: number;
    };
    expect(roster.students_count).toBe(rosterOf(first).length);
    const staff = sampleResponse(
      "POST",
      `/courses/${first.key}/instructor/api/list_course_role_members`,
      new URLSearchParams({ rolename: "staff" }),
    ) as Record<string, { username: string }[]>;
    expect(staff.staff[0].username).toBe(first.teacher);
    const noBody = sampleResponse(
      "POST",
      `/courses/${first.key}/instructor/api/list_course_role_members`,
    ) as Record<string, unknown[]>;
    expect(noBody.staff).toHaveLength(1);
    expect(
      sampleResponse("POST", "/courses/course-v1:X+Y+Z/instructor/api/get_students_features"),
    ).toBeUndefined();
  });
});

describe("sampleResponse — what is not a read", () => {
  it.each([
    ["PATCH", `/api/core/orgs/${MAIN}/metadata/`],
    ["POST", "/api/core/user-groups/"],
    ["DELETE", "/api/core/user-groups/3/"],
    ["POST", `/courses/${first.key}/instructor/api/modify_access`],
    ["POST", `/api/grades/v1/gradebook/${first.key}/bulk-update`],
    ["GET", `/api/reports/platforms/${MAIN}/sample-grades/download?format=csv`],
    ["GET", "/api/user/v1/me"],
  ])("%s %s is undefined, for the seam to turn into the upgrade dialog", (method, url) => {
    expect(sampleResponse(method, url)).toBeUndefined();
  });
});
