# E2E coverage

Playwright journeys in `e2e/journeys/`, signed in through the real Auth
SPA by `e2e/auth.setup.ts` as the two test accounts `pnpm e2e:accounts`
creates in a **throwaway platform** — never the community platform. The
member journey (M\*) runs as the student, the rest as the admin.
`e2e/coverage.json` is the checkpoint list; keep it in sync when user-facing
behavior changes.

| Journey | Checkpoints                                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| auth    | A1 fresh profile → Auth SPA with no `tenant=`, lands off `main` · A2 tokens + platforms stored, URL platform = session platform · A3 `/students` prefixed, query kept · A4 `/platform/main` never the shell (the notice, or moved to the own platform) |
| shell   | S1 sidebar reaches every admin row · S2 ⌘K groups and create actions · S3 the shell names the platform and the profile menu opens · S4 Setup gate · S5 home period → `/api/overview/` window · S7 Management dialog                                    |
| mobile  | S6 a phone (the `mobile` project, a Pixel 7 viewport) shows home and every admin list page without sideways overflow, and reaches Students through the sheet                                                                                           |
| member  | M1 a student's home: My Courses, My Credentials, no admin row or Admin mode switch · M2 Details opens the student's own record · M3 the admin lists and Setup send a student home                                                                      |
| sis     | C1 a term saved in Setup · C3 the course list · C4 roster + teachers · C6 a group created · C9 a record field saved                                                                                                                                    |

Not yet automated (proven by hand on the throwaway platform, see
`docs/development.md`): C2 invite a student, C5 a gradebook override, C7 a
report download, C8 a section email.

Run: `pnpm e2e:accounts` once, then `pnpm test:e2e` (all browsers and the phone),
`pnpm test:e2e --project=mobile`, `pnpm test:e2e:ui`, `pnpm test:e2e:headed`.
