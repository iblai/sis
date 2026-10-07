# E2E coverage

Playwright journeys in `e2e/journeys/`, signed in once through the real Auth
SPA by `e2e/auth.setup.ts`, on a **throwaway platform** whose admin's
credentials are in `e2e/.env.development` — never the community platform.
`e2e/coverage.json` is the checkpoint list; keep it in sync when user-facing
behavior changes.

| Journey | Checkpoints                                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth    | A1 fresh profile → Auth SPA with no `tenant=`, lands off `main` · A2 tokens + platforms stored, URL platform = session platform · A3 `/students` prefixed, query kept · A4 `/platform/main` notice |
| shell   | S1 sidebar reaches every admin row · S2 ⌘K groups and create actions · S3 profile menu names the platform · S4 Setup gate · S5 home period → `/api/overview/` window                               |
| sis     | C1 a term saved in Setup · C3 the course list · C4 roster + teachers · C6 a group created · C9 a record field saved                                                                                |

Not yet automated (proven by hand on the throwaway platform, see
`docs/development.md`): C2 invite a student, C5 a gradebook override, C7 a
report download, C8 a section email.

Run: `pnpm test:e2e` (all browsers), `pnpm test:e2e:ui`, `pnpm test:e2e:headed`.
