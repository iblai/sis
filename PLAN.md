# ibl.ai/sis — hand-off plan

A Student Information System on the ibl.ai platform, planned 2026-10-07 and handed off
2026-10-08.

> **Status, 2026-10-08:** implemented in this tree the same day — the skeleton, the three
> slices, every route of the Routes table, the four locales, the unit tests and the LMS probe,
> with the six gates green. Still open: running `pnpm probe:lms` and the e2e journeys on a
> throwaway platform (needs rei's credentials and an allowed redirect origin), the hand
> proofs of the LMS writes, the README screenshots, and the `v0.1.0` tag. The text below is
> the plan as handed off; `AGENTS.md`, `README.md` and `docs/development.md` describe what
> was built.

Everything below was verified read-only against the checkouts and
live services named in the appendices; nothing was written to any other repo.

## How to use this document

1. The workspace rules apply (`~/Projects/ibl.ai/CLAUDE.md`): search the knowledge base
   before starting (`KB=~/Projects/ibl.ai/knowledge-base/logs`; there is a `sis/` entry from
   the planning session — read it, and the `crm/` sessions it names), write what you learn to
   `$KB/sis/<unix-ts>-<topic>/` with evidence, list it in this repo's `CLAUDE.local.md`.
2. rei commits; never `git commit`, never `--no-verify`. Say "platform", never "tenant", in
   anything a user sees. i18n is `en`/`es`/`fr`/`zh` or nothing. Coverage ≥ 95 % lines on
   what you change. Comments stay one line.
3. **`~/Projects/ibl.ai/sis/main` has another live session in it** (uncommitted work,
   2026-10-07). Copy from its committed `112dd02` with `git show 112dd02:<path>`; never
   edit, stash or check out anything there.
4. Work in the phases below; each ends with the six gates green and the pages opened on a
   **throwaway platform, never `main`**. The LMS probe (Verification 3) comes before any LMS
   feature is built — its results decide four features.

## Open questions for rei (ask before the phase that needs the answer)

- The `main` platform: the plan never signs in to, lands on, or defaults to `main`, **and**
  shows a "no school platform" notice when a session's platform is `main`. If rei meant only
  the sign-in default, drop the notice (Decisions, row 9).
- A throwaway platform for development and e2e, a platform admin account on it
  (`PLAYWRIGHT_USERNAME`/`PASSWORD`), and the SIS origin (`http://localhost:3000`, later
  `https://sis.iblai.app`) registered as an allowed redirect origin of that platform.
- Permission to run the LMS write probes on that platform (one invitation, one
  `modify_access`, one CSV import creating one account, one gradebook override, one email to
  "myself", one Studio rerun, one course-dates PUT).
- The LMS settings the app depends on, operator-side: `ALLOW_AUTOMATED_SIGNUPS` (ibl's site
  configs set it), the per-course `grades.writable_gradebook` waffle flag, the course
  `BulkEmailFlag`, `JWT_AUTH['JWT_EXPIRATION']`, `IBL_ENABLE_JWT_QUERY_PARAM_AUTH`.
- The two findings under "Findings to report" (a possibly open bulk-grades route; the
  `EDX_API_KEY` placeholder) — not SIS work, but someone should look.

## Context

rei wants a Student Information System shaped by openSIS-Classic's feature set (students,
staff, school setup, scheduling, attendance, grades, report cards, messaging, reports, bulk
import), running on **existing** endpoints of the DM (`~/Projects/ibl.ai/dm/v2`, the Data
Manager) and of the LMS (`~/Projects/ibl.ai/iblai-edx-pro/main`, Open edX Sumac with ibl's
plugins), on Next.js 16 + TypeScript 7 + oxlint + oxfmt, modelled on the sibling app
`~/Projects/ibl.ai/sis/main` (iblai/sis). The outcome: a multi-platform web app
(`/platform/<key>/…`, ibl.ai SSO, the SDK shell) where a platform is a school, platform
users are students and staff, edX course runs are sections, the LMS gradebook and instructor
APIs carry grades, rosters, teachers, bulk import and course email, the DM carries the
directory, student records, groups, invitations, credentials, analytics, reports and
announcements, and everything neither has a model for (terms, periods, rooms, section
assignments, GPA scale) lives in the platform's metadata — plus two lists for the README:
modifications to existing endpoints that would simplify the app, and endpoints that would
have to exist. No new endpoint is written as part of this work.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Origin                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Web app only. No `src-tauri/`, no Tauri deps/scripts/workflows, no native branches in the copied auth code; Tauri later when rei says so (the CRM's `src-tauri/` + five workflows are the recipe then).                                                                                                                                                                                                                                                                                                                                  | rei, 2026-10-07                                                                                                                                                                |
| 2   | Existing endpoints only; modifications to existing endpoints are listed, never assumed; new endpoints are bullets.                                                                                                                                                                                                                                                                                                                                                                                                                       | rei (the task; "as-is only" confirmed 2026-10-07)                                                                                                                              |
| 3   | LMS calls are allowed where the DM has nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | rei, 2026-10-07 ("LMS allowed via the SDK hooks"), then "check LMS and see whatever you can use there"                                                                         |
| 4   | The LMS and Studio are called through the gateway (`api.iblai.app/lms`, `/studio`) with the SDK's edX JWT, from the SIS's own RTK slices with `credentials: 'omit'` wherever the SDK has no hook or sends credentials (the SDK's Studio service does, and a `*` origin rejects it).                                                                                                                                                                                                                                                      | the planner, extending decision 3 — the SDK's own LMS hooks cover identity, course metadata and completion only, and its enrollment mutation is dead on ibl's LMS (Appendix E) |
| 5   | Teachers are platform admins in v1 (a platform admin = LMS org-instructor = implied course instructor on every course of the org). A v2 "Teacher" is `org-staff`, which a platform admin can grant from the app.                                                                                                                                                                                                                                                                                                                         | rei, 2026-10-07 (+ the LMS fact)                                                                                                                                               |
| 6   | Attendance in v1 is activity-derived (present = time spent in the course that day) and the UI says so; manual attendance is a bullet.                                                                                                                                                                                                                                                                                                                                                                                                    | rei, 2026-10-07                                                                                                                                                                |
| 7   | Next.js 16, TypeScript 7, oxlint, oxfmt; modelled on `crm/main`; openSIS for the feature set.                                                                                                                                                                                                                                                                                                                                                                                                                                            | rei (the task)                                                                                                                                                                 |
| 8   | Platform routing the OS/LMS way: the platform comes from `/platform/[tenantKey]`, is handed to `TenantProvider` as `requestedTenant`, and `platformKey` passes straight through to the SDK's sign-in redirect; a path without a platform goes through the LMS's `TenantRedirect` (stored platform, else sign in without `tenant=` so the Auth SPA picks the user's own). **The app never signs in to, lands on, or defaults to `main`** — `NEXT_PUBLIC_MAIN_TENANT_KEY` survives only as the SDK account sheet's `mainPlatformKey` prop. | rei, 2026-10-07 ("use OS / LMS's tenant routing, and do not directly login to main tenant")                                                                                    |
| 9   | A session whose platform is `main`, or a user with no platform, gets a "no school platform" notice with the platform switcher and sign-out, not a working app on `main`.                                                                                                                                                                                                                                                                                                                                                                 | the planner, from decision 8 — **confirm with rei**                                                                                                                            |
| 10  | Student self-service reuses the admin routes, self-scoped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | the planner                                                                                                                                                                    |
| 11  | School data = platform metadata `sis` (arrays written whole); student record = DM demographics with per-platform custom field definitions; homerooms and grade-level cohorts = DM user groups; guardians = invited platform users made watchers; section teachers = LMS course roles; terms also set the run's course dates in Studio.                                                                                                                                                                                                   | the planner, from the substrate (appendices)                                                                                                                                   |

## Repo and toolchain

`package.json` `ibl-sis`, scripts: `dev` (`NODE_OPTIONS=--no-experimental-webstorage next dev`),
`build`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`oxlint --max-warnings 0` — a fresh
repo inherits no debt), `format` / `format:check` (oxfmt), `i18n:check`, `test` /
`test:coverage` / `test:watch`, `test:e2e(:ui,:headed)`, `probe:lms` (the contract probe,
Verification 3), `screenshots`, `release`; `engines.node >=22`, `packageManager pnpm@12.x`.
Pins: `next 16.4.0` (≥16.3 runs the project `tsc` as a CLI so `typescript 7.0.2` is the real
dep — KB `crm/1790969050`; fall back to the CRM's 16.3.8 only if 16.4 breaks the CRM config
at install), `oxlint ^1.87.0`, `oxfmt ^0.72.0`, `@iblai/iblai-js 2.33.0` exact (verify
`PlatformSidebar` props and the React/Next peers at install; fall back to 2.29.0 only if
peers conflict), `next-intl ^4.14.9`, `vitest ^5` + `@vitest/coverage-v8 ^5`,
`@playwright/test ^1.63`, `@base-ui/react ^1.8`, `@reduxjs/toolkit ^2.13`, `react-redux ^9`,
`lucide-react ^1.52` (icon names checked at install), `recharts`, `sonner`, `cmdk`,
`date-fns`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss ^4`,
`@tailwindcss/postcss`, `tw-animate-css`, `tailwind-scrollbar`, `shadcn`, `cross-env`,
`dotenv`, `release-it` + `@release-it/conventional-changelog`, `@types/{node,react,react-dom}`.
**No** `@dnd-kit/*`, `livekit*`, `@tauri-apps/*`.

Config files copied from the CRM: `tsconfig.json`, `.oxlintrc.json`, `.oxfmtrc.json` (minus
the `src-tauri/**` patterns; keeps `components/ui/**`, `pnpm-lock.yaml`, `.next/**`,
`CHANGELOG.md`, `CLAUDE.local.md`), `pnpm-workspace.yaml` (`allowBuilds`,
`minimumReleaseAgeExclude: ["@iblai/*"]`, `publicHoistPattern`, `dedupePeerDependents`),
`next.config.ts` (localStorage polyfill, next-intl plugin, `images.remotePatterns` for the
DM host, standalone output off-Vercel, headers, `reactStrictMode: false`), `proxy.ts`
(nonce CSP — `frame-src` must allow `apps.learn.<domain>` for the gradebook embed),
`vitest.config.ts`, `global.d.ts`, `postcss.config.mjs`, `components.json`, `vercel.json`,
`Dockerfile` / `docker-compose.yml` (service `sis`, image `iblai-sis`), `.dockerignore` /
`.gitignore` (minus `src-tauri`), `.mcp.json`, `.env.example` (minus the Tauri scheme and
currency; plus `NEXT_PUBLIC_MFE_URL` default `https://apps.learn.<domain>`),
`iblai.env.example` (`PROJECT=existing`, `ARCHITECTURE=multi-org`, `ACCESS=members`,
`DOMAIN_FOCUS=users,organizations`), `.tool-versions`, `LICENSE`, `Makefile` (minus tauri),
`.release-it.json`, `CONTRIBUTING.md`.

`.github/`: `ci.yml` (checkout → pnpm + Node from `.tool-versions` → `install
--frozen-lockfile --ignore-scripts` → typecheck · lint · format:check · i18n:check ·
test:coverage · build with `NEXT_PUBLIC_MAIN_TENANT_KEY=main`), `security.yml` (`pnpm audit
--audit-level=critical` gate, `high` non-blocking, trufflehog, zizmor), `release.yml`
(release-it on push to main; the first run needs a `v0.1.0` tag pushed by hand — KB
`crm/1791305896-release-it`), `dependabot.yml` (npm + github-actions). All actions SHA-pinned.
**Not copied:** the five Tauri workflows.

## The skeleton copied from `crm/main` at `112dd02` (2026-10-07, "sign in to the current org")

The CRM checkout moved on 2026-10-07 from v1.0.6 (`a02bdfe`) to `112dd02`, and its working
tree holds uncommitted work from another live session (`providers/iblai-providers.tsx`,
`lib/sis/permissions.ts`, `lib/iblai/auth-utils.ts`, messages, docs). The SIS copies from the
**committed** `112dd02` (`git show 112dd02:<path>`), never from that working tree, and never
writes into `crm/main`. What `112dd02` changed that matters here: `redirectToAuthSpa` passes
`platformKey` through instead of defaulting it to `resolveDefaultTenant()` (= `main`), the
error page became a `NoticeCard`, `e2e/journeys/responsive.journey.spec.ts` + a Pixel/iPhone
Playwright project, the phone-layout fixes (dnd sensors, `pointer-coarse:`, dialog `max-h`,
the iOS input-zoom media query), the `/join` registration route and `OrganizationGate`
(CRM-only, not copied).

**Copy with a rename (A).** `lib/iblai/{config,tenant,auth-utils,auth-redirect,sso-redirect,
storage-service}.ts`, `lib/locale-cookie.ts`, `lib/utils.ts`, `providers/iblai-providers.tsx`,
`store/iblai-store.ts`, `hooks/{use-session,use-members,use-debounced}.ts`,
`i18n/{config,request}.ts`, `scripts/validate-i18n.mjs`, the `baseQuery` / `cleanParams` /
`listTags` / `errorMessage` / `errorStatus` slice of `lib/sis/api.ts` (lines 1-16, 61-143,
702-715 at `112dd02`), `app/{layout,page,manifest}.tsx`, `app/platform/[tenantKey]/{layout.tsx,
admin/users/page.tsx,notifications/[[...id]]/page.tsx}`, `app/{sso-login-complete,
error/[code]}/page.tsx`, `app/api/auth-redirect/route.ts`, `app/{globals,iblai-styles}.css`,
`public/*`, the shell components (`app-sidebar`, `top-bar`, `user-menu`, `admin-mode`,
`admin-mode-switch`, `language-menu`, `breadcrumbs`, the `command-palette` shell,
`language-preference-sync`, `loading-screen`, `radix-pointer-events-guard`,
`web-containers-locale-provider`, `notice-card`), `e2e/{playwright.config.ts,auth.setup.ts,
.env.development.example,COVERAGE.md,coverage.json,journeys/{auth,shell}.journey.spec.ts}`,
`docs/development.md`, the eight skeleton tests (`auth-redirect, config, locale,
next-config, sso-redirect, tenant-mismatch, tenant-name, tenant`).

**Reuse as is (B).** `components/ui/*` (27 shadcn/Base UI files), `nav-row`, `page-header`,
`pagination-bar`, `empty-state`, `load-error`, `confirm-dialog`, `simple-select`, `stat-card`,
`inline-field`, `info-tip`, `entity-avatar` (`kind` → `student | staff | course`),
`dashboard/panel`, `dashboard/onboarding-card` (→ "Set up your school"),
`dashboard/won-lost-chart` (the recharts pattern), `owner-select` (→ `StaffSelect`),
`lib/sis/errors.ts`, the generic half of `lib/sis/format.ts`. Generic types lifted from
`lib/sis/types.ts`: `Paginated`, `DateFilter`, `ListParams`, the api error type,
`PlatformMember`. From `~/Projects/ibl.ai/lms/main` (the Agentic LMS): the JWT postMessage
handshake of `components/edx-iframe/edx-iframe.tsx:160-200` for the gradebook embed, the
`credentials: 'omit'` Studio base query shape of `lib/utils.ts:49-92`, and
`components/tenant-redirect.tsx`.

**Not copied (C).** Persons/organizations/deals/pipelines/activities/tags/favorites/saved
views, the CRM dashboard, `crm.journey.spec.ts`, the `activities`/`permissions` tests, the CRM
message namespaces, `mobile-sso-login/`, `src-tauri/`, `docs/platform-deployment.md`,
`docs/DOWNLOADS.md`, `/join`, `OrganizationGate`.

**Rename strings** (locations at `112dd02`): `ibl.ai SIS` / `ibl.ai/sis` → `ibl.ai SIS` /
`ibl.ai/sis` (`app/layout.tsx`, `manifest.ts`, `lib/iblai/config.ts` `appName`),
`sis.ibl.ai` → `sis.ibl.ai` (`docs/development.md`), `ibl-sis` → `ibl-sis` (`package.json`,
`docker-compose.yml`), `currentSPA="sis"` → `"sis"` (`user-menu.tsx`, `app-sidebar.tsx`,
`admin/users/page.tsx`), the logo suffix `/crm` → `/sis` (`app-sidebar.tsx`), `sisApi` /
`SIS_TAG_TYPES` / `SisApiError` → `sisApi` / `SIS_TAG_TYPES` / `SisApiError` (`lib/sis/api.ts`,
`store/iblai-store.ts`), `${dmUrl}/api/crm` → `${dmUrl}` (`api.ts` `fetchBaseQuery`),
`useCanManageCrm` / `MANAGE_CRM_FLAG` → `isLiveAdmin` (`admin-mode.tsx`,
`[tenantKey]/layout.tsx`, `app-sidebar.tsx`), the `config.test.ts` app-name assertions. The
SDK's standard storage keys stay (`edx_jwt_token` among them); there is no `crm` message
namespace.

**Web-only trims**: `isTauri` / `isTauriMobile` and the `isNativeApp` / `scheme` args of
`redirectToAuthSpa` (`auth-utils.ts`), `NEXT_PUBLIC_TAURI_CUSTOM_SCHEME` and
`tauriCustomScheme()` (`config.ts`), `defaultCurrency()` (`config.ts`), the
`^/mobile-sso-login` and dead `^/version` entries of `PUBLIC_ROUTES`
(`iblai-providers.tsx`), the stale "lives OUTSIDE the providers" comment
(`sso-login-complete/page.tsx`). **Additions to `config.ts`**: `studioUrl()` =
`${apiBase}/studio` (distributed: `https://studio.learn.${domain}`), `mfeUrl()` =
`NEXT_PUBLIC_MFE_URL` or `https://apps.learn.${domain}`; `initializeDataLayer` gets
`studioUrl` as its 6th argument (the SDK's default `https://studio.iblai.app` does not
respond).

**Defects fixed on the way in**: "Go to Settings" offered to every user in the palette
(`command-palette.tsx`, the Settings item) → gated on `isLiveAdmin`; `docs/development.md`
names an `OrgSwitcher` that does not exist → dropped. (The Tauri deep-link and popup-URL
defects go with Tauri; port `os/main@4f4b145b src-tauri/src/lib.rs:656-685` then.)

## Platform routing and sign-in (the OS/LMS pattern, never `main`)

How the three apps do it today (verified): the OS passes `platformKey` straight through
(`os/main lib/utils.ts:143-177`) and the SDK resolves `tenant=` as `platformKey ??
getPlatformKey(redirectPath) ?? getPlatformKey(pathname) ?? rememberedTenant` (the
`ibl_current_tenant` cookie), sending **no `tenant=`** when none resolves (`web-utils
utils/auth.ts:543-556`); the Auth SPA then chooses `?tenant=` → its own `selected_tenant`
→ its default (`apps/auth/app/(auth)/login/complete/page.tsx:222-246`; the KB records the
first non-`main` platform), and sends a user with zero platforms to `/error/409`. The OS's
`TenantProvider` takes `currentTenant` from the stored `tenant` and `requestedTenant` from
the route (`providers/index.tsx:593-597`); the LMS does the same
(`lms/main providers/index.tsx:48,166-169`), reads the route with `useTenantParam()`
(`hooks/use-tenant-param.ts`), and routes every path without a platform through
`TenantRedirect` (`components/tenant-redirect.tsx`): stored platform → `router.replace(
'/platform/<t>' + pathname + search + hash)`, none → `redirectToAuthSpa()` with no
platform. Its error page reads `?tenant=` (`app/error/[code]/page.tsx`,
`getErrorPageUrl(code, tenant)` in `utils/helpers.ts`). The CRM at `112dd02` passes
`platformKey` through but its `/` still falls back to `main` (`lib/iblai/tenant.ts`
`resolveDefaultTenant`) and its providers seed `storedTenant` with it.

The SIS:

- `lib/iblai/auth-utils.ts`: the `112dd02` wrapper (passthrough), minus the Tauri args;
  `handleTenantSwitch` as the CRM's minus `SWITCH_FROM`.
- `lib/iblai/tenant.ts`: drop `resolveDefaultTenant`; add `readStoredTenantKey()` (the
  `tenant` key, then `current_tenant.key`) and `pickLandingTenant(stored, tenants, main)` →
  the stored platform unless it is `main`, else the first platform the user belongs to that
  is not `main`, else `null`. Pure, tested, never returns `main`.
- `app/page.tsx` and a catch-all `app/[...legacy]/page.tsx` for `/students`, `/courses`,
  … without a platform: the LMS's `TenantRedirect` — `pickLandingTenant()` → `/platform/<t>`
  - the current path, search and hash; `null` with a session → the notice page; no session →
    `redirectToAuthSpa()` with no platform (AuthProvider does the same first).
- `providers/iblai-providers.tsx`: `storedTenant = readStoredTenantKey()` (no fallback),
  `requestedTenant = routeTenant || storedTenant`, `currentTenant={storedTenant}`;
  `onAuthFailure` → `router.push(getErrorPageUrl(403, requestedTenant))` (the LMS shape;
  the CRM's "remembered `main` → re-auth once without a platform" guard kept as is, since a
  sibling app's cookie can still remember `main`); `onTenantMismatch` → `/` (which the
  redirect resolves); no `OrganizationGate`, no `/join`, no registration.
- `app/platform/[tenantKey]/layout.tsx`: when `tenantKey === config.mainTenantKey()` render
  the notice page (`NoticeCard` from `112dd02`: "ibl.ai/sis works inside a school platform",
  the SDK platform switcher, sign out) instead of the shell — loud, not a working app on the
  community platform (decision 9, to confirm).
- `app/error/[code]/page.tsx`: the `112dd02` `NoticeCard` version, reading `?tenant=` to
  name the refused platform; 403 copy says "You are not a member of <platform>".
- `app/sso-login-complete/page.tsx`: the CRM's hardened `resolveSsoRedirectPath` kept (a
  stored path naming a platform other than the one just authenticated resets to `/`).
- `useSession()`: `tenantKey` from the route as the CRM does; `currentTenant.org` feeds the
  LMS course filter.
- No `tenant=` ever carries `main`: `config.mainTenantKey()` is read only by
  `PlatformAccountSheet mainPlatformKey`, the `main` guard above and `pickLandingTenant`.

## Data layer (`lib/sis/`)

Three RTK Query slices, one per backend, all registered in `store/iblai-store.ts` beside the
SDK's `coreApiSlice`; every endpoint takes the platform (DM `platform_key`, LMS/Studio the
course key or the platform's edX `org` from `useSession().currentTenant.org`) as an argument,
never from a module default. The CRM's `tenantMismatch` pre-flight (`lib/sis/api.ts`
`baseQuery`) stays on all three.

| Slice                         | Base                                                 | Auth header           | `credentials` | Errors                                                                                    |
| ----------------------------- | ---------------------------------------------------- | --------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `sisApi` (`api.ts`)           | `config.dmUrl()` — endpoints carry `/api/<family>/…` | `Token <dm_token>`    | omit          | DRF `detail` → AXD `{error:true, message}` → `error` → `message` → first field error      |
| `lmsApi` (`lms-api.ts`)       | `config.lmsUrl()` (= `${apiBase}/lms`)               | `JWT <edx_jwt_token>` | omit          | DRF `detail` / `developer_message` → instructor API `{error}` / `{message}` → form errors |
| `studioApi` (`studio-api.ts`) | `config.studioUrl()` (= `${apiBase}/studio`)         | `JWT <edx_jwt_token>` | omit          | `developer_message` → `detail` → `error`                                                  |

One `errorMessage(err, fallback)` covers all three (`lib/sis/errors.ts`, tested). A 401 on any
slice → `redirectToAuthSpa(…, true)` (the SDK never re-mints the edX JWT; an expired JWT means
sign in again — production `JWT_EXPIRATION` is an open item). AXD GETs are server-cached
3600 s, so after a write the toast says "Saved — analytics refresh within an hour" and the
page shows the write's own result; LMS data (rosters, gradebook, progress) is live.
`keepUnusedDataFor: 60`; every list provides `{type, id: "LIST"}` (the RTK bare-tag trap, KB
`crm/1791220468`).

**DM — SDK hooks used** (`@iblai/iblai-js/data-layer`): `usePlatformUsersQuery`,
`useUpdateUserStatusMutation` (`POST /api/core/users/platforms/`, deactivate = `active:false`),
`useCreateCatalogInvitationCourseMutation` + `…Bulk` + `useGetCatalogInvitationsCourseQuery`
(enroll an existing user = course invitation, enrolls on edX on accept; pending =
`active:true`), `useInviteUserMutation` + `usePlatformInvitationsQuery` + the SDK
`InviteUserDialog` / `InvitedUsersDialog`, `usePlatformUserGroupsQuery` +
`useCreatePlatformUserGroupMutation` + update/delete (`users_to_set` replaces membership),
the watched-groups hooks (guardians), `useGetPerLearnerActivityQuery`,
`useCreateReportMutation` / `useGetReportDetailQuery` (reports; poll `status.state ===
'completed'`, download `status.url?format=csv`), `useGetCredentialsListQuery` /
`useCreateCredentialAssertionMutation` / `useGetUserCredentialsQuery`,
`useGetNotificationContextQuery` / `useCreateNotificationPreviewMutation` /
`useSendNotificationMutation` (platform announcements), `useGetTenantMetadataQuery` /
`useUpdateTenantMetadataMutation` (platform metadata; PUT with the DM's recursive merge).

**DM — own endpoints** (`sisApi`): `searchUsers` (`GET /api/search/users/orgs/{key}/users/
{callerUsername}/?query&role[]&status[]&limit&offset`; roles `Student | Instructor | Admin`,
status `active | inactive`; rows `id, username, email, first_name, last_name, full_name,
profile_image, role, status, joined_date, last_login`) — the directory, the staff list, ⌘K;
`getUserLink` (`GET /api/core/users/platforms/?username=`); `getDemographics` /
`putDemographics` (`/api/core/platforms/{key}/{username}/demographics/`; PUT resets omitted
base fields → read-merge-write); `listFields` / `createField` / `patchField` / `deleteField` /
`exportFields` / `importFields` (`…/demographics/fields/[{slug}/]`, `export/?format=csv`,
`import/`); `patchUserPlatformMetadata` (`PATCH /api/core/users/platform-metadata/?platform_key=&username=`);
`linkGroupMember` / `unlinkGroupMember` / `bulkLinkGroupMembers`
(`/api/core/user_groups/link[/bulk]?platform_key=`); `myEnrollments` (`GET
/api/catalog/enrollment/courses/search/?username=<self>&platform_key=`); analytics —
`overview` (`/api/overview/orgs/{key}/{registered-users,active-users,courses/completions,
average-grade,most-active-courses}`, `/api/platform/orgs/{key}/{users/count,users/active/count,
courses/count,progress/completion-rate}`), `coursesGrades` (`/api/platform/orgs/{key}/courses/grades`),
`courseTimeUsers` (`/api/engagement/orgs/{key}/courses/{course_id}/time/users?start_date&end_date&page&length`),
`learnerTimeOverTime` (`…/time/users/{username}/over-time?start_date&end_date` →
`{data:{"YYYY-MM-DD": secs}, total}`), `learnerGradesPerCourse`, `courseGradingSummary` (class
averages over time — secondary to the LMS gradebook); `listReports` (`GET
/api/reports/platforms/{key}/` — the SDK hook hard-codes `/dm`); `revokeAssertion` (`PUT
/api/credentials/orgs/{key}/users/{username}/assertions/{entityId}`). Never
`performance/…/grading/per-learner` (10-row cap).

**LMS — `lmsApi`** (all DRF, JWT via the gateway; a platform admin passes every permission
below through the org-instructor implied rights, Appendix E; `C` = `course-v1:…` key):

| Endpoint                                                                                                              | Method · body                                                                                                                                          | Permission                                                                                    | Use                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/courses/v1/courses/?org={org}&username={self}&page_size=100`                                                    | GET                                                                                                                                                    | VAC; `username` = self                                                                        | the section list (id, name, org, number, run, start/end, enrollment window, pacing)                                                                                                                       |
| `/courses/{C}/instructor/api/get_students_features`                                                                   | POST JSON `{}`                                                                                                                                         | `CAN_RESEARCH` (course staff, ibl-widened)                                                    | roster: `students[{id, username, name, email, enrollment_mode, last_login, date_joined, cohort?, …}]`; `/csv` starts an async report                                                                      |
| `/courses/{C}/instructor/api/list_course_role_members`                                                                | POST `{rolename}` (`staff`, `instructor`, `beta`, `data_researcher`)                                                                                   | course instructor                                                                             | the section's teachers                                                                                                                                                                                    |
| `/courses/{C}/instructor/api/modify_access`                                                                           | POST `{unique_student_identifier, rolename, action: allow\|revoke}`                                                                                    | course instructor; "allow" also enrolls; cannot revoke own instructor                         | assign / remove a teacher on a section                                                                                                                                                                    |
| `/courses/{C}/instructor/api/register_and_enroll_students`                                                            | POST multipart `students_list` CSV (`email,username,name,country[,cohort,course_mode]`)                                                                | `CAN_ENROLL` + `ALLOW_AUTOMATED_SIGNUPS` (ibl's site configs set it True — verify)            | **bulk import**: existing emails are enrolled, new ones get an account + enrollment                                                                                                                       |
| `/api/enrollment/v1/enrollment?user={username}`                                                                       | GET                                                                                                                                                    | course staff sees the user's enrollments in courses they staff (all org courses for an admin) | a student's sections                                                                                                                                                                                      |
| `/api/course_home/v1/progress/{C}/{student_id}`                                                                       | GET                                                                                                                                                    | course staff (`student_id` numeric)                                                           | per student per section: `course_grade{percent, letter_grade, is_passing}`, `section_scores`, `grading_policy`, `completion_summary`, `certificate_data`                                                  |
| `/api/course_home/v1/dates/{C}`                                                                                       | GET                                                                                                                                                    | enrolled or course staff                                                                      | due dates of a section                                                                                                                                                                                    |
| `/api/grades/v1/gradebook/{C}/?cursor&page_size=50&username&user_contains&course_grade_min/max&assignment…`           | GET                                                                                                                                                    | course author + the per-course waffle `grades.writable_gradebook` (else 403 — verify)         | the gradebook grid: `results[{user_id, username, percent, passed, letter_grade, section_breakdown[{label, category, percent, score_earned, score_possible, attempted, module_id}]}]`, `total_users_count` |
| `/api/grades/v1/gradebook/{C}/bulk-update`                                                                            | POST `[{user_id, usage_id, grade{earned_graded_override, possible_graded_override, earned_all_override, possible_all_override, comment}}]` → 202 / 422 | same; 403 when grades are frozen                                                              | **grade entry** (subsection overrides with a comment)                                                                                                                                                     |
| `/api/grades/v1/gradebook/{C}/grading-info`                                                                           | GET                                                                                                                                                    | course author                                                                                 | `grade_cutoffs`, `assignment_types`, `subsections`, `grades_frozen`                                                                                                                                       |
| `/api/grades/v1/subsection/{usage_key}/?user_id=`                                                                     | GET                                                                                                                                                    | course author                                                                                 | an override's history                                                                                                                                                                                     |
| `/api/grades/v1/policy/courses/{C}/`                                                                                  | GET                                                                                                                                                    | course staff                                                                                  | the policy (read)                                                                                                                                                                                         |
| `/courses/{C}/instructor/api/send_email`                                                                              | POST **form-encoded** `send_to='["learners","staff","cohort:x"]', subject, message[, schedule]`                                                        | `EMAIL` + the course's `BulkEmailFlag` (verify)                                               | section email; `/api/instructor_task/v1/schedules/{C}/bulk_email/` lists/edits scheduled sends                                                                                                            |
| `/courses/{C}/instructor/api/change_due_date` · `reset_due_date` · `show_student_extensions`                          | POST `{url, student, due_datetime, reason}`                                                                                                            | course staff                                                                                  | per-learner extensions                                                                                                                                                                                    |
| `/courses/{C}/instructor/api/start_certificate_generation`                                                            | POST                                                                                                                                                   | course instructor                                                                             | generate certificates; `certificate_data` in progress shows the result                                                                                                                                    |
| `/courses/{C}/instructor/api/get_grading_config` · `list_instructor_tasks` · `/api/instructor/v1/{tasks,reports}/{C}` | POST / GET                                                                                                                                             | course staff                                                                                  | task status, report downloads                                                                                                                                                                             |
| `/api/ibl/users/manage/roles/`                                                                                        | GET `?username=` · POST `{username, role: org-staff\|org-instructor, org, active}`                                                                     | GS or self · org admin for org roles                                                          | read a user's roles; make a teacher (`org-staff`) or an admin (`org-instructor`)                                                                                                                          |
| `/api/user/v1/accounts?username=a,b`                                                                                  | GET                                                                                                                                                    | any authenticated user (public fields)                                                        | names and profile images in batches                                                                                                                                                                       |
| `/api/user/v1/me`                                                                                                     | GET                                                                                                                                                    | self                                                                                          | the probe's identity check                                                                                                                                                                                |

**Studio — `studioApi`** (DRF, JWT via the gateway):

| Endpoint                                     | Method · body                                                                                           | Permission                                | Use                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/api/ibl/manage/course/`                    | POST `{org, number, run, display_name, start[, source_course_key]}`                                     | GS or `OrgInstructorRole(org)`            | **New section** = rerun a course for a term (`run` = the term id); verify a platform admin passes the upstream creator check |
| `/api/ibl/manage/course/?course_key=`        | GET                                                                                                     | org staff/instructor or course instructor | `{course_key, org, number, run, display_name, url}`                                                                          |
| `/api/contentstore/v1/course_details/{C}`    | GET / PUT `{start_date, end_date, enrollment_start, enrollment_end, self_paced, …}`                     | Studio read access (gates PUT on Sumac)   | the term's dates on the run                                                                                                  |
| `/api/contentstore/v1/course_grading/{C}`    | GET / POST `{graders[{type, min_count, drop_count, short_label, weight}], grade_cutoffs, grace_period}` | read access                               | the section's grading policy and letter cutoffs                                                                              |
| `/api/contentstore/v1/course_team/{C}`       | GET                                                                                                     | course staff                              | team read (writes are session-only → `modify_access` on the LMS instead)                                                     |
| `/api/contentstore/v0/advanced_settings/{C}` | GET / PATCH                                                                                             | read / write access                       | optional                                                                                                                     |

**The gradebook embed**: `${mfeUrl}/gradebook/{C}` in an iframe with the JWT postMessage
handshake (`auth.jwt.ready` → `auth.jwt.token`; `lms/main/components/edx-iframe/
edx-iframe.tsx:160-200`); no framing restriction on the MFE host. The courseware/instructor
SSO iframe needs the SIS origin whitelisted on the LMS (`CsrfExemptDomain`) → not in v1;
"Open instructor dashboard" is a plain link-out.

**`metadata.ts`** — the platform-metadata `sis` block (read from
`useGetTenantMetadataQuery(key).metadata.sis`, parsed by `parseSisMetadata(unknown)`:
`typeof` guards and array filters, missing keys → empty defaults, unknown `version` → throw;
one test with a garbage blob and a v1 blob; no zod):

```ts
type SisMetadata = {
  version: 1;
  school: { address?: string; phone?: string; timezone?: string };
  years: { id: string; name: string; start: string; end: string }[]; // ISO dates
  terms: { id: string; yearId: string; name: string; start: string; end: string }[];
  gradeLevels: { id: string; name: string; order: number; groupId?: number }[]; // cohort user group
  periods: { id: string; name: string; startTime: string; endTime: string }[]; // "08:00"
  rooms: { id: string; name: string; capacity?: number }[];
  subjects: { id: string; name: string }[];
  sections: {
    // one per course run; teachers live on the LMS
    courseId: string;
    termId?: string;
    subjectId?: string;
    gradeLevelId?: string;
    roomId?: string;
    periodId?: string;
    days?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
    credits?: number;
    seats?: number;
  }[];
  gpaScale: Record<string, number>; // { A: 4, B: 3, C: 2, D: 1, F: 0 }
};
```

Writes go through `useUpdateTenantMetadataMutation` with `{ metadata: { sis: { <list>:
wholeArray } } }`: the DM's merge replaces arrays and deep-merges dicts, so every list is an
**array written whole** (a map could never drop a key); each Setup tab and the section
dialog refetch `TenantMetadata` before saving and refuse with a conflict toast when the
fetched array differs from the one the form started from.
`// ponytail: last-writer-wins per array, compare-on-save only; move sections to a DM model when two admins edit setup at once.`

**Demographics seed** (Setup → Student fields, idempotent by slug): `student_id` text
required · `grade_level` select required (choices = `gradeLevels[].name`) ·
`enrollment_status` select required (`active, withdrawn, graduated, transferred`) ·
`homeroom` text · `guardian_name`, `guardian_relationship`, `guardian_phone`,
`guardian_email` text · `emergency_contact_name`, `emergency_contact_phone` text ·
`medical_notes` text. Base fields used: `date_of_birth`, `gender`, `primary_language`.
Nothing is hidden from the student (`IsSelfAccess` lets them read and PUT their own record)
— the Record tab says so on those fields; field-level ACL is a bullet. Changing
`grade_level` also moves the student between the grade-level cohort groups
(`gradeLevels[].groupId`, two `user_groups/link` calls).

**Derived numbers** (`lib/sis/grades.ts`, `attendance.ts`; one test each): `letterGrade(
percent, cutoffs)` — only for class rollups; a student's letter comes from the LMS
(`course_grade.letter_grade`). `gpa(sections, grades, scale)` — Σ(points × credits) / Σ
credits over a term's sections with a letter and credits, the rest `excluded`.
`attendanceDays(overTime, section, term)` — present = seconds > 0 on a day; absent = a term
school day on the section's `days` with none; UTC buckets. The UI labels what these cannot
know (excused absences, in-person time, weighted courses, transfer credit).
Attendance call budget: a student's month = one `learnerTimeOverTime` per section; a section
week = seven one-day `courseTimeUsers` calls; the day view = one per section — after the
positive control that `courseTimeUsers` honours `start_date`/`end_date` (the AXD drops
undeclared params silently).

**Permission matrix** (UI gate = `isAdmin ? adminMode : false` for admin surfaces, the CRM's
`AdminGate`; self pages = `params.username === session.username || isAdmin`; a 403 from any
backend on an admin page is shown, never swallowed):

| Page / action                                                                                                                                                                                         | Admin, Admin mode | Admin, User mode | Student (self)                | Backing perm                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------- | ----------------------------- | ------------------------------------------------------------------- |
| Dashboard                                                                                                                                                                                             | ✓                 | ✓ read           | own progress                  | AXD PA / A\|S                                                       |
| Students, Staff, Groups, Courses lists                                                                                                                                                                | ✓                 | ✓ read           | — (Courses = own enrollments) | PA-RO, users search, LMS VAC                                        |
| Student record read                                                                                                                                                                                   | ✓                 | ✓                | own                           | `IsSelfAccess \| PAoU`                                              |
| Roster, gradebook read, progress of a student, teachers of a section                                                                                                                                  | ✓                 | ✓ read           | own progress                  | LMS course staff / instructor (implied)                             |
| Record write, field defs, invitations, import, enroll, teachers, grade entry, grading policy, section dates, groups write, guardians, email, announcements, credentials, certificates, reports, Setup | ✓                 | hidden           | —                             | PA / LMS course instructor / Studio author / `CredentialPermission` |
| Credentials of a student                                                                                                                                                                              | ✓                 | ✓                | own                           | `CredentialPermission`                                              |
| Inbox, profile                                                                                                                                                                                        | ✓                 | ✓                | ✓                             | self                                                                |
| `/admin/users` (SDK Management)                                                                                                                                                                       | ✓                 | hidden           | —                             | org admin                                                           |

## Routes (`app/platform/[tenantKey]/`)

Student self-service uses the **same routes, self-scoped**: the CRM's `AdminGate`
(`app/platform/[tenantKey]/layout.tsx`) grows a third branch — a non-admin may open home,
`students/<self>`, `courses/*` (read-only, own rows) and `notifications`; everything else
redirects home.

| Route                          | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Who                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `page.tsx`                     | Admin: dashboard (registered/active learners, enrollments over time, completions, average grade, most active courses, learners table; "Set up your school" until `sis` exists). Student: my sections (name, term, teachers, grade, progress) and my credentials                                                                                                                                                                                                                                                                                        | both                                                                |
| `students/`                    | Directory (users search `role=Student`): name, email, status, joined, last login; pending-invitations strip; Invite student (SDK dialog); **Import CSV** (`register_and_enroll_students` into a chosen section)                                                                                                                                                                                                                                                                                                                                        | admin                                                               |
| `students/[username]/`         | Tabs Overview (header: grade level, groups, guardians; last access) · Record (demographics + custom fields) · Enrollment (sections from the LMS with grade/progress; Enroll = course invitation; Drop = see Verification) · Grades (per section: %, letter, passed, section scores; term filter; GPA for the term) · Attendance (month grid) · Credentials (DM assertions + LMS certificates; issue, revoke) · Guardians                                                                                                                               | admin; self = Overview, Enrollment, Grades, Attendance, Credentials |
| `staff/` · `staff/[username]/` | Users search `role=Instructor,Admin`; LMS roles (`org-staff`/`org-instructor`) with Make teacher / Make admin; sections taught (role members across the loaded sections); Invite staff                                                                                                                                                                                                                                                                                                                                                                 | admin                                                               |
| `courses/`                     | Sections: LMS course list joined with `sis.sections` and role members (term, subject, grade level, teachers, room, period, credits, enrolled/seats, dates, pacing); **New section** = pick a source run + term → Studio rerun + dates + metadata; filters client-side over the bounded run list (the one stated exception to the server-side rule)                                                                                                                                                                                                     | both (student: own enrollments)                                     |
| `courses/[courseId]/`          | Tabs Roster (`get_students_features`: name, email, mode, last login; Enroll existing via user-search picker → course invitation; Import CSV; bulk from a group; Email the roster) · Gradebook (`gradebook` grid with cursor pages and filters; cell editing → `bulk-update` with comment; override history; "Open in Gradebook" MFE embed; grades-frozen notice) · Attendance (week grid) · Settings (term/dates → Studio `course_details`; grading policy → `course_grading`; teachers → `modify_access`; room/period/credits/seats → `sis.sections`) | admin; student: own row only, Roster hidden                         |
| `groups/` · `groups/[id]/`     | User groups as homerooms/cohorts: members (search picker, add/remove/bulk), announce                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | admin                                                               |
| `attendance/`                  | Day view: sections × students for one date, present/absent counts, "activity-based" badge                                                                                                                                                                                                                                                                                                                                                                                                                                                              | admin                                                               |
| `grades/`                      | Per-section summary (LMS `grading-info` + AXD averages); term report = every section's progress for a grade-level group (GPA column); `course-grade-report` runner for CSV                                                                                                                                                                                                                                                                                                                                                                             | admin                                                               |
| `credentials/`                 | DM credentials: issue to a student or group, revoke, verification link; "Generate certificates" per section (`start_certificate_generation`)                                                                                                                                                                                                                                                                                                                                                                                                           | admin                                                               |
| `reports/`                     | AXD reports: list, run, poll, download CSV; LMS instructor reports per section (`list_instructor_tasks`, `/api/instructor/v1/reports/{C}`)                                                                                                                                                                                                                                                                                                                                                                                                             | admin                                                               |
| `messages/`                    | Section email (`send_email`: learners / staff; schedule) and platform announcements (DM builder: platform, group, usernames; preview, send)                                                                                                                                                                                                                                                                                                                                                                                                            | admin                                                               |
| `notifications/[[...id]]/`     | SDK `NotificationDisplay` (unchanged)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | both                                                                |
| `setup/`                       | Tabs School · Year & terms · Grade levels (+ cohort group per level) · Periods · Rooms · Subjects · Student fields (definitions with CSV export/import); Seed defaults                                                                                                                                                                                                                                                                                                                                                                                 | admin, Admin mode                                                   |
| `admin/users/`                 | SDK `Account` → Management (unchanged)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | admin, Admin mode                                                   |

Kept unchanged from the CRM: `app/layout.tsx`, `sso-login-complete/`, `api/auth-redirect/`,
`manifest.ts`. Replaced per the routing section: `app/page.tsx` (→ `TenantRedirect`, plus
the `[...legacy]` catch-all), `error/[code]/` (→ the `112dd02` `NoticeCard` reading
`?tenant=`). Dropped: `mobile-sso-login/`, `/join`.

## Shell and components

Sidebar rows (the `rows` shape of `components/sis/app-sidebar.tsx`, one `custom` section, no
Favorites): home (Home, exact) · students (Users) · staff (UserCog) · courses (BookOpen) ·
groups (UsersRound) · attendance (CalendarCheck2) · grades (GraduationCap) · credentials
(Award) · reports (FileChartColumn) · messages (Megaphone); a student sees home and courses.
After a divider, only when `isLiveAdmin`: setup (Settings). ⌘K as `primaryAction`, logo
suffix `/sis`, the `footer` / `onFooterAction` / `PlatformAccountSheet` (`currentSpa="sis"`)
/ `InviteUserDialog` block verbatim. Breadcrumb `SECTION_KEYS` (`breadcrumbs.tsx`) = the row
ids → `nav.*`. Command palette groups (`command-palette.tsx` rewritten): Students and Staff
from `searchUsers`, Courses from the loaded section list, Create (Invite student/staff,
Import, New section, New group, New email), Go to (the rows; Setup only when `isLiveAdmin`).

Page frame: `PageHeader` then `<div className="flex-1 overflow-auto">` (the CRM's AGENTS.md
rule 8); loading = SDK `Spinner` via `loading-screen`, empty = `empty-state`, errors =
`load-error`, lists page with `pagination-bar` (cursor variant for the gradebook),
confirmations with `confirm-dialog`. New components in `components/sis/<area>/`:
`students/{students-table,invite-student-dialog,import-dialog,student-header,record-form,
enroll-dialog,grades-table,attendance-grid,issue-dialog,guardian-access}`,
`staff/{staff-table,role-switch}`, `courses/{sections-table,section-dialog,roster-table,
enroll-picker,gradebook-grid,grade-cell-editor,gradebook-embed,section-settings,course-card}`,
`groups/{group-dialog,member-picker}`, `reports/{report-card,run-dialog}`,
`messages/{section-email-form,announcement-form,audience-picker}`,
`setup/{list-editor,field-definitions-tab,setup-nudge}` — short client components with
one-line prop docs like their neighbours. UI recedes: match the SDK's and shadcn's visual
language, no accent colours, no bespoke spinners.

## i18n

Namespaces (≈ keys): common 50 · shell 6 · nav 12 · breadcrumbs 4 · admin 1 · errors 10 ·
palette 14 · fields 20 · dashboard 40 · students 80 · record 25 · enrollment 25 · staff 30 ·
courses 80 · gradebook 40 · groups 30 · attendance 30 · grades 45 · credentials 40 ·
reports 35 · messages 45 · setup 80 · guardians 15 · language 2 · notifications 2 (≈ 780),
in all four of `messages/{en,es,fr,zh}.json`. Copy the CRM skeleton namespaces, rewording
`admin.users.description` and `notifications.description`, dropping
`common.errorProtectedByDeals`. `scripts/validate-i18n.mjs` (the vocabulary block): keep
every `tenant` rule, drop the `compan(y|ies)` / `empresa` / `entreprise` / `公司` rules, add
`pupil` and `class period`; ASCII `'` stays forbidden (typographic `’` and `…`); keys typed
from `messages/en.json` through `global.d.ts`.

## Tests

Unit (vitest, `__tests__/`): the eight skeleton tests kept (`tenant.test.ts` loses the
`resolveDefaultTenant` cases and gains `pickLandingTenant`: stored non-main wins, stored
`main` is skipped, a user whose only platform is `main` gets `null`; `auth-redirect.test.ts`
gains "the login URL carries no `tenant=` when neither the path nor the session names one,
and never `main`"); new pure modules with one test each — `lib/sis/metadata.ts`,
`lib/sis/grades.ts` (`letterGrade`, `gpa`, term aggregation), `lib/sis/attendance.ts`,
`lib/sis/format.ts`, `lib/sis/sections.ts` (join LMS runs with `sis.sections` and role
members; filters), `lib/sis/errors.ts` (the three error shapes), `lib/sis/permissions.ts`,
`lib/sis/csv.ts` (the import CSV builder and the roster CSV export). `vitest.config.ts`
`include` = those + `lib/iblai/tenant.ts`, `lib/locale-cookie.ts`, `i18n/config.ts`;
thresholds **95 % lines / 90 % branches**.

E2E (Playwright against the real Auth SPA; `e2e/auth.setup.ts` unchanged; ids in
`e2e/coverage.json` + `COVERAGE.md`; the throwaway platform with the platform admin's
`PLAYWRIGHT_USERNAME`/`PASSWORD` in `e2e/.env.development`): A1 a fresh profile is sent to
the Auth SPA with **no `tenant=`** and lands on `/platform/<the platform the Auth SPA
chose>`, never `main` · A2 tokens and platforms are stored; the URL platform equals the
session platform · A3 `/students` without a platform redirects to `/platform/<t>/students`
with the query kept · A4 `/platform/main` shows the notice, not the shell · S1 sidebar
reaches every admin row · S2 ⌘K lists Students/Staff/Courses and Invite student · S3 profile
menu names the platform · S4 Setup hidden outside Admin mode and `/setup` redirects home ·
S5 the home period select calls the overview endpoints · C1 Setup seed + add a term · C2
invite a student, pending strip shows it · C3 new section (rerun) appears with its term ·
C4 roster lists the enrolled student; a teacher assigned shows under Teachers · C5 gradebook
grid loads; an override saves and shows in history · C6 group created, member added · C7
`user-report` download link appears · C8 a section email preview/schedule succeeds · C9 a
record field saved and shown.

## Docs

`AGENTS.md` (`CLAUDE.md` symlink): the CRM's rules 1, 2, 4, 6–10 verbatim; rule 3 → "three
backends are the contract: DM (`lib/sis/api.ts`), LMS (`lms-api.ts`) and Studio
(`studio-api.ts`) through the gateway with the edX JWT and `credentials: 'omit'`; every call
names the platform or the course; lists are server-paged (the Courses list is the stated
exception); school and section data live in platform metadata under `sis` as arrays written
whole, student records in demographics, teachers as LMS course roles; enroll is a course
invitation or the LMS import, drop needs the instructor dashboard"; rule 5 → the vocabulary
(students, staff, courses, groups, terms; never tenant / pupil / class period); rule 11 →
"attendance is activity-derived and the UI says so"; rule 12 → "never trust an LMS
capability the probe has not proven on this platform"; rule 13 → "the platform comes from
`/platform/[tenantKey]` and is passed through to the Auth SPA as is; nothing resolves,
defaults to, or signs in to `main`". README: the CRM's sections with the SIS features, the
contract paragraph naming the endpoint families and versions (DM 4.416.0+, Open edX Sumac
with ibl-edx-pro 2.62+), the two lists below. `docs/development.md` adapted (roles, paths,
host, the probe, the LMS settings the app depends on: `ALLOW_AUTOMATED_SIGNUPS`,
`grades.writable_gradebook`, `BulkEmailFlag`, `JWT_EXPIRATION`). Replace this `PLAN.md` with
the README once the app exists, or keep it as `docs/plan.md`; rei decides.

## Delivery phases (each ends with the six gates green and the pages opened on the throwaway platform)

| Phase                                                                | Builds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Order                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Proof                                                                                                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — skeleton, probe, setup, students, staff, courses, groups         | repo config, `lib/iblai/*`, `lib/sis/{api,lms-api,studio-api,types,errors,format,metadata,sections,permissions,csv}.ts`, `scripts/probe-lms.mjs`, providers/store/hooks/i18n/messages, `app/layout.tsx`, `app/page.tsx`, the platform layout, home placeholder, `students/**` (directory, record, invite, import), `staff/**`, `courses/**` (list, new section, roster, teachers, settings), `groups/**`, `setup`, `admin/users`, `notifications`, `components/sis/*`, `components/ui/*`, `__tests__/*`, `e2e/*`, AGENTS.md, README | 1 config + skeleton copy with renames, `pnpm install`, build green · 2 shell + sign-in round trip · **3 `pnpm probe:lms` against the throwaway platform (Verification 3) — the results decide Drop, Import, Gradebook and Email** · 4 Setup + seed · 5 students + record + invite + import · 6 courses: list, new section (rerun + dates), roster, teachers, settings · 7 staff + roles · 8 groups + grade-level cohorts · 9 A/S/C1–C4/C6/C9 journeys | sign in; seed setup; invite + import a student; create a section for a term; assign a teacher; screenshot each page                                                 |
| 2 — gradebook, grades, attendance, credentials, guardians, dashboard | `lib/sis/{grades,attendance}.ts` + tests, `courses/[id]` Gradebook + Attendance tabs, `grades/`, `attendance/`, `credentials/`, the student Grades/Attendance/Credentials/Guardians tabs, home dashboard                                                                                                                                                                                                                                                                                                                            | 1 gradebook grid + cell editor + history + MFE embed · 2 student grades + term GPA · 3 attendance lib + the date-window control + grids · 4 credentials + certificate generation · 5 guardians · 6 dashboard · 7 C5                                                                                                                                                                                                                                   | an override saves and shows in the LMS gradebook; a student shows a letter grade, a present day, an issued credential; dashboard tiles match the overview endpoints |
| 3 — reports, messages, ⌘K, polish                                    | `reports/`, `messages/`, palette groups, `scripts/screenshots.mjs` shot list, README screenshots, C7–C8                                                                                                                                                                                                                                                                                                                                                                                                                             | 1 reports · 2 section email + announcements · 3 palette · 4 screenshots + README · 5 `v0.1.0` tag (rei)                                                                                                                                                                                                                                                                                                                                               | `user-report` downloads; a section email schedules; an announcement preview counts recipients; ⌘K reaches a student, a staff member, a course                       |

## Verification

1. Gates after every phase: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm i18n:check && pnpm test:coverage && pnpm build`.
2. `pnpm dev` from a clean browser profile → the Auth SPA URL carries `app=mentor&redirect-to=…` and **no `tenant=`** (DevTools network, or the A1 journey) → landing is `/platform/<the Auth SPA's choice>`; then `/platform/<throwaway>` by URL re-authenticates into it; `/platform/main` shows the notice. The SIS origin must be an allowed redirect origin of the throwaway platform (ask rei if the Auth SPA never returns).
3. **`pnpm probe:lms`** (`scripts/probe-lms.mjs`): reads the Playwright storage state (`playwright/.auth/user-setup-chromium.json`, which holds `edx_jwt_token` and `dm_token`), then reports status + first bytes for, in order: `GET lms/api/user/v1/me` (identity) · `GET lms/api/courses/v1/courses/?org=` (section list; expect the org's runs) · `POST lms/courses/{C}/instructor/api/get_students_features` (expect 200 — proves the org-instructor implied rights) · `POST …/list_course_role_members {rolename:"staff"}` · `GET lms/api/grades/v1/gradebook/{C}/` (200, or 403 = the `grades.writable_gradebook` flag is off → gradebook read-only from progress, entry via the MFE embed only) · `GET lms/api/course_home/v1/progress/{C}/{student_id}` · `OPTIONS`/`GET …/instructor/api/students_update_enrollment` with the JWT (401/403 = session-only → Drop is a link-out; 405 = the JWT query-param middleware is on → Drop works) · `GET studio/api/contentstore/v1/course_details/{C}` · `GET studio/api/ibl/manage/course/?course_key=` · `GET lms/api/ibl/users/manage/roles/?username=<self>`. Writes are proven by hand in the UI, with rei's go-ahead: one course invitation by username (enrolls without a sign-up round trip), one `modify_access` allow/revoke on a seeded teacher, one `register_and_enroll_students` CSV with an existing and a new email (`ALLOW_AUTOMATED_SIGNUPS`), one `bulk-update` override, one `send_email` to "myself" (`BulkEmailFlag`), one Studio rerun as the platform admin (the upstream creator check), one `course_details` PUT. The results go into `docs/development.md` and the KB.
4. `courseTimeUsers` date-window positive control (zeros for an empty window) before the attendance grids trust it.
5. Phase proofs as in the table; `pnpm test:e2e` with `e2e/.env.development` filled; screenshots of every page into `docs/images/`.
6. Never `git commit` (rei commits); never `--no-verify`; propose one commit line per hand-over.

## For the DM and the LMS (the README's two lists)

**Modifications to existing endpoints that would simplify the SIS**

- DM `dl_catalog_app/views/courses.py` `CourseView` and `views/metadata/courses.py`: add `IsPlatformAdmin` (read + metadata write) — sections could then live on course metadata.
- DM `dl_catalog_app/views/enrollments/courses.py`: let `IsPlatformAdminReadOnly` list by `course_id` without a target user — catalog rosters for platform admins.
- DM `dl_catalog_milestones/views/courses.py`: `IsPlatformAdmin` on POST — course-level grade/completion overrides.
- DM `ibl_dm_axd/datastore/api/views/grading.py` `GradingPerUserAPI`: honour `page`/`length`/`search` (stripped today).
- DM `core/views/user_management.py` `platform/users/`: `is_staff` and `active=false` filters, name search.
- DM platform-metadata / demographics: read-only keys or a visibility map (student-invisible fields).
- DM `dl_catalog_invitations` platform/course invitation DELETE: implement (stubs return 200).
- DM `ibl_dm_axd/data_reports/download_handlers.py`: add `xlsx`.
- DM `ibl_dm_attendance_app`: migrations + `date`, `status`, `recorded_by`, `IsPlatformAdmin` — then it is the attendance endpoint.
- LMS `ibl_enrollment_api`: a DRF enroll/unenroll for course staff (today `students_update_enrollment` is session-only, the ibl routes are global-staff only, and standard enrollment POST is patched to 404) — or turn on `IBL_ENABLE_JWT_QUERY_PARAM_AUTH` and `ENABLE_BULK_ENROLLMENT_VIEW`.
- LMS cohorts `IsStaffOrAdmin` (`course_groups/permissions.py`): admit course staff / org roles, as ibl's other permission patches do.
- LMS `/api/grades/v1/courses/{C}/`: admit course staff for other users (today `is_staff` or self).
- LMS `/api/user/v1/accounts/{username}` PATCH and `/api/ibl/users/manage/` POST: admit the org admin of the user's platform (today self / global staff).
- LMS `register_and_enroll_students`: a JSON body beside the CSV file.
- Skills drift to fix in iblai/vibe: `iblai-api-catalog` (DMA-only routes shown as Api-Token), `iblai-api-feature` (`features/config` is not AllowAny), `iblai-api-analytics` (the AXD `…/orgs/<org>/…` families undocumented), `iblai-api-management` (`Api-Token` on Studio has no auth class); in the SDK: `useGetReportsQuery` hard-codes `/dm`, `useUpdateUserPlatformMetadataMutation` has no `username`, `useCreateCourseEnrollmentMutation` targets a 404'd route, `initializeDataLayer`'s Studio default is dead.

**Endpoints that would have to exist**

- Attendance records per user × section × date with status (present/absent/tardy/excused), reason and recorder; a daily summary per section (neither the DM nor the LMS has any — the LMS `UserActivity` is write-only).
- Terms and academic years as platform-scoped models (today platform metadata; the LMS `run` is free text).
- Sections as a model: course run + meeting pattern (period, days, room) + seats (teachers already exist as LMS course roles).
- Direct unenroll for platform admins from a browser.
- Course-level grade override, GPA and credits on the completion record (today subsection overrides only; GPA computed in the app).
- Report-card comments per student × section × term.
- User-to-user messaging / inbox threads (one-way builder and course email only).
- Field-level ACL on demographics / platform metadata.
- A guardian link with a guardian view (today watchers only receive notification copies).
- XLSX on reports.

## Findings to report (outside the SIS's scope)

- **`/api/bulk_grades/course/{C}/` on the LMS may be open**: edx-bulk-grades 1.1.0's views have no view-level permission check and an anonymous GET on a made-up course returned 500, not 401/403 (explorer, unverified against a real course) — someone authorised should check whether grades can be exported or imported without course staff rights.
- `EDX_API_KEY` is upstream's placeholder unless production YAML overrides it (nothing in the checkout does); the deployed value is unknown.
- `ibl-edx-sso-backend-app` `views.py:202-205` returns a 500 when `sso_auth_token` is missing (`error` undefined).
- The KB's "token triple" is wrong for the DM's `consolidated-token/proxy/` (only `/provision/` returns `edx_jwt_token`).

## Closing the task

- Knowledge base: `$KB/sis/<unix-ts>-<topic>/` with one file per task; facts worth recording as you prove them (each with repo@commit evidence and a fresh-clone recheck): the probe results, the LMS settings found on the throwaway platform, whatever an endpoint does differently from the appendices.
- Propose (never write) lines for a new `~/Projects/ibl.ai/sis/CLAUDE.md` topic file.
- Hand-over: the tree left uncommitted, one commit line proposed (`feat: scaffold ibl.ai/sis — students, staff, sections, gradebook and school setup on the DM and LMS`).

---

## Appendix A — knowledge base search (what came back on 2026-10-07)

- `rg -il 'student information|\bSIS\b|openSIS' $KB` → nothing. No `sis/` directory existed
  before the planning session's entry.
- `crm/` sessions read in full: `1790969050-crm-frontend-upgrade` and
  `1791220468-contract-check` (the toolchain, shell, i18n, RBAC, RTK and security traps the
  SIS inherits), `1791385775-join-redirect-and-phones` (the sign-in `tenant=main` trap and
  its fix, the phone-layout fixes). Headings read: `release-it`, `zizmor-green`.
- `workspace/…/apps-built-on-the-sdk.md`: SDK shell, SDK Spinner, "platform" never "tenant",
  admin = `is_admin` AND Admin mode.
- `dm/…/repo-map-and-dev-sh.md`, `gotchas.md`, `rbac-and-authz.md` headings.
- LMS terms (`edx|lms|studio|gradebook|cohort|instructor`): only the auth-SPA password-grant
  fact (`cli/1790452547-local-stack-design`) and the `openedx-language-preference` cookie
  facts — no LMS API facts in the base before this work.

## Appendix B — facts verified during planning

| Fact                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DM `v2` is at 4.418.0 (`239f86a15`); the live `api.iblai.app/dm` schema reports `4.416.0-ai-plus`, 1204 paths                                                                                                                                                                                                                           | `web/dl_manager/version.txt`; `curl -sS 'https://api.iblai.app/dm/api/docs/schema/?format=json' \| jq -r '.info.version, (.paths\|length)'` (7.5 MB, slow)                                                                            |
| `ibl-dm-attendance-app` is in the image (`web/requirements/dm-apps.in:10`) but in no settings app list (positive control: `dl_catalog_app` hits `settings/dm.py`), loads only via the `EXTERNAL_APPS` env (`settings/client.py:8`), ships no migrations; the live schema has 0 `attendance` paths (140 `catalog` paths as control)      | `rg -n attendance web/dl_manager/dl_manager/settings/` → nothing; the schema `jq -r '.paths \| keys[]' \| rg -c attendance`                                                                                                           |
| The SDK's generated DM client (`sdk/*/packages/api-core`) and data-layer 1.27.0 wrap platform users, user groups, metadata, catalog, invitations, credentials, analytics, reports, notifications, SCIM                                                                                                                                  | `rg "url: '" packages/api-core/src/services/*.ts` in `~/Projects/ibl.ai/sdk/domains-provider-neutral-text`                                                                                                                            |
| npm on 2026-10-07: next 16.4.0, typescript 7.0.2, oxlint 1.87.0, oxfmt 0.72.0, @iblai/iblai-js 2.33.0, next-intl 4.14.9, vitest 5.0.3, playwright 1.63.0, shadcn 4.21.4, @base-ui/react 1.8.0, RTK 2.13.0                                                                                                                               | `npm view <pkg> version`                                                                                                                                                                                                              |
| vibe-starter is still eslint + Next 16.2.4 + the TS6 alias; the CRM is the current template                                                                                                                                                                                                                                             | `vibeapps/vibe-starter/package.json`                                                                                                                                                                                                  |
| The CRM checkout has no `node_modules`; the SDK was read from `sdk/domains-provider-neutral-text` (iblai-js 2.31.0)                                                                                                                                                                                                                     | `ls crm/main/node_modules` → missing                                                                                                                                                                                                  |
| `useMembers` = `usePlatformUsersQuery({platform_key, page_size: 200, query})` keeping only id/username/email/name                                                                                                                                                                                                                       | `crm/main hooks/use-members.ts` at `112dd02`                                                                                                                                                                                          |
| The OS's Tauri shell accepts both schemes and `/mobile-sso-login`                                                                                                                                                                                                                                                                       | `os/main@4f4b145b src-tauri/src/lib.rs:656-685`                                                                                                                                                                                       |
| The live LMS `learn.iblai.app` serves a drf-yasg schema (328 paths, basePath `/api`) at `/api-docs/?format=openapi` **only with** `Accept: application/json`; the `/api/ibl/*` entries carry no parameters                                                                                                                              | `curl -sS -H 'Accept: application/json' 'https://learn.iblai.app/api-docs/?format=openapi' \| jq -r '.paths \| keys[]'`                                                                                                               |
| The LMS backend is `~/Projects/ibl.ai/iblai-edx-pro/main` (image repo 2.62.3, `ae705e8`): production = `pro-sumac` (`FROM ibl-edx-ce:sumac.0.0.7`, edx-platform `open-release/sumac.2` = `94d5c88`); every ibl package is local under `apps/`                                                                                           | `apps.txt`, `pro-sumac/Dockerfile:2`, `ce-sumac/Dockerfile:36-41`                                                                                                                                                                     |
| ibl's enrollment plugin patches `EnrollmentListView.post` to raise 404 unconditionally when installed                                                                                                                                                                                                                                   | `apps/ibl-edx-enrollment-api/src/ibl_enrollment_api/patches/enrollments/views.py:20-33`, `settings/common.py:24`                                                                                                                      |
| The Agentic LMS front end (`lms/main`, Next 15, SDK 2.29.0) drives Studio REST over JWT via the gateway with its own `credentials: 'omit'` base query                                                                                                                                                                                   | `lms/main lib/utils.ts:49-92`, `services/studio.ts:10-28`                                                                                                                                                                             |
| `crm/main` is at `112dd02` (2026-10-07, "sign in to the current org") with uncommitted work from another live session; `112dd02` makes `redirectToAuthSpa` pass `platformKey` through, while `/` still falls back to `main` via `resolveDefaultTenant()`                                                                                | `git log -3`, `git status --short`, `lib/iblai/auth-utils.ts`, `lib/iblai/tenant.ts`                                                                                                                                                  |
| The SDK sends `tenant=` only when `platformKey ?? path ?? remembered cookie` resolves; the OS and the LMS pass `platformKey` through; the LMS's `TenantRedirect` prefixes the stored platform or signs in without one; the Auth SPA chooses `?tenant=` → `selected_tenant` → its default, and sends zero-platform users to `/error/409` | `web-utils utils/auth.ts:543-556`; `os/main lib/utils.ts:143-177`, `providers/index.tsx:593-597`; `lms/main components/tenant-redirect.tsx`, `providers/index.tsx:48,166-169`; `apps/auth/app/(auth)/login/complete/page.tsx:209-246` |

## Appendix C — DM substrate, part 1: attendance, grades, analytics, reports, notifications, search (iblai-dm-pro@239f86a15)

Shared rules: auth is `Authorization: Token <dm_token>` (knox) or `Api-Token <platform key>`;
the DRF default permission is `IsDMAdmin` (Django staff only). The AXD families
(`api/{platform,overview,audience,engagement,performance,perlearner}/orgs/<org>/…`) bind the
platform by the `<org>` URL kwarg, use the AXD `IsPlatformAdmin`, "A|S" views also admit the
learner reading their own `user_id`; GET responses cached 3600 s; lists take `page` + `length`;
**undeclared query params are silently dropped**. `api/analytics/*`, `api/reports/*` and
notification routes bind by `platform_key` and enforce RBAC actions when RBAC is on.

| SIS need                                   | What exists (methods, perms)                                                                                                                                                                                                              | Verdict                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Attendance                                 | `api/attendance/user/course/block/` GET/POST/PUT — `Attendance(course FK, block_id, user FK, attended bool)`, no date/status/recorder, default `IsDMAdmin`; in no app list, **no migrations**                                             | unusable → bullet; v1 activity-derived           |
| Activity per day                           | `api/engagement/orgs/<org>/courses/<course_id>/time/users/<user_id>/over-time`, `…/time/users`, `api/audience/orgs/<org>/active-users/over-time`, `api/perlearner/orgs/<org>/users/<user_id>/activity/`, `api/analytics/time-spent/user/` | usable, read-only                                |
| Grades per class                           | `api/performance/orgs/<org>/courses/<course_id>/grading/{per-learner (capped at 10),detail,summary,average,average-with-cutoff}`; `api/platform/orgs/<org>/courses/<course_id>/progress/`; `api/platform/orgs/<org>/courses/grades`       | secondary to the LMS gradebook                   |
| Grades per student                         | `api/perlearner/orgs/<org>/users/<user_id>/grades/per-course`, `…/courses/<course_id>/grading/{detail,summary,cutoffs}`, `api/analytics/learner/details?…&include_edx_progress=true`                                                      | secondary to LMS progress                        |
| Grade entry / letter / GPA / comments      | none; nearest `POST api/catalog/milestones/completions/course/manage/` (DM-admin only)                                                                                                                                                    | LMS bulk-update covers entry                     |
| Dashboard                                  | `api/overview/orgs/<org>/{registered-users,active-users,most-active-courses,average-grade,courses/completions,learners}`, `api/platform/orgs/<org>/{…counts…}`, `api/audience/orgs/<org>/enrollments/{over-time,per-course}`              | usable                                           |
| Students table (rich)                      | `api/perlearner/orgs/<org>/learners`, `api/analytics/learners/list/`                                                                                                                                                                      | usable (admin)                                   |
| Reports                                    | `api/reports/platforms/<key>/` GET, `…/new` POST, `…/<report_name>` GET, `…/<task_id>/download?format=csv\|json`; `course-grade-report`, `user-report`, `course-enrollment-report`, … ; expire after 1 day                                | usable (admin)                                   |
| Bulk CSV import                            | none over REST                                                                                                                                                                                                                            | the LMS `register_and_enroll_students` covers it |
| Messaging                                  | notification builder (`context,validate_source,preview,send`; sources `email\|username\|platform\|csv\|department\|pathway\|program\|usergroup`), per-user inbox, preferences, templates; user-to-user: none                              | announcements; SDK `NotificationDisplay`         |
| Guardians                                  | `api/core/watched-groups/` (+ `watchers/`, `watched-users/`); a watcher is a platform user who gets copies of the learner events                                                                                                          | usable                                           |
| Search                                     | `api/search/users/orgs/<org>/users/<username>/` (roles `Student\|Instructor\|Admin`, status, facets); `api/search/global/` (AllowAny)                                                                                                     | usable                                           |
| Terms, periods, rooms, timetable, calendar | none anywhere                                                                                                                                                                                                                             | platform metadata + bullets                      |
| Per-platform settings                      | `platform/configurations/` registry-gated; `platform/config/site/` admin-only; **`api/core/orgs/<org>/metadata/` free JSON, anonymous GET, admin PUT/PATCH, recursive dict merge (arrays replaced)**                                      | carries `sis`                                    |

Skill drift: `iblai-api-feature` calls `features/config` AllowAny (it inherits `IsDMAdmin`);
`iblai-api-analytics` omits the AXD `…/orgs/<org>/…` family.

## Appendix D — DM substrate, part 2: users, metadata, enrollment, catalog, groups, invitations, credentials (iblai-dm-pro@239f86a15)

Permission shorthand (`core/permissions.py`): **DMA** `IsDMAdmin`, **PA** `IsPlatformAdmin`
(the named platform must equal the token's), **PAoU** platform admin of a named user,
**Self**, **Dept** department-mode admin, **Watcher**. **std** pagination = `page`/`page_size`.

| SIS need                 | What exists (methods, perms)                                                                                                                                                                                                                                                                                                                                                  | Verdict                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Directory                | `GET /api/core/platform/users/` (DMA \| PA-RO \| Dept-RO; `query`, `is_admin`, `department_mode`, `sort`; active links only; rows `user_id, username, email, name, added_on, expired_on, is_admin, is_staff, active`); the users search (above); `GET /api/core/users/platforms/?username=`; `POST /api/core/users/platforms/` upserts the link (deactivate = `active:false`) | usable                                                |
| Learner vs staff         | `UserPlatformLink.is_admin` ⇄ edX `org-instructor`, `is_staff` ⇄ `org-staff` (org-level only)                                                                                                                                                                                                                                                                                 | usable                                                |
| Create a student account | `consolidated-token/provision/` (Api-Token/OAuth2), `users/proxy/` (DMA), SCIM — none from a browser; **platform invitation** `POST /api/catalog/invitations/platform/` (PA) + `/bulk/`; pending = `?active=true`; DELETE is a stub                                                                                                                                           | invite (SDK dialog); the LMS import for bulk          |
| Student record           | `/api/core/platforms/<key>/<username>/demographics/` GET/PUT/DELETE (Self \| PAoU; PUT resets omitted base fields; DELETE wipes every platform); `…/demographics/fields/` CRUD + `export/` + `import/` (PA); `/api/core/users/platform-metadata/?platform_key=&username=` (self or admin link)                                                                                | demographics = the student record; no field-level ACL |
| Enrollment read          | `GET /api/catalog/enrollment/courses/search/` (a PA must name a user)                                                                                                                                                                                                                                                                                                         | self; rosters from the LMS                            |
| Enrollment write         | no DM route; course invitation `POST /api/catalog/invitations/course/` (PA) + `/bulk/` enrolls on edX on accept                                                                                                                                                                                                                                                               | invite to enroll                                      |
| Courses                  | `GET /api/catalog/courses/`, `metadata/course/`, `programs/`, `conditionals/*` have **no permission classes → DMA-only**                                                                                                                                                                                                                                                      | lists from the LMS                                    |
| Groups                   | `/api/core/user-groups/` CRUD (PA; `users_to_set` replaces membership); legacy `/api/core/user_groups/link` one member, `/link/bulk` (PA); departments (PA)                                                                                                                                                                                                                   | usable                                                |
| Guardians                | `/api/core/watched-groups/` (PA; platform from the token)                                                                                                                                                                                                                                                                                                                     | usable                                                |
| Credentials              | `/api/credentials/orgs/<key>/users/<username>/…` list / assertions POST + `bulk/` / a user's assertions / revoke PUT / public verify; `CredentialPermission`                                                                                                                                                                                                                  | usable                                                |
| Platform / school        | `GET/POST /api/core/platform/` (PA; key, name, **org**, urls); **`/api/core/orgs/<key>/metadata/`**                                                                                                                                                                                                                                                                           | carries `sis`; `org` feeds the LMS course filter      |
| Auth                     | `Authorization: Token <dm_token>` (knox, 14 days, platform-bound); every endpoint but a few needs the platform named                                                                                                                                                                                                                                                          | the slice names it on every call                      |

## Appendix E — LMS substrate, part 1: ibl's own plugin APIs (iblai-edx-pro@ae705e81, `apps/*`)

Conventions: **VAC** = Open edX `view_auth_classes` (JWT, OAuth2 bearer, or session + CSRF);
**GS** = global staff checked inside the view; **org admin** = `OrgInstructorRole`, which the
DM keeps in sync with `UserPlatformLink.is_admin`. No API-key auth in ibl's packages. A
startup patch (`ibl_user_management_api/patches/student_auth_role.py:55-118`, `startup.py:
10-75`) gives **org-staff → course-staff and beta-tester on every course of the org** and
**org-instructor → org-staff, course-instructor, course-staff**, plus instructor-dashboard
downloads (`CAN_RESEARCH` widened to course staff), bulk-email schedules, teams, discussions,
Course Live, libraries.

| Need                           | What exists (auth · permission)                                                                                                                                                                                      | Verdict for a platform admin's token                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Create / update a user         | `POST /api/ibl/users/manage/` (VAC · **GS**)                                                                                                                                                                         | closed                                                     |
| Disable / retire               | `/api/ibl/users/manage/standing/` (GS); `/api/ibl/retirements/*` (OAuth2 bearer · GS)                                                                                                                                | closed                                                     |
| Roles                          | `GET /api/ibl/users/manage/roles/` (GS or self); `POST` (GS any role; **org admin: org-scoped roles only** — `org-staff`, `org-instructor`, …); `roles/sync/` (GS)                                                   | org roles usable — "make a teacher" = `org-staff`          |
| Platform membership            | `GET /api/ibl/users/manage/platform/` (own links); `POST /api/ibl/sites/platform/` (GS)                                                                                                                              | nothing lists or links a platform's users on the LMS       |
| Metadata                       | `/api/ibl/users/manage/metadata/` GET/POST (**GS or self**)                                                                                                                                                          | self only                                                  |
| Enrollment                     | `POST /api/ibl/enrollment/{enroll,enroll/bulk,enroll/student/bulk,unenroll,unenroll/bulk}/` (VAC · **GS**; `mode` default `honor`; 500 when any error list is non-empty); `enroll_status/` (self; GS others)         | closed                                                     |
| **Standard enrollment POST**   | `DISABLE_STANDARD_ENROLLMENT = True` → core `POST /api/enrollment/v1/enrollment` **404** for everyone; core GETs unaffected                                                                                          | the SDK's enrollment mutation is dead                      |
| Roster                         | `GET /api/ibl/users/manage/course/` (VAC · GS)                                                                                                                                                                       | closed (use the instructor API)                            |
| Course metadata (read)         | `GET /api/ibl/catalog/metadata/course/public/?course_key=` (anonymous unless flagged; `CourseDetails` + the DM's catalog metadata)                                                                                   | usable                                                     |
| Course dates (write)           | Studio `/api/ibl/catalog/metadata/course/settings` GET/POST/PUT, `…/course/details` POST (VAC · `has_course_author_access`)                                                                                          | usable by an org admin                                     |
| Course create / rerun / delete | Studio `/api/ibl/manage/course/` GET/POST (GS or `OrgInstructorRole(body.org)`), `…/course/delete/` (GS or org admin; enabled); `POST /api/v1/ibl/course/create` (the DM link `is_admin`; grants instructor + staff) | usable by an org admin (verify the upstream creator check) |
| Programs                       | Studio `/api/ibl/manage/program/` (GS or org `instructor`)                                                                                                                                                           | usable                                                     |
| Completion / dashboard         | `/api/ibl/completion/status/*`, `course_outline/*`, `/api/ibl/dashboard/*` (self; GS `?username=`)                                                                                                                   | self only                                                  |
| Cohorts                        | `ibl-edx-cohort-api` **not registered**                                                                                                                                                                              | —                                                          |
| Certificates                   | `GET /api/ibl/credentials/certificates/{uuid}/` (AllowAny)                                                                                                                                                           | usable (verification)                                      |
| Emails                         | `/ibl/api/edx/custom/emails/send` (GS; flag off)                                                                                                                                                                     | closed                                                     |
| Catch-all DM proxy             | `/api/ibl/{endpoint_path}` (GS unless allowlisted)                                                                                                                                                                   | closed                                                     |
| Not found                      | attendance, calendar/sessions, terms, departments, guardians, CSV import/export, gradebook routes, per-org user/enrollment listing, many-users unenroll, custom field schema, transcripts                            | —                                                          |

## Appendix F — LMS substrate, part 2: Open edX core APIs on `open-release/sumac.2` (source read upstream at `94d5c88`; live schema and probes 2026-10-07)

Auth shorthand: **DEF** = `[DefaultJwtAuthentication, DefaultSessionAuthentication]` (JWT
needs no CSRF; no ibl app changes `REST_FRAMEWORK`); **VAC** / **JBS** = JWT + Bearer +
Session; **DJ** = plain Django view (session + CSRF only). Roles: **course staff** =
`has_access(…,'staff')` (GS, CourseStaff, CourseInstructor, OrgStaff/OrgInstructor of the
course's org); **course instructor** = GS, CourseInstructor, OrgInstructor; **course author**
= `has_course_author_access`. ibl patches that matter: `CAN_RESEARCH` widened to course staff;
the implied org-role rights; org roles admitted to bulk-email schedules, discussions, teams;
**cohorts' `IsStaffOrAdmin` untouched**; ibl's site configurations set
`ALLOW_AUTOMATED_SIGNUPS: True` (`ibl_edx_sites_api/utils/configuration.py:32`).

| Family                                                                     | Routes · auth · who                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Fields / notes                                                                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Enrollment                                                                 | `GET /api/enrollment/v1/enrollment?user=` (JBS; course staff see the user's enrollments in courses they staff); `POST` **ibl-patched 404**; `GET …/enrollment/{username},{course_id}` (`is_staff` only); `GET /api/enrollment/v1/enrollments/?course_id=` (**IsAdminUser = GS**; cursor, 100); `GET /api/enrollment/v1/course/{C}` (anonymous; modes); `/api/enrollment/v1/roles/` (self); `/api/bulk_enroll/v1/bulk_enroll` (**404 — `ENABLE_BULK_ENROLLMENT_VIEW` off**)                                                                                                                                                                                                                                                                                                                      | modes honor/audit/verified/…                                                                                                              |
| Instructor API (`courses/{C}/instructor/api/`, `api/instructor/v1/`) — DRF | `register_and_enroll_students` (CAN_ENROLL + `ALLOW_AUTOMATED_SIGNUPS`; CSV `email,username,name,country[,cohort,course_mode]`), `list_course_role_members` (course instructor), `modify_access` (course instructor; `rolename` beta/instructor/staff/limited_staff/ccx_coach/data_researcher; allow also enrolls), `get_students_features[/csv]` (CAN_RESEARCH), `get_grading_config`, `get_anon_ids`, `list_instructor_tasks`, `/api/instructor/v1/{tasks,reports}/{C}`, `send_email` (EMAIL + `BulkEmailFlag`; **form-encoded**, `send_to` JSON string of `myself\|staff\|learners\|cohort:<name>\|track:<mode>`), `change_due_date`/`reset_due_date`/`show_student_extensions` (GIVE_STUDENT_EXTENSION), `start_certificate_generation` (GS or course instructor), `reset_student_attempts` | live probes: these answered 401 (mounted)                                                                                                 |
| Instructor API — DJ (session-only)                                         | `students_update_enrollment` (CAN_ENROLL; `action` enroll/unenroll, `identifiers`, `auto_enroll`, `email_students`), `bulk_beta_modify_access`, `get_problem_responses`, `rescore_problem`, `override_problem_score`, `calculate_grades_csv`, `problem_grade_report`, forum roles, `show_unit_extensions`, `add_users_to_cohorts`, `get_issued_certificates`, certificate regeneration/exceptions                                                                                                                                                                                                                                                                                                                                                                                               | unless `IBL_ENABLE_JWT_QUERY_PARAM_AUTH` is on                                                                                            |
| Grades (`/api/grades/v1/`)                                                 | `courses/{C}/?username=` (JBS; `is_staff` or self — **course staff 403**); `policy/courses/{C}/` (course staff); `gradebook/{C}/` (VAC; course author + waffle `grades.writable_gradebook`; filters `username, user_contains, cohort_id, enrollment_mode, assignment, assignment_grade_min/max, course_grade_min/max, excluded_course_roles`; cursor 50); `gradebook/{C}/bulk-update` (same; 202/422; 403 when frozen; body `[{user_id, usage_id, grade{earned/possible_all/graded_override, comment}}]`); `gradebook/{C}/grading-info`; `subsection/{usage}/?user_id=` (override history); `section_grades_breakdown/`, `submission_history/{C}/` (GS); `/api/bulk_grades/course/{C}/` (plain Django, **no view permission in the source; anonymous GET → 500**)                               | course-level override: none; `PersistentCourseGrade{percent_grade, letter_grade, passed_timestamp}`                                       |
| Cohorts                                                                    | `/api/cohorts/v1/settings/{C}`, `courses/{C}/cohorts/[{id}]`, `…/users[/{username}]`, `courses/{C}/users` (CSV) — all JBS + **`IsStaffOrAdmin` = GS** (forum roles GET only); legacy DJ views course staff                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | closed for platform admins                                                                                                                |
| Certificates                                                               | `/api/certificates/v0/certificates/{username}[/courses/{C}/]` (JBS; GS or self, or the owner's visibility pref); generation via the instructor API; public URL `/certificates/{uuid}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | self read                                                                                                                                 |
| Course home                                                                | `/api/course_home/v1/dates/{C}` (enrolled or course staff), `progress/{C}[/{student_id}]` (self; `student_id` needs course staff), `outline/{C}`, `course_metadata/{C}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | progress: `course_grade{percent, letter_grade, is_passing}`, `section_scores`, `grading_policy`, `completion_summary`, `certificate_data` |
| Courses                                                                    | `/api/courses/v1/courses/?org&username&search_term&active_only&course_keys` (VAC; `username` other than self needs GS; anonymous blocked at the edge), `/courses/{C}`, `course_ids/?role=&username=` (self or GS), `blocks/?course_id=` (`all_blocks` needs course staff)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | id, name, org, number, run, start/end, enrollment window, pacing                                                                          |
| Users                                                                      | `/api/user/v1/me`; `accounts/{username}` GET (self/`is_staff` full, others public) · **PATCH self only (GS 403)**; `accounts?username=a,b` (authenticated; public fields); `accounts/{username}/deactivate/` (`student.can_deactivate_users`); registration `/api/user/v2/account/registration/` (anonymous, form-encoded, rate-limited)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | staff-side creation = `register_and_enroll_students`                                                                                      |
| Programs                                                                   | `/api/program_enrollments/v1/*` needs course-discovery (not configured)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —                                                                                                                                         |
| Studio                                                                     | `/api/v1/course_runs/` (+`/rerun/`, `/clone/`) **IsAdminUser = GS**; `/api/contentstore/v1/course_details/{C}` GET/PUT (read access gates PUT), `course_grading/{C}` GET/POST, `course_team/{C}` GET (writes DJ), `/api/contentstore/v0/advanced_settings/{C}`; legacy `/course/`, `/course_rerun/`, `/settings/*` DJ; `ENABLE_CREATOR_GROUP` True (creation needs CourseCreator/OrgContentCreator or GS; `ORGANIZATIONS_AUTOCREATE` True)                                                                                                                                                                                                                                                                                                                                                      | ibl's `/api/ibl/manage/course/` is the org-admin path                                                                                     |
| Messaging                                                                  | discussion threads/comments (JBS); `send_email` + `/api/instructor_task/v1/schedules/{C}/bulk_email/`; notifications read-only; calendar sync `.ics`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                                                                                                                         |
| No substrate                                                               | terms (`run` is free text), bell schedule, rooms, attendance (`UserActivity` write-only), report cards, GPA/credits, course-level overrides, guardians, grade levels/homerooms                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                         |

Release evidence: `ce-sumac/Dockerfile:36-41` (`EDX_PLATFORM_VERSION=open-release/sumac.2`),
`docs/edx-requirement/ibl_prod_lms_sumac-pip-freeze-2026-05-04.txt:159-188` (`94d5c88`),
`git ls-remote` (`open-release/sumac.2` = `94d5c88`), Sumac-only routes in both live schemas.

## Appendix G — LMS substrate, part 3: how a browser app reaches the LMS and Studio (SDK data-layer 1.27.0, iblai-edx-pro@ae705e81, live probes 2026-10-07)

**The path.** Any origin can call LMS and Studio **DRF** views through the gateway
`https://api.iblai.app/lms/…` and `https://api.iblai.app/studio/…` with `Authorization: JWT
<edx_jwt_token>` and `credentials: 'omit'` (probe: `ACAO: *`, `Authorization` and
`Content-Type` allowed, no credentials). The direct hosts answer CORS only for whitelisted
origins (`lms.iblai.app` is; `localhost:3000`, `sis.ibl.ai`, a future `sis.iblai.app` are not
— exact-origin CORS with credentials comes from ibl's `CsrfExemptMiddleware` + the
`CsrfExemptDomain` table, global-staff admin API `/ibl/ai/sso/backend/api/csrf-exempt-domains`).
Sumac's DRF default auth puts JWT first on every DRF view. ibl's packages add **no** inbound
auth class (`ibl-edx-api-auth-app` is an outbound client-credentials cache).

**SDK facts.** `initializeDataLayer(dmUrl, lmsUrl, legacyLmsUrl, storage, handlers,
studioUrl?, refreshAuthToken?)`: the Studio URL is never derived (default
`https://studio.iblai.app`, dead) — pass `${apiBase}/studio`. The SDK's Studio service sends
`credentials: 'include'` + `X-CSRFToken` (`data-layer/src/features/utils.ts:351-362`), which
a `*` origin rejects → own slice with `omit` (as `lms/main/lib/utils.ts:49-92`);
`useGetUserRolesQuery({useLms:true})`. LMS calls (`JWT`, `omit`) work.
`useCreateCourseEnrollmentMutation` → the 404'd POST. `useUpdateUserRoleMutation` has no
`course` field. `useGetUserMetadataEdxQuery` / `useUpdateUserMetadataEdxMutation` wrap
`/api/user/v1/accounts/{username}` (PATCH = `application/merge-patch+json`).

**The token.** The edX JWT is per user, not platform-bound (HS256; username, user_id,
`aud: openedx`, exp); it lands in storage through the SDK `SsoLogin` `?data=` payload. The
data-layer never re-mints it; expiry = sign in again. Lifetime: password-grant default
36000 s; `/ibl-auth/request-jwt/` uses `JWT_AUTH['JWT_EXPIRATION']` (ibl fallback 3600 s,
Sumac default 30 s — production unknown). The DM's `consolidated-token/proxy/` returns only
`axd_token` + `dm_token`; only `/provision/` adds `edx_jwt_token`.

**Embeds.** The SSO iframe (`learn.iblai.app/ibl/ai/sso/backend/edx/iframe?sso_auth_token=`;
token from `useLazyGetEdxSSOTokenQuery`, single-use, 300 s) serves courseware and the
instructor dashboard but answers `frame-ancestors 'self'` to non-whitelisted origins. The
MFE pages (`apps.learn.iblai.app/gradebook/{C}`, progress, dates, discussions) carry **no
framing restriction** and authenticate by the JWT postMessage handshake (`auth.jwt.ready` →
`auth.jwt.token`, `lms/main/components/edx-iframe/edx-iframe.tsx:160-200`).

**Vibe skills.** Every `iblai-api-studio-*` skill and `iblai-api-studio-lms` use session
cookies captured by Playwright; `iblai-api-management` documents roles on the Studio host
with `Api-Token` (no such auth class on edx-pro); `iblai-api-profile` uses the gateway.

**Open items** (settled by the probe): production `JWT_AUTH['JWT_EXPIRATION']`;
`IBL_ENABLE_JWT_QUERY_PARAM_AUTH`; `ALLOW_AUTOMATED_SIGNUPS` on the throwaway platform; the
gradebook waffle flag; `BulkEmailFlag`; how the gateway treats `Api-Token`.
