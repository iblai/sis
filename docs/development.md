# Development Guide

## Prerequisites

- Node.js 22+ (26 is what `.tool-versions` pins; the `dev` script disables Node's experimental web storage)
- pnpm 12 — `corepack enable` installs the version pinned in `package.json`
- An ibl.ai account that **administers a throwaway platform**. The app never works in the community platform (`main`): `/platform/main` shows a notice, and nothing resolves or signs in there.

## Run

```bash
pnpm install --ignore-scripts
pnpm dev
```

The app redirects to `login.iblai.app` with no `tenant=`; the Auth SPA picks your
platform and you land on `/platform/<platform>`. `http://localhost:3000` must be an
allowed redirect origin of that platform (ask your operator otherwise). Open
`/platform/<throwaway>` by URL to work in another platform you administer.

## Environment

Nothing is required against hosted `iblai.app`. Copy `.env.example` to
`.env.local` to override the service URLs (self-hosting) or the micro-frontend
host (`NEXT_PUBLIC_MFE_URL`, the embedded gradebook). `iblai.env` holds the
platform shorthand used by the vibe skills (`DOMAIN`, `PLATFORM`, `TOKEN`) — it is
gitignored. `/iblai-vibe-connect` writes it: run that from an empty directory and move the
file here, never from this root (it would set `NEXT_PUBLIC_MAIN_TENANT_KEY` to the picked
platform).

## How sign-in and platforms work

1. `providers/iblai-providers.tsx` initializes the SDK data layer (with the Studio
   URL — the SDK's default does not respond) and mounts `AuthProvider` →
   `TenantProvider`.
2. `AuthProvider` checks for a non-expired session; without one it calls
   `redirectToAuthSpa()` (`lib/iblai/auth-utils.ts`), which goes through
   `/api/auth-redirect` to `login.<domain>/login?app=mentor&redirect-to=<origin>`.
   `tenant=` is added only when the URL or the session names a platform; the
   community platform is never named.
3. The Auth SPA returns to `/sso-login-complete?data=…`; the SDK's `SsoLogin`
   stores `axd_token`, `dm_token`, `edx_jwt_token`, `userData`, `current_tenant`.
   `lib/iblai/sso-redirect.ts` sanitizes the landing path and resets it to `/`
   when it names another platform.
4. `/` and any path without a platform (`/students`, `/courses/…`) go through
   `components/tenant-redirect.tsx`: the remembered platform, else the first one
   the user belongs to that is not `main`, keeping the path, query and hash
   (`lib/iblai/tenant.ts#pickLandingTenant`). A user whose only platform is
   `main` sees the notice; a signed-out visitor is sent to sign in without a platform.
5. `TenantProvider` gets `requestedTenant` from the route and `currentTenant`
   from storage. When they differ it re-authenticates against the requested
   platform and hands back a fresh platform-scoped token pair (`saveUserTokens`).
   A refused platform lands on `/error/403?tenant=<key>`.
6. Switching platforms (the SDK profile dropdown) calls the SDK's
   `handleTenantSwitch`, which clears storage, broadcasts to other tabs and
   re-enters the Auth SPA with `tenant=<new>`.

## The three backends

| Slice                   | Base               | Auth                                             | Carries                                                                                                                                                             |
| ----------------------- | ------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/sis/api.ts`        | `<apiBase>/dm`     | `Authorization: Token <dm_token>`                | directory (platform users), demographics, field definitions, platform metadata, groups, invitations, watched groups, reports, credentials, announcements, analytics |
| `lib/sis/lms-api.ts`    | `<apiBase>/lms`    | `Authorization: JWT <edx_jwt_token>`, no cookies | roster, course roles, import, enrollments, progress, course home header, gradebook, course email, tasks, org roles                                                  |
| `lib/sis/studio-api.ts` | `<apiBase>/studio` | same                                             | the section list (`home/courses`), reruns (`/api/ibl/manage/course/`), course details, grading policy                                                               |

All three share `lib/sis/base-query.ts`: `credentials: "omit"` (the gateway answers
`Access-Control-Allow-Origin: *`), a stale-tab guard, a 401 → sign in again.
The instructor API reads form data, so `lms-api.ts` sends those bodies form-encoded.
The edX JWT is never re-minted by the SDK: when it expires the user signs in again.

The school's own data lives in the platform's public metadata under `sis`
(`hooks/use-sis-metadata.ts`, the type in `lib/sis/metadata.ts`). The DM's
PATCH merges dicts recursively and **replaces arrays**, so every list is written
whole; the hook re-reads the metadata before each save and refuses when the list
changed meanwhile (last writer wins otherwise).

## Roles

- A **platform admin** (`is_admin` on the platform link = `OrgInstructorRole` on
  the LMS) manages the whole school and, through ibl's implied-rights patch, is
  course staff/instructor on every course of the org — the roster, gradebook,
  teachers, import, email and Studio calls all pass on that.
- A **teacher** in this version is a platform admin. The Staff page can grant the
  LMS `org-staff` role (`POST /api/ibl/users/manage/roles/`), which the next
  version will use as the Teacher role.
- A **student** opens home, their own record (`/students/<self>`, "Details" in the
  sidebar, read-only), courses and notifications; everything else redirects home
  (`lib/sis/permissions.ts`).
- Admin writes render only in **Admin Mode** (`useIsLiveAdmin()`); Setup and the
  SDK Management surface open only then.

## The LMS probe

Which LMS and Studio capabilities a platform admin's browser session really has
is an operator question, not something the code can assume. Before trusting a
feature on a platform:

```bash
pnpm e2e:accounts   # once, creates the admin and the student test accounts in the platform iblai.env names
pnpm exec playwright test --config e2e/playwright.config.ts --project=setup-chromium   # once, saves the session and seeds the school
pnpm probe:lms --org <the platform's edX org> [--course <course-v1:…>]
```

The probe reports status + first bytes (never a token) for: the identity, the
LMS course list (403 expected: the edge blocks that path for every caller,
preflights included, which is why the app lists sections from Studio's
`home/courses`), the Studio course list, the roster (proves the implied org-instructor rights), role members,
the gradebook API (**403 = `grades.writable_gradebook` is off** → the grid is
unavailable, the embedded gradebook MFE still works), grading info, a student's
progress, `students_update_enrollment` (401/403 = session-only → Drop stays a
link-out), enrollments, the caller's roles, tasks, email schedules, Studio course
details and grading, the ibl manage view, the course home header. Writes are proven by the journeys where the platform allows them: a course
invitation (the seed, C2), a `modify_access` allow/revoke (CO8), a gradebook
override (C5), a Studio rerun (CO11); the import CSV (ST4, `ALLOW_AUTOMATED_SIGNUPS`)
and the `send_email` to "myself" (C8, `BulkEmailFlag`) skip with the learning
platform's refusal when those are off; the `course_details` PUT is proven by hand
(it rewrites the run's times).

**Results on the throwaway platform:** not yet recorded — run the probe and paste
the summary here, then write the facts to the knowledge base.

Settings the app depends on, per platform: `ALLOW_AUTOMATED_SIGNUPS` (import of
new emails), `grades.writable_gradebook` (the grid and overrides), the course's
`BulkEmailFlag` (section email), `JWT_AUTH['JWT_EXPIRATION']` (how long a session
can call the LMS). The JWT query-param middleware is not a shortcut for Drop: it
authenticates but never exempts CSRF.

One DM fact the app is built around: the users search under `/api/search/users/`
is a résumé search and returns no user rows outside department mode, so the
directory is `GET /api/core/platform/users/` (no role filter yet: the pages keep
the rows with the right flags). Everything that waits for a backend change is in
`TODOS.md`.

## Project layout

See the [Architecture](../README.md#architecture) section of the README. Shared
widgets live in `components/sis/` (page header, pagination, empty/error states,
status pill, user picker); area components under
`components/sis/<area>/`.

## Languages

The UI is in English, Spanish, French and Chinese. The active language comes from
the profile's `public_metadata.language` (applied on load by
`components/language-preference-sync.tsx`), then the shared
`openedx-language-preference` cookie, then this app's `NEXT_LOCALE` cookie, then
English; the top bar has a selector that saves the profile and writes both cookies.
Strings live in `messages/{en,es,fr,zh}.json`; `pnpm i18n:check` fails when the four
files disagree, when a value says "tenant", "pupil" or "class period", or when it
uses an ASCII apostrophe instead of `’`.

## Verify a change

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm i18n:check && pnpm test:coverage && pnpm build
```

`pnpm lint` runs with `--max-warnings 0`. `pnpm test:coverage` holds the pure
modules under `lib/` at 95 % lines and 90 % branches (`vitest.config.ts`). Then
open the page you touched on the throwaway platform and take a screenshot for the PR.
`pnpm screenshots --org <demo platform key>` regenerates the README captures in
`docs/images/` from the Playwright session.

## Release

The first release, `v0.1.0`, is published by hand: tag main and create the GitHub
Release. From then on every push to main runs `.github/workflows/release.yml`:
[release-it](https://github.com/release-it/release-it) reads the conventional
commit subjects since the last `v*` tag, bumps `package.json` (`fix` → patch,
`feat` → minor, a breaking change — `!` or `BREAKING CHANGE` — → major), prepends
the entry to `CHANGELOG.md`, commits `chore(release): v<version>`, tags
`v<version>` and publishes the GitHub Release — as `github-actions[bot]`, so the
release commit triggers no other workflow. The workflow refuses to run while no
`v*` tag exists. `pnpm release` runs the same locally (a `GITHUB_TOKEN` with
`repo` scope in the environment).
