# E2E coverage

Playwright journeys in `e2e/journeys/`, signed in through the real Auth SPA
by `e2e/auth.setup.ts` as the two test accounts `pnpm e2e:accounts` creates
in a **throwaway platform** — never the community platform. The same setup
file seeds the school once and writes `playwright/.auth/seed.json`; a journey
that needs the seed skips with a reason until the setup project has run.

**`e2e/coverage.json` is the checkpoint list.** Every id in it is one test
titled `"<ID> · …"` in its spec, every titled test is in it, every page under
`app/platform/` is a source file of some journey, and the summary is what the
journeys add up to — `__tests__/e2e-coverage.test.ts` enforces all four on
`pnpm test`, so a removed checkpoint is a visible edit to the ledger.

## The journeys

| File            | Ids      | Runs as | What it covers                                                                                      |
| --------------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `auth`          | A\*      | admin   | the sign-in round trip, `/platform/main`, the 403 and 404 pages, the auth-redirect proxy            |
| `shell`         | S\*      | admin   | sidebar, top bar, ⌘K, Admin/User mode, the SDK profile, help, footer and Management dialogs, logout |
| `mobile`        | S6, S25+ | both    | every page at a Pixel 7 width without sideways overflow; the sheet                                  |
| `member`        | M\*      | student | the student's home, courses, own record, inbox; every admin surface sends them home                 |
| `a11y`          | AX\*     | both    | axe-core at WCAG 2.1 AA on the SIS pages and the invite dialog                                      |
| `students`      | ST\*, C2 | admin   | directory, invitation, CSV import, the record's six tabs, guardians, deactivate/reactivate          |
| `staff`         | SF\*     | admin   | the staff list and one member's page (role writes have no safe target)                              |
| `courses`       | CO\*, C5 | admin   | the list and filters, roster, gradebook and override, settings cards, New Course and the rerun      |
| `groups`        | G\*, C6  | admin   | create, rename, members, Add Many, announce, delete                                                 |
| `grades`        | GR\*     | admin   | class averages, the term report, the grade report                                                   |
| `credentials`   | CR\*     | admin   | issue, revoke, certificates (skips when the platform defines no credential)                         |
| `reports`       | R\*, C7  | admin   | run, download, the course roster CSV                                                                |
| `messages`      | MS\*, C8 | admin   | a course email to Myself, a scheduled one, an in-app announcement read back as the student          |
| `setup`         | SU\*, C1 | admin   | every Setup tab, the student fields, compare-on-save                                                |
| `notifications` | N\*      | admin   | the bell, the inbox page, the send dialog                                                           |

## What stays behind on the throwaway platform

Every test removes what it added — rows, groups, guardians, teachers, record and
settings values — except what the app cannot undo, allowed on the throwaway
platform only: a platform invitation per run (C2; the DM's invitation delete
is a stub), an imported learning-platform account (ST4), a course run (CO11),
revoked credential rows (CR3), gradebook override history (C5), reports and
learning-platform tasks (GR3, R2, R3, CR5).

## What skips, and why

A checkpoint whose state the platform cannot guarantee skips with the reason in
the report instead of asserting weakly: no credential defined (CR2–CR4), no
completed report (C7), no graded subsection or the gradebook API off (C5), and
the learning platform's refusals — course email without its bulk-email flag
(C8, MS2) and the CSV import without automated sign-ups or course staff (ST4)
toast "You don’t have permission to do that", which the checkpoint reports.

## Known gaps

- Staff role writes (Make/Remove Admin or Teacher) are not exercised: the only
  target on a shared platform would be the e2e student.
- Sign-up, password reset and an invited user's sign-up need a mailbox.
- Sign-out (S24) stubs the Auth SPA's logout so the shared session survives;
  the round trip through the Auth SPA itself is not covered.

Run: `pnpm e2e:accounts` once, then `pnpm test:e2e` (Chromium and the phone
project), `pnpm test:e2e:all` (every browser), `pnpm test:e2e --project=chromium --no-deps e2e/journeys/<file>`
(one journey on the saved session), `pnpm test:e2e:ui`, `pnpm test:e2e:headed`.
