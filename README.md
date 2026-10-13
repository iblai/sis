<div align="center">

<a href="https://ibl.ai"><img src="https://ibl.ai/images/iblai-logo.png" alt="ibl.ai" width="300"></a>

# ibl.ai/sis

**The open-source student information system for schools on the ibl.ai platform.**

Students, staff, sections, grades, credentials, reports and messages — for every school platform you belong to, with ibl.ai single sign-on built in. One codebase. Your platform, your data, your rules.

[![About](https://img.shields.io/badge/About-ibl.ai-blue)](https://ibl.ai)
[![Docs](https://img.shields.io/badge/Docs-ibl.ai%2Fdocs-green)](https://ibl.ai/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)

[Why ibl.ai/sis](#why-iblaisis) · [Features](#features) · [Quick Start](#quick-start) · [Deployment](#deployment) · [Architecture](#architecture) · [What the platform would need](#what-the-platform-would-need)

</div>

---

## Why ibl.ai/sis

|                                 |                                                                                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔓 **Your code, your data**     | MIT-licensed and self-hostable. Everything lives in your ibl.ai platform — the Data Manager, the learning platform and Studio — through their existing APIs. No second database, no vendor lock-in.        |
| 🏫 **One platform per school**  | Sign in once with ibl.ai SSO and switch between every school platform you belong to, exactly like [os.ibl.ai](https://os.ibl.ai). Each platform gets its own students, sections, terms and roles.          |
| 📚 **Sections are course runs** | A section is an Open edX course run for a term: the roster, the gradebook, the teachers and the course email are the learning platform's own; the school adds the term, subject, room, period and credits. |
| 🧭 **The openSIS shape**        | Students and staff, school setup (years, terms, grade levels, periods, rooms, subjects), scheduling, grades and GPA, credentials and certificates, reports, messaging, bulk import — on ibl.ai.            |
| 🌍 **Four languages**           | English, Spanish, French and Chinese, following the language you chose in any other ibl.ai app.                                                                                                            |
| 🔐 **Enterprise-ready**         | SSO (OAuth / OIDC / SAML via the platform), platform roles, notifications, invitations that make a learner a platform user.                                                                                |

---

## Features

<table>
<tr>
<td width="50%" valign="top">

**👥 Students & staff**

- **Directory** — every student of the platform with email and join date; search by username or email, server-side; invite one, or **import a CSV** straight into a section (new emails get an account when the platform allows it)
- **Student record** — the platform's demographics plus the school's own fields (student id, grade level, enrollment status, homeroom, guardians, emergency contacts…); changing the grade level moves the student between cohort groups
- **Enrollment** — a student's sections from the learning platform with grade and completion; enroll by course invitation
- **Grades** — per section: percent, letter, passing, graded work; a term GPA on the school's scale and credits
- **Credentials** — issue and revoke the platform's credentials; generate the learning platform's certificates
- **Guardians** — platform users who receive copies of the student's notifications
- **Staff** — teachers and admins; make someone a teacher (the LMS `org-staff` role) or a platform admin

</td>
<td width="50%" valign="top">

**📚 Sections & setup**

- **Courses** — the platform's course runs joined with term, subject, grade level, room, period, credits and seats; filters by term, subject and level
- **New section** — rerun an existing course into a term (Studio); the dates follow the term
- **Roster** — the instructor API's roster; enroll an existing member, import, export CSV, email
- **Gradebook** — the grid of learners × graded subsections with overrides and their history, or the embedded gradebook when the platform keeps the API closed
- **Settings** — term and dates, grading policy and letter cutoffs (Studio), teachers (course roles), the section's own data
- **Groups** — homerooms and cohorts as platform user groups; bulk add by username; announce
- **Setup** — school, years and terms, grade levels with cohort groups, periods, rooms, subjects, the student-record fields (seed the defaults, export, import)

**📊 Operate**

- **Dashboard** — the members count, sections, active learners, average grade, enrollments over time, most active courses
- **Reports** — the platform's reports (run, poll, download) and a section's instructor downloads
- **Messages** — section email through the learning platform (with scheduling) and platform announcements (everyone, a group, named users)
- **⌘K** — students, staff and courses from anywhere; create anything

</td>
</tr>
</table>

---

## Quick Start

```bash
git clone https://github.com/iblai/sis.git
cd sis
pnpm install --ignore-scripts
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You are sent to [login.iblai.app](https://login.iblai.app) to sign in and come back to `/platform/<your platform>` — the school your account administers. The app never works in the community platform.

No configuration is required against hosted `iblai.app`: the service URLs default in [`lib/iblai/config.ts`](lib/iblai/config.ts). Copy `.env.example` to `.env.local` only to point at a self-hosted platform.

**Using [Claude Code](https://claude.ai/claude-code)?** Read [`AGENTS.md`](AGENTS.md) first.

Node.js 22+ and pnpm 12 (`corepack enable` picks the pinned version up from `package.json`).

### Scripts

| Command           | What it does                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Dev server on port 3000                                                                                                |
| `pnpm build`      | Production build (standalone output)                                                                                   |
| `pnpm start`      | Serve the production build                                                                                             |
| `pnpm typecheck`  | TypeScript 7                                                                                                           |
| `pnpm lint`       | oxlint, zero warnings                                                                                                  |
| `pnpm format`     | oxfmt (`pnpm format:check` in CI)                                                                                      |
| `pnpm i18n:check` | Same keys in the four catalogs; no “tenant”, “pupil” or “class period”; no ASCII apostrophe; English labels Title Case |
| `pnpm test`       | Vitest unit tests (`pnpm test:coverage` in CI: 95 % lines on `lib/`)                                                   |
| `pnpm test:e2e`   | Playwright journeys on a throwaway platform (needs `e2e/.env.development`)                                             |
| `pnpm probe:lms`  | Which learning-platform capabilities this platform really exposes ([docs](docs/development.md#the-lms-probe))          |
| `pnpm release`    | release-it: version from the commits, CHANGELOG, tag, GitHub Release (CI runs it on every push to main)                |

---

## Deployment

ibl.ai/sis is a front end for the ibl.ai platform. The platform provides sign-in, platforms, roles, notifications, the learning platform and Studio; this repository provides the app.

### Option A: Hosted ibl.ai platform

1. **Build and run with Node**

   ```bash
   pnpm build
   cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
   PORT=3000 node .next/standalone/server.js
   ```

   The build is a [standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) server, so `next start` does not apply; the two copies are what the Dockerfile does. On Vercel nothing of this is needed: the project builds the regular Next.js output (`vercel.json` pins the preset) and only wants `ENABLE_EXPERIMENTAL_COREPACK=1` so pnpm 12 is used.

2. **Or run with Docker**

   ```bash
   docker build -t iblai-sis .
   docker run -p 3000:3000 iblai-sis
   ```

   `NEXT_PUBLIC_*` values are inlined at build time and `.env*` files stay out of the image, so a self-hosted platform passes its URLs as build arguments: `--build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com --build-arg NEXT_PUBLIC_AUTH_URL=https://login.example.com --build-arg NEXT_PUBLIC_PLATFORM_BASE_DOMAIN=example.com` (omit them for hosted `iblai.app`).

3. **Register the origin.** Every origin the app runs on (`http://localhost:3000`, `https://sis.example.com`) must be an allowed redirect origin of the platforms that sign in, or the Auth SPA never returns. Ask your ibl.ai operator.

### Option B: Self-hosted platform

Set the service URLs in `.env.local` for `pnpm dev` and `pnpm build`, or as Docker build arguments (above); see [Configuration](#configuration). If you need the full backend, reach out at [ibl.ai/contact](https://ibl.ai/contact) for an enterprise license and deploy it with [iblai/iblai-infra-cli](https://github.com/iblai/iblai-infra-cli).

---

## Configuration

All app config is `NEXT_PUBLIC_*` and optional against hosted `iblai.app`. Defaults live in [`lib/iblai/config.ts`](lib/iblai/config.ts).

| Variable                           | Default                        | Description                                                               |
| ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`         | `https://api.iblai.app`        | Consolidated API; `/dm`, `/lms`, `/studio` and `/axd` are derived from it |
| `NEXT_PUBLIC_AUTH_URL`             | `https://login.iblai.app`      | The hosted Auth SPA                                                       |
| `NEXT_PUBLIC_PLATFORM_BASE_DOMAIN` | `iblai.app`                    | Base domain; with no API base, services resolve to their own subdomains   |
| `NEXT_PUBLIC_MFE_URL`              | `https://apps.learn.iblai.app` | The Open edX micro-frontends (the embedded gradebook)                     |
| `NEXT_PUBLIC_MAIN_TENANT_KEY`      | `main`                         | The community platform — the one platform the app never works in          |
| `NEXT_PUBLIC_IBL_PLATFORM`         | `mentor`                       | `app=` sent to the Auth SPA (the OS's value, so every platform signs in)  |
| `NEXT_PUBLIC_ENABLE_RBAC`          | `false`                        | Gate SDK admin surfaces on RBAC policies as well as the admin flag        |

---

## Architecture

```
sis/
├── app/
│   ├── page.tsx · [...legacy]/              # a path without a platform → /platform/<the user's platform>/…
│   ├── platform/[tenantKey]/                # everything inside one school platform
│   │   ├── layout.tsx                       # sidebar + top bar shell, access gate, the `main` notice
│   │   ├── page.tsx                         # dashboard (admin) · my sections (student)
│   │   ├── students/ · students/[username]/ # directory · record, enrollment, grades, credentials, guardians
│   │   ├── staff/ · staff/[username]/       # staff · roles
│   │   ├── courses/ · courses/[courseId]/   # sections · roster, gradebook, settings
│   │   ├── groups/ · groups/[id]/           # homerooms and cohorts
│   │   ├── grades/                          # averages and the term report
│   │   ├── credentials/ · reports/ · messages/
│   │   ├── setup/                           # school, years & terms, levels, periods, rooms, subjects, student fields
│   │   └── notifications/[[...id]]/         # SDK NotificationDisplay
│   ├── sso-login-complete/                  # SSO landing (outside the providers)
│   └── api/auth-redirect/                   # same-origin hop to the Auth SPA
├── components/sis/                          # shell, ⌘K, widgets, one folder per area
├── components/ui/                           # shadcn/ui (Base UI) primitives
├── hooks/                                   # useSession, useSisMetadata, useSections
├── lib/sis/                                 # the three RTK Query slices · types · metadata · grades · csv
├── lib/iblai/                               # config · platform resolution · auth helpers
├── i18n/ · messages/                        # next-intl config · en/es/fr/zh catalogs
├── providers/iblai-providers.tsx            # Redux > AuthProvider > TenantProvider
├── scripts/probe-lms.mjs                    # the learning-platform contract probe
├── e2e/ · __tests__/                        # Playwright journeys · Vitest
└── docs/                                    # development guide
```

### Data flow

```
User → React pages → RTK Query ┬─ lib/sis/api.ts        → https://api.iblai.app/dm/…      Authorization: Token <dm_token>
                               ├─ lib/sis/lms-api.ts    → https://api.iblai.app/lms/…     Authorization: JWT <edx_jwt_token>
                               └─ lib/sis/studio-api.ts → https://api.iblai.app/studio/…  Authorization: JWT <edx_jwt_token>
                                            ↓
                                   @iblai/iblai-js SDK
                                   ├── /web-utils        AuthProvider · TenantProvider · platform switch
                                   ├── /web-containers   sidebar shell · profile dropdown · notifications · Account/Management · invitations
                                   └── /data-layer       profile metadata
```

Sign-in is the platform's hosted round trip (`login.<domain>/login?app=mentor&redirect-to=<origin>` → `/sso-login-complete?data=…`), with no platform named unless the URL names one. `TenantProvider` compares the platform in the URL with the one the session is scoped to and re-authenticates when they differ. Details: [`docs/development.md`](docs/development.md).

### The contract

Existing endpoints only, as they are:

- **Data Manager** (ibl-dm-pro 4.416.0+): the platform users list (the directory) and user links, demographics and field definitions, platform metadata (`/api/core/orgs/{key}/metadata/`, where the school's own data lives under `sis`), user groups, platform and course invitations, watched groups, credentials, reports, the notification builder, and the analytics families (`overview`, `platform`, `audience`, `engagement`, `perlearner`, `performance`).
- **Open edX Sumac with the ibl plugins** (iblai-edx-pro 2.62+), through the gateway with the edX JWT: the DRF instructor API (`get_students_features`, `list_course_role_members`, `modify_access`, `register_and_enroll_students`, `send_email`, `start_certificate_generation`, `change_due_date`), `enrollment/v1` (read), `course_home/v1/progress`, `grades/v1/gradebook` (+ `bulk-update`, `grading-info`, `subsection`), `instructor/v1/{tasks,reports}`, `instructor_task/v1/schedules`, `/api/ibl/users/manage/roles/`, `user/v1/accounts`, `course_home/v1/course_metadata`. Not `courses/v1/courses`: the edge in front of the LMS answers 403 to every caller on that path, preflights included.
- **Studio**: `contentstore/v1/home/courses` (the section list: the runs the caller can author, active and archived, in one call), `/api/ibl/manage/course/` (rerun), `contentstore/v1/course_details`, `contentstore/v1/course_grading`.

A platform admin passes the course-staff checks through ibl's implied org-instructor rights. Some capabilities are operator settings per platform — the gradebook API flag, automated sign-ups on import, course email, the JWT lifetime — and `pnpm probe:lms` tells you which ones yours has before the app relies on them.

---

## What the platform would need

ibl.ai/sis writes no endpoint of its own. The features that wait for a change in the Data Manager or the learning platform, and the change each needs, are in [`TODOS.md`](TODOS.md): what the app does today, what it needs, and the pull request when one carries it, pinned to `iblai-dm-pro@4a53a0663` and `iblai-edx-pro@ae705e8`.

**Settings per platform, not code**

- `grades.writable_gradebook` is never seeded, so the gradebook API is 403 until the waffle flag is set in Django admin.
- `JWT_AUTH['JWT_EXPIRATION']` is unset and ibl readers fall back to one hour; a school day needs more.
- `ALLOW_AUTOMATED_SIGNUPS` is whatever the platform was created with; the probe proves it.
- A `CsrfExemptDomain` row for the SIS origin only matters for embedding the instructor dashboard. The JWT query-param middleware is not a shortcut for Drop: it never exempts CSRF and puts tokens in URLs.

---

## Testing

```bash
pnpm test            # Vitest — metadata parsing, grades and GPA, CSV, sections, permissions, platform resolution, SSO landing, config
pnpm i18n:check      # en / es / fr / zh catalogs carry the same keys and the house vocabulary
pnpm test:coverage   # the unit tests with the coverage gate CI runs
pnpm test:e2e        # Playwright journeys on a throwaway platform (copy e2e/.env.development.example first)
pnpm test:e2e --project=mobile   # the phone journey (S6) on a Pixel 7 viewport
pnpm test:e2e:ui     # interactive UI mode
```

The Playwright suite signs in once through the real Auth SPA (`e2e/auth.setup.ts`) and reuses the session across the journeys in `e2e/journeys/`; the SIS journey writes terms, groups and a record field, so it runs on a throwaway platform only.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md). If you use AI-assisted tooling, read [AGENTS.md](AGENTS.md) first — it explains the SDK-first component rule, the multi-platform model, the three backends and how to verify a change.

---

## Resources

- [Documentation](https://ibl.ai/docs)
- [Development Guide](docs/development.md) — setup, sign-in, the three backends, the LMS probe, release
- [Agentic OS](https://github.com/iblai/os) · [Agentic LMS](https://github.com/iblai/lms) · [CRM](https://github.com/iblai/crm) — the sibling apps this one mirrors
- [Vibe](https://github.com/iblai/vibe) — the skills and SDK toolkit for building on ibl.ai
- [@iblai/iblai-js](https://www.npmjs.com/package/@iblai/iblai-js) — the ibl.ai SDK
- [openSIS Classic](https://github.com/OS4ED/openSIS-Classic) — the student information system whose feature set shaped this one

---

<div align="center">

## License

MIT License. See [LICENSE](LICENSE) for details.

<br>

**[ibl.ai](https://ibl.ai)** · Your school’s AI, under your control.

</div>
