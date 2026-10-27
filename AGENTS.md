# AGENTS.md — ibl.ai/sis

Guidance for AI assistants (Claude Code, Cursor, Codex…) working in this
repository. `CLAUDE.md` is a symlink to this file.

## What this is

ibl.ai/sis is a **multi-platform** student information system on the ibl.ai
platform (the os.ibl.ai model). A platform is a school; its users are students
and staff; the platform's Open edX course runs are its courses. The platform
is in the URL: `/platform/[tenantKey]/…`. Users sign in with ibl.ai SSO and
switch between every platform they belong to — never the community platform.

Three backends carry the data, all through existing endpoints:

- the **DM** (Data Manager): the directory, student records (demographics),
  groups, invitations, guardians (watched groups), credentials, reports,
  announcements, analytics, and the school's own data in the platform
  metadata (`sis` block);
- the **LMS** (Open edX with the ibl plugins): course runs, rosters, course
  roles (teachers), the import, progress, the gradebook, course email, tasks;
- **Studio**: reruns (new courses), course dates and grading policy.

## Rules

1. **Platform from the URL.** Never hard-code one. Read it with
   `useSession().tenantKey`; build links with `useSession().href(path)`; the
   LMS org is `useSession().org`. Nothing resolves to, defaults to or signs in
   to `main` (`lib/iblai/tenant.ts#pickLandingTenant`, `app/page.tsx`).
2. **SDK components first.** The shell is the SDK's `SidebarProvider →
   PlatformSidebar + SidebarInset` (`components/sis/app-sidebar.tsx`), loading
   is the SDK `Spinner`; profile dropdown, notifications, Account /
   Management, invitations, platform switching all come from
   `@iblai/iblai-js`. Then shadcn/ui (`components/ui`, Base UI — use the
   `render` prop, not `asChild`; a `DropdownMenuLabel` must sit inside a
   `DropdownMenuGroup`; `CommandDialog` needs its own `<Command>` root; give
   popover search inputs `autoFocus`). Custom components last.
3. **Three backends are the contract.** DM calls in `lib/sis/api.ts`
   (`Authorization: Token <dm_token>`), LMS calls in `lib/sis/lms-api.ts` and
   Studio calls in `lib/sis/studio-api.ts` (`Authorization: JWT
   <edx_jwt_token>`, `credentials: "omit"`, through the gateway
   `<apiBase>/lms` and `<apiBase>/studio` — never the direct `learn.` hosts,
   never the SDK's Studio service). Every call names the platform or the
   course. Lists are server-paged; the Courses list (a bounded run list) is
   the one client-side exception. The directory is `GET /api/core/platform/users/`
   (the DM users search is a résumé search and returns no users); the course
   list is Studio's `home/courses` (the LMS `courses/v1` routes are blocked at
   the edge for every browser). **No new DM or LMS endpoint is written for
   this app**: a gap goes into `TODOS.md`, never into a workaround that fakes
   the feature.
4. **Where data lives.** School data and each course's term, subject, room,
   period and credits in the platform metadata
   under `sis` as arrays written whole (`hooks/use-sis-metadata.ts` — the DM
   merge replaces arrays and never deletes a key; compare-on-save refuses a
   stale list); student records in demographics (PUT resets what it does not
   receive — read, merge, write); teachers as LMS course roles
   (`modify_access`); enroll = a course invitation by username or the LMS
   import; drop needs the instructor dashboard (a link-out).
5. **Never trust an LMS capability the probe has not proven** on this platform
   (`pnpm probe:lms`, results in `docs/development.md`): the gradebook API
   flag, `ALLOW_AUTOMATED_SIGNUPS`, the bulk-email flag and the JWT
   query-param middleware are operator settings; ibl's LMS patches the
   standard enrollment POST to 404.
6. **No attendance** until the DM has an attendance model: nothing derives
   presence from analytics time; the feature and its endpoints are in `TODOS.md`.
7. **Every string is translated.** `useTranslations("<namespace>")` from
   next-intl; a key goes into all four of `messages/{en,es,fr,zh}.json` or
   none (`pnpm i18n:check`). Keys are typed from `messages/en.json`
   (`global.d.ts`). Dates and ratios go through `lib/sis/format.ts` with
   `useLocale()`. Typographic `’` and `…`.
8. **Vocabulary and case.** Students, staff, courses (a course is one course
   run on the learning platform), groups, terms, platform. Never "tenant",
   "pupil", "section" or "class period" in anything a user sees. English labels
   are Title Case — field labels, columns,
   tabs, nav, buttons, titles, legends, options, status words ("Date of Birth",
   "Add Guardian"); minor words stay lowercase unless first, last or in a
   phrasal verb ("Set Up", "Sign In"). Sentences stay sentence case:
   descriptions, hints, tooltips, toasts, errors, empty states, placeholders
   and "Pick a …" prompts; es/fr keep their own rules. `scripts/validate-i18n.mjs`
   enforces both on `pnpm i18n:check`: a short English value without terminal
   punctuation must be Title Case unless its key says prose (`…Hint`, `.body`,
   `.description`, `.placeholder`, `pick…`, a toast verb such as `saved`) —
   name a new short prose key for what it is.
9. **Never touch tokens in prose or logs.** `dm_token`, `axd_token` and
   `edx_jwt_token` stay in localStorage; the probe prints statuses, never tokens.
10. **Brand.** Primary `#0058cc`, tint `#eef6fc`, gradient CTA
    `className="ibl-button-primary"`, Lucide icons `strokeWidth={1.75}`,
    white cards with `border-[var(--border-color,#e5e7eb)]`. UI recedes: a
    status dot is grey unless it means good or bad. No dark mode work unless asked.
11. **Pages** are client components: `<PageHeader/>` then
    `<div className="flex-1 overflow-auto">` inside the platform layout.
    Admin writes render only when `useIsLiveAdmin()` (admin AND Admin Mode; the User choice is kept per platform in localStorage);
    `lib/sis/permissions.ts#canOpen` is the route gate. A page renders inside
    `PageGate` and stays behind the loading screen until every query it and its
    children issue on mount has answered (`useGateLoading` in each fetching
    component, per-row cells included); after the first paint nothing changes
    without a user action — no number, row or card fills in later. A tab panel
    gates itself the same way (`<PageGate inline>`).
12. **Web only** — no `src-tauri/`, no Tauri workflows — until rei says
    otherwise. `@tauri-apps/plugin-os` and the livekit packages are installed
    only because the SDK's bundle imports them; the app never calls them.
13. **Verify before you say it works:** `pnpm typecheck && pnpm lint && pnpm
    format:check && pnpm i18n:check && pnpm test:coverage && pnpm build`; open
    the page on a **throwaway platform** (never `main`); screenshot it. E2E
    journeys live in `e2e/journeys/` and sign in through the real Auth SPA as
    the two test accounts `pnpm e2e:accounts` creates there (an admin and a
    student; M* run as the student); never read or print `e2e/.env.development`;
    `/iblai-vibe-connect` runs from an empty directory, its `iblai.env` moved here.
    The `mobile` Playwright project (S6) opens every admin page at a phone width
    and fails on sideways overflow: phones are a gate. `e2e/coverage.json` is the
    checkpoint ledger `pnpm test` checks against the test titles; the setup
    project seeds the school and the student once (`playwright/.auth/seed.json`);
    `pnpm test:e2e` runs Chromium and the phone project, `test:e2e:all` every browser.
14. **Commits:** conventional messages; never `--no-verify`.

## Where things are

| Concern                          | File                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Config & service URLs            | `lib/iblai/config.ts` (`dmUrl`, `lmsUrl`, `studioUrl`, `mfeUrl`)                         |
| Platform resolution, admin check | `lib/iblai/tenant.ts`, `components/tenant-redirect.tsx`                                  |
| Auth redirect, logout, switch    | `lib/iblai/auth-utils.ts`                                                                |
| Provider chain                   | `providers/iblai-providers.tsx`                                                          |
| SSO landing                      | `app/sso-login-complete/page.tsx`, `lib/iblai/sso-redirect.ts`                           |
| DM · LMS · Studio slices         | `lib/sis/api.ts`, `lib/sis/lms-api.ts`, `lib/sis/studio-api.ts`, `lib/sis/base-query.ts` |
| Types                            | `lib/sis/types.ts`, `lib/sis/metadata.ts`                                                |
| School data                      | `hooks/use-sis-metadata.ts`, `hooks/use-sections.ts`, `lib/sis/sections.ts`              |
| Grades, CSV, over-time series    | `lib/sis/grades.ts`, `lib/sis/csv.ts`, `lib/sis/over-time.ts`                            |
| Translations                     | `i18n/`, `messages/{en,es,fr,zh}.json`, `scripts/validate-i18n.mjs`                      |
| Shell                            | `app/platform/[tenantKey]/layout.tsx`, `components/sis/app-sidebar.tsx`, `top-bar.tsx`   |
| Areas                            | `components/sis/{students,courses,groups,setup,dashboard}/`                              |
| Page load gate                   | `components/sis/page-gate.tsx`, `lib/sis/gate.ts`                                        |
| The LMS probe                    | `scripts/probe-lms.mjs`                                                                  |
