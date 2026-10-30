# E2E coverage

Playwright journeys in `e2e/journeys/`, signed in through the real Auth SPA
by `e2e/auth.setup.ts` as the two test accounts `pnpm e2e:accounts` creates
in a **throwaway platform** — never the community platform. The same setup
file walks the admin's first run (the SDK setup flow) once, seeds the school
once and writes `playwright/.auth/seed.json`; a journey that needs the seed
skips with a reason until the setup project has run.

**`e2e/coverage.json` is the checkpoint list and `pnpm e2e:coverage` its
gate** (`e2e/coverage.mjs`: vibe-starter's script, with the one SIS adaptation
named at its top). Every id in it is one test titled `"<ID> · …"` in its spec,
every titled test is in it, every page and route under `app/` is visited by
some journey, every `sourceFiles` entry is a page the spec names, the summary
is what the journeys add up to, and the journeys must reach 95 % of the app's
lines (a file counts when a journey visits a page that imports it) with at
least six checkpoints per 1,000 lines. `__tests__/e2e-coverage.test.ts` runs
the same gate on `pnpm test`, so a removed checkpoint is a visible edit to the
ledger. The setup project is the `sign-in` journey: it visits the SSO landing
page and has no checkpoints.

## The journeys

| File            | Ids      | Runs as | What it covers                                                                                                                                                                                                                                           |
| --------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`          | A\*      | admin   | the sign-in round trip, `/platform/main`, the preview of an unknown platform, the 403 and 404 pages, the auth-redirect proxy                                                                                                                             |
| `shell`         | S\*      | admin   | sidebar, top bar, ⌘K, Admin/User mode, the SDK profile, help, footer and Management dialogs, the languages, logout                                                                                                                                       |
| `mobile`        | S6, S25+ | both    | every page, the setup flow and the preview at a Pixel 7 width without sideways overflow; the sheet                                                                                                                                                       |
| `member`        | M\*      | student | the student's home, courses, own record, inbox; every admin surface sends them home                                                                                                                                                                      |
| `a11y`          | AX\*     | both    | axe-core at WCAG 2.1 AA on the SIS pages, the invite dialog, the setup flow and the preview                                                                                                                                                              |
| `students`      | ST\*, C2 | admin   | directory, invitation, CSV import, the record's six tabs, guardians, deactivate/reactivate                                                                                                                                                               |
| `staff`         | SF\*     | admin   | the staff list and one member's page (role writes have no safe target)                                                                                                                                                                                   |
| `courses`       | CO\*, C5 | admin   | the list and filters, roster, gradebook and override, settings cards, New Course and the rerun                                                                                                                                                           |
| `groups`        | G\*, C6  | admin   | create, rename, members, Add Many, announce, delete                                                                                                                                                                                                      |
| `grades`        | GR\*     | admin   | class averages, the term report, the grade report                                                                                                                                                                                                        |
| `credentials`   | CR\*     | admin   | issue, revoke, certificates (skips when the platform defines no credential)                                                                                                                                                                              |
| `reports`       | R\*, C7  | admin   | run, download, the course roster CSV                                                                                                                                                                                                                     |
| `messages`      | MS\*, C8 | admin   | a course email to Myself, a scheduled one, an in-app announcement read back as the student                                                                                                                                                               |
| `setup`         | SU\*, C1 | admin   | every Setup tab, the student fields, compare-on-save                                                                                                                                                                                                     |
| `notifications` | N\*      | admin   | the bell, the inbox page, the send dialog                                                                                                                                                                                                                |
| `house`         | H\*      | both    | the first-run journeys: the community platform trial-gated with the upgrade dialog and its sample school, the preview of another platform (Join, Create Your Own, Back), the admin setup flow, the member form at `/onboarding`, Management › Onboarding |
| `errors`        | E\*      | admin   | a platform read refused (500) shows the load error with its reason; a throttled one (429) is retried until the page paints                                                                                                                               |

## The checkpoints

| Id   | Journey       | Checkpoint                                                                                                          |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| A1   | auth          | a fresh profile is sent to the Auth SPA with no platform and lands on one, never main                               |
| A1b  | auth          | an authenticated user lands on their platform                                                                       |
| A2   | auth          | auth tokens and the platform list are stored in localStorage                                                        |
| A3   | auth          | a path without a platform is prefixed with the platform and keeps its query                                         |
| A4   | auth          | /platform/main never shows a school                                                                                 |
| A5   | auth          | a platform the user does not belong to is previewed, never entered or joined from the link                          |
| A6   | auth          | an unknown page under the platform ends on the 404 page and Go Home lands on the platform                           |
| A7   | auth          | a fresh profile opening a platform page is sent to sign in for that platform and page                               |
| A8   | auth          | the auth-redirect proxy hops only to the Auth SPA                                                                   |
| S1   | shell         | the sidebar reaches every admin row                                                                                 |
| S2   | shell         | ⌘K lists the groups and the create actions                                                                          |
| S3   | shell         | the shell names the current platform and the profile menu opens                                                     |
| S4   | shell         | Setup is hidden outside Admin mode and /setup redirects home                                                        |
| S5   | shell         | the home period select asks the overview for that window                                                            |
| S7   | shell         | the footer                                                                                                          |
| S8   | shell         | ⌘B collapses the sidebar to its rail, the state survives a reload, ⌘B expands it                                    |
| S9   | shell         | the logo goes to the platform home                                                                                  |
| S10  | shell         | a student record                                                                                                    |
| S11  | shell         | the top bar holds its six controls and never overflows the viewport                                                 |
| S12  | shell         | ⌘K navigates from Go To, Escape closes it, and the sidebar Search reopens it                                        |
| S13  | shell         | ⌘K Create opens the New Group dialog and a typed course name lists the course                                       |
| S14  | shell         | User mode shows the member                                                                                          |
| S15  | shell         | the profile menu lists Profile, Account, Help and Log Out, with no platform switcher                                |
| S16  | shell         | Profile opens the SDK profile dialog with its tabs, the prefilled identity and tab ARIA                             |
| S17  | shell         | the profile                                                                                                         |
| S18  | shell         | Help opens the help center in a new tab                                                                             |
| S19  | shell         | the footer                                                                                                          |
| S20  | shell         | the profile menu                                                                                                    |
| S21  | shell         | Management finds the e2e student and View profile opens their profile                                               |
| S22  | shell         | the language select switches the app to Spanish and back                                                            |
| S23  | shell         | the home and every admin list render without console errors                                                         |
| S24  | shell         | Log Out clears the session and leaves for the Auth SPA with the platform and a way back                             |
| S29  | shell         | the language select reaches French and Chinese too, and English is restored                                         |
| S30  | shell         | Profile opens for a user whose stored metadata has no social links                                                  |
| S31  | shell         | ⌘K narrows Go To and Create to what is typed, and Enter opens the typed page                                        |
| S6   | mobile        | a phone shows every admin page without sideways overflow                                                            |
| S25  | mobile        | a phone keeps the Admin switch and the language select in the sheet, out of the top bar                             |
| S26  | mobile        | the student                                                                                                         |
| S27  | mobile        | the student                                                                                                         |
| S28  | mobile        | the setup flow and the platform preview fit a phone without sideways overflow                                       |
| M1   | member        | a student                                                                                                           |
| M2   | member        | Details opens the student                                                                                           |
| M3   | member        | the admin lists and Setup send a student home                                                                       |
| M4   | member        | Courses lists the seeded course with its term, grade and progress, and opens it                                     |
| M5   | member        | the student                                                                                                         |
| M6   | member        | the student                                                                                                         |
| M7   | member        | the profile menu has no Account item and ⌘K offers only the member                                                  |
| M8   | member        | every admin list and another member                                                                                 |
| M9   | member        | the student                                                                                                         |
| AX1  | a11y          | the admin home has no WCAG 2.1 AA violation beyond the muted text                                                   |
| AX2  | a11y          | the Students list has no WCAG 2.1 AA violation beyond the muted text                                                |
| AX3  | a11y          | the e2e student                                                                                                     |
| AX4  | a11y          | Setup                                                                                                               |
| AX5  | a11y          | the invite dialog has no WCAG 2.1 AA violation beyond the muted text                                                |
| AX6  | a11y          | the student                                                                                                         |
| AX7  | a11y          | the setup flow has no WCAG 2.1 AA violation beyond the muted text                                                   |
| AX8  | a11y          | the platform preview has no WCAG 2.1 AA violation beyond the muted text                                             |
| ST1  | students      | search finds the e2e student, the row opens the record, nonsense finds nothing                                      |
| ST2  | students      | Invite Student opens the invite dialog on ?invite=1 and closing returns to the list                                 |
| C2   | students      | an invitation is sent and the pending banner lists it                                                               |
| ST3  | students      | Import CSV previews the rows it can read and the ones it cannot                                                     |
| ST4  | students      | one CSV row is imported into the seeded course                                                                      |
| ST5  | students      | the record page has six tabs, ?tab= follows them, and the breadcrumbs lead back                                     |
| ST6  | students      | Overview shows the membership status and the two summary cards                                                      |
| ST7  | students      | a school record field saves, survives a reload and is restored                                                      |
| C9   | students      | a personal field saves through its select                                                                           |
| ST8  | students      | Enrollment lists the seeded course as Enrolled and Drop is a link-out                                               |
| ST9  | students      | Grades shows the term GPA and the course row across all terms                                                       |
| ST10 | students      | a guardian is added from the directory and removed again                                                            |
| ST11 | students      | the Issue Credential dialog opens with its three fields and cancels                                                 |
| ST12 | students      | Deactivate confirms, deactivates the membership, and Reactivate undoes it                                           |
| ST13 | students      | the pagination bar counts the first page and cannot go back from it                                                 |
| SF1  | staff         | the list shows the e2e admin as Admin, searches, and nonsense finds nothing                                         |
| SF2  | staff         | Invite Staff opens the invite dialog on ?invite=1 and closing returns to the list                                   |
| SF3  | staff         | the admin                                                                                                           |
| C3   | courses       | the Courses list shows the platform                                                                                 |
| CO1  | courses       | search narrows the list to the seeded course and nonsense finds nothing                                             |
| CO2  | courses       | the term and grade-level filters narrow the list and All Platforms toggles                                          |
| C4   | courses       | the course page opens on the roster and Settings names the teachers                                                 |
| CO3  | courses       | the header links to the learning platform signed in and to the instructor dashboard                                 |
| CO4  | courses       | the roster lists the e2e student, searches, exports a CSV and links to the course email                             |
| CO5  | courses       | the gradebook grid lists the learner, filters, and opens the embedded gradebook                                     |
| C5   | courses       | a score is overridden with a reason, History gains the entry, and the score is set back                             |
| CO6  | courses       | Term and Dates fills the dates from a term and a reload discards the unsaved change                                 |
| CO7  | courses       | the Course card saves credits, the list shows them, and they are set back                                           |
| CO8  | courses       | a teacher is added from the directory and removed again                                                             |
| CO9  | courses       | the Grading Policy card renders the types, the weight total and the cutoffs; Add Type is undone by a reload         |
| CO10 | courses       | New Course derives the run id and the name from the source and the term before Create Course enables                |
| CO11 | courses       | New Course reruns the seeded course into the seeded term and lands on the new run                                   |
| G1   | groups        | search finds the seeded cohort group and a nonsense query finds nothing                                             |
| G7   | groups        | the New Group dialog refuses an empty name and Cancel returns to the list                                           |
| C6   | groups        | a group is created and the app lands on it                                                                          |
| G2   | groups        | Edit renames the group                                                                                              |
| G3   | groups        | a member is added from the picker and removed again                                                                 |
| G4   | groups        | Add Many adds the usernames it knows and names the ones it does not                                                 |
| G5   | groups        | Announce opens Messages with the group preselected                                                                  |
| G6   | groups        | Delete removes the group and the list no longer finds it                                                            |
| GR1  | grades        | the Courses table links each course to its gradebook across all terms                                               |
| GR2  | grades        | the seeded grade level shows its term report with the e2e student                                                   |
| GR3  | grades        | Course Grade Report starts the report and points at Reports                                                         |
| GR4  | grades        | the All Platforms switch toggles and the table still renders                                                        |
| CR1  | credentials   | the page lists the credentials to issue, or says none are defined, with the certificate controls                    |
| CR2  | credentials   | a credential is issued to the e2e student for the seeded course, or is already                                      |
| CR3  | credentials   | the student                                                                                                         |
| CR5  | credentials   | Generate Certificates starts the learning platform                                                                  |
| R1   | reports       | the page lists the report cards with a status pill each, or says none are available                                 |
| R2   | reports       | Run starts a report: the toast names it and its card keeps a status pill                                            |
| C7   | reports       | Download CSV of a completed report fires a download                                                                 |
| R3   | reports       | Course Reports requests the roster CSV for the seeded course                                                        |
| MS1  | messages      | ?course= preselects the course and Learners is the default audience                                                 |
| C8   | messages      | a course email to Myself only is sent                                                                               |
| MS2  | messages      | a schedule time turns Send into Schedule and the email lands in the Scheduled list                                  |
| MS3  | messages      | an in-app announcement to the named e2e student reaches their inbox                                                 |
| MS4  | messages      | ?group= preselects the group audience and Send waits for a preview                                                  |
| C1   | setup         | Setup adds a school year, keeps it, and removes it again                                                            |
| SU1  | setup         | the seven tabs open from ?tab= and the tab list never widens the page                                               |
| SU2  | setup         | School saves the address, phone and time zone, keeps them, and gets them back                                       |
| SU3  | setup         | a term under the seeded year saves, survives a reload and is removed again                                          |
| SU4  | setup         | a grade level gets a cohort group, saves linked, and both are removed again                                         |
| SU5  | setup         | a period saves, survives a reload and is removed again                                                              |
| SU6  | setup         | a room saves, survives a reload and is removed again                                                                |
| SU7  | setup         | a subject saves, survives a reload and is removed again                                                             |
| SU8  | setup         | Seed Defaults is idempotent after the seed and Student ID is listed                                                 |
| SU9  | setup         | a select field with choices is added, listed, and deleted again                                                     |
| SU10 | setup         | Export downloads the field definitions as student-fields.csv                                                        |
| SU11 | setup         | Save stays disabled until a list is dirty and every required cell is filled                                         |
| SU12 | setup         | a list changed meanwhile refuses the stale save and shows the other change                                          |
| N1   | notifications | the bell opens the notification dropdown and View all goes to the inbox                                             |
| N2   | notifications | the inbox page renders the SDK inbox and alerts tabs                                                                |
| N3   | notifications | an admin                                                                                                            |
| H1   | house         | lands on the community platform inside the shell, with the admin cluster shown                                      |
| H12  | house         | the community platform shows the sample school: the admin rows, a filled Students list and the notice               |
| H13  | house         | a write on the sample school opens the upgrade dialog                                                               |
| H14  | house         | the upgrade dialog's Upgrade for free opens this app's $0 checkout                                                  |
| H2   | house         | a trial-gated click opens the SDK upgrade dialog, and Escape closes it                                              |
| H3   | house         | the platform is previewed, and Join goes to the auth page                                                           |
| H4   | house         | Create Your Own Platform is ibl.ai                                                                                  |
| H9   | house         | Back to My Platform leaves the preview for the user                                                                 |
| H5   | house         | a readably keyed platform is not asked its name: the first run is sector, team, done, and the home holds afterwards |
| H6   | house         | an admin who finished it stays home                                                                                 |
| H10  | house         | Management › Onboarding opens for the admin, its agent links based on this app                                      |
| H7   | house         | a member is sent to the platform                                                                                    |
| H8   | house         | with nothing configured, /onboarding says so and Continue goes home                                                 |
| H11  | house         | a named platform whose sector is set gets only the team step and the finish                                         |
| H15  | house         | still on the community platform while the platform lists their own, the SDK moves them to it                        |
| H16  | house         | Upgrade Plan asks for a pricing page that returns through the sign-in app                                           |
| E1   | errors        | a platform read answered 500 shows the load error with its reason, never an empty state                             |
| E2   | errors        | a throttled platform read is retried until the page paints                                                          |

## What stays behind on the throwaway platform

Every test removes what it added — rows, groups, guardians, teachers, record and
settings values — except what the app cannot undo, allowed on the throwaway
platform only: a platform invitation per run (C2; the DM's invitation delete
is a stub), an imported learning-platform account (ST4), a course run (CO11),
revoked credential rows (CR3), gradebook override history (C5), reports and
learning-platform tasks (GR3, R2, R3, CR5), and the e2e admin's own
`onboarding.completed` from the seed's one walk through the setup flow. The
house journey serves every platform-wide state (the membership list, the
member form, the setup-flow metadata) with `page.route` and writes none of it.

## What skips, and why

A checkpoint whose state the platform cannot guarantee skips with the reason in
the report instead of asserting weakly: no credential defined (CR2–CR4), no
completed report (C7), no graded subsection or the gradebook API off (C5), and
the learning platform's refusals — course email without its bulk-email flag
(C8, MS2) and the CSV import without automated sign-ups or course staff (ST4)
toast "You don’t have permission to do that", which the checkpoint reports.
The student's checkpoints (M\*, S27, AX6, H1–H4, H7–H9, H12–H14) skip until
`pnpm e2e:accounts` has created the student account. H11 skips until the
installed web-containers carries `initialAnswers` (the release after 1.56.0), H14
until it carries `checkoutUrl` (the release of iblai-web-frontend#2195).

## Known gaps

- Staff role writes (Make/Remove Admin or Teacher) are not exercised: the only
  target on a shared platform would be the e2e student.
- Sign-up, password reset and an invited user's sign-up need a mailbox.
- Sign-out (S24) stubs the Auth SPA's logout so the shared session survives;
  the round trip through the Auth SPA itself is not covered, and a 401 on a
  read is not simulated either (its handler signs the shared session out).
- The real join and the real $0 checkout are the platform's side (the OS's own
  journeys cover them); H3 and H4 stop at the request. The credit badge on a
  real main-only session is not driven.
- A member form switched on in Management › Onboarding of the throwaway
  platform would send every student checkpoint to `/onboarding` first; H7
  serves the form with `page.route` instead. Keep it off there.

Run: `pnpm e2e:accounts` once, then `pnpm test:e2e` (Chromium and the phone
project), `pnpm test:e2e:all` (every browser), `pnpm test:e2e --project=chromium --no-deps e2e/journeys/<file>`
(one journey on the saved session), `pnpm test:e2e:ui`, `pnpm test:e2e:headed`;
`pnpm e2e:coverage` for the ledger gate and the approximate reach (`pnpm test`
runs it too).
