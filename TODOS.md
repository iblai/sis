# TODOS — what waits for the Data Manager or the learning platform

ibl.ai/sis writes no endpoint of its own and ships on the backends as they are
(`iblai-dm-pro@4a53a0663`, `iblai-edx-pro@ae705e8`). Everything below needs a change in the Data
Manager (DM) or in Open edX (the LMS and Studio) before it can exist or stop being a workaround.
Two open pull requests carry part of it, [iblai-dm-pro#3104](https://github.com/iblai/iblai-dm-pro/pull/3104)
and [iblai-edx-pro#214](https://github.com/iblai/iblai-edx-pro/pull/214); neither is in production.
Each entry: what the app does today · what it needs · where that change sits.

## Removed from the app on 2026-10-09

- **Attendance** — a day view across sections, a monthly grid per student and a weekly grid per
  section, with "present" derived from time spent in the course that day (the AXD per-learner
  `engagement/…/courses/{id}/time/users/{username}/over-time` route, one call per learner).
  Removed: it stood in for a record nobody keeps. Needs a DM attendance model — one row per course
  run, learner and day with a status (present, absent, tardy, excused), a note and who recorded
  it; `GET`/`POST /api/attendance/course/` (a section's sheet for a day or a range, bulk upsert)
  and `GET /api/attendance/user/` (a learner's records on a platform between two dates); writes
  for admin and staff links of the platform, reads for the learner, their watchers and admins.
  Built and withdrawn from #3104 (new routes). `engagement/…/time/users` honouring its dates (in
  #3104) gives a batched read. To bring the old grids back, start from the scaffold commit
  `520cd30` (`git show 520cd30:lib/sis/attendance.ts`) and read per-day time from the per-learner
  `over-time` route, the only one that honours its dates.
- **Search by name** — the directory and the user picker search
  `GET /api/core/platform/users/?query=`, which matches username and email; the picker no longer
  promises a name search. #3104 adds it.

## Kept, working through a workaround

- **Students and Staff** — both pages read the same directory page and keep the rows with the
  right flags in the browser, so the pager counts every member, a page can show few rows, and a
  guardian with a membership lists as a student. Needs `is_admin`/`is_staff` parsed as booleans, a
  `group_id` filter and name search on `GET /api/core/platform/users/` (#3104); then the filters
  move server-side and Groups can filter the directory.
- **Drop** — the Enrollment tab links to the instructor dashboard's membership view. Needs
  `POST /api/ibl/enrollment/unenroll/` and `unenroll/bulk/` to admit course staff (#214; today
  global staff only, 404 for a platform admin); then Drop is a button.
- **Guardians** — a guardian is a platform user made a watcher of the student (DM watched groups)
  and receives copies of the student's notifications; there is no guardian view. Needs the watcher
  permission on demographics GET and the assertions list, and a watcher branch in the analytics
  admin-or-self permission (#3104); then a guardian signs in and sees the record, the grades and
  the credentials.
- **School data** — years, terms, grade levels, periods, rooms, subjects and every section's
  meeting pattern live in the platform metadata under `sis`, whose GET is anonymous. Needs the
  `SIS_SCHOOL` platform configuration (members read, admins write) on
  `/api/core/platform/configurations/` (#3104); then the data moves there and stops being public.
- **The student record** — the DM lets a student read and PUT their own demographics, and its
  DELETE wipes the record on every platform; the app lets a student read only and calls no
  DELETE. Needs a per-field `self_access` (hidden, read, write) and an admin-only,
  platform-scoped DELETE (#3104); then the record form hides and locks fields per the definition.
- **Pending invitations** — listed, never revoked: `DELETE /api/catalog/invitations/platform/`
  and `…/course/` answer 200 and delete nothing. Needs the DELETE to revoke a pending invitation
  (#3104: 204, 404, 409 for a redeemed one); then the list gets a Revoke action.
- **New section (rerun)** — works; Studio `POST /api/ibl/manage/course/` lets an org admin rerun
  any org's course into their own. #214 checks write access on the source course. Nothing changes
  in the app.
- **CSV import** — works; the LMS relays `course_enrollment.updated` inside the transaction, one
  try, so an import can lose a student from the DM directory. #214 relays after commit. Nothing
  changes in the app.
- **Membership links** — `GET /api/core/users/platforms/` lists another platform's members for a
  member who names it, `IsPlatformAdminOfUser` is not bound to the token's platform, and the POST
  creates stub users for unknown ids. #3104 fixes all three; the app sends only ids it already
  has. Nothing changes in the app.

## Never built — needs an endpoint that does not exist

- **Add a student without an email round trip** — today an invitation by email or the LMS CSV
  import. Needs a create-only `POST /api/core/platform/users/create/` (username, email, optional
  name; created on edX, mirrored into the DM, linked to the platform; 409 when taken; no token
  minted). Built and withdrawn from #3104.
- **Report cards** — a letter, percent, credits and comment per student and section, kept by the
  school. Needs a `ReportCardEntry` model with `GET`/`POST /api/attendance/report-card/course/`
  and `GET …/report-card/user/`. Built and withdrawn from #3104. The term report in Grades is
  computed from LMS progress and the GPA scale meanwhile.
- **Terms and sections as a model** — today platform-metadata arrays written whole (two admins
  editing Setup at once overwrite each other; compare-on-save refuses a stale list).
- **Messaging threads** — today the one-way notification builder and course email.
- **Report generators** — `attendance-report` and `report-card` generators and an `xlsx` handler
  on the existing reports route (they depend on the two models above).
- **Drop through the DM** — `DELETE /api/catalog/enrollment/courses/` over the existing
  `unenroll_user()` helper, the fallback if Drop must not go through the edX enrollment API.
- **Smaller DM items** — course metadata `/api/catalog/metadata/course/` admitting a platform
  admin of the course's platform (section data per run); `performance/…/grading/per-learner`
  declaring `page`, `length` and `search` (today ten rows); the catalog enrollment search admitting
  a platform admin without a named user (a roster fallback); demographics PATCH.
- **A course-run list per org for every member** — the standard LMS route is blocked at the edge
  for every browser, and Studio's `home/courses` lists only what the caller can author; the app
  lists sections from Studio for admins and from the learner's own enrollments for students. A
  gateway ticket or an ibl route, the LMS team's call.
