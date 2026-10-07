# Contributing to ibl.ai/sis

Thanks for helping build the open-source student information system for the ibl.ai platform.

## Setup

1. Fork and clone the repository
2. `pnpm install --ignore-scripts`
3. `pnpm dev`, sign in with your ibl.ai account on a platform you administer — a throwaway one for development

## Workflow

1. Branch from `main`: `git checkout -b feat/my-feature`
2. Make the change
3. `pnpm typecheck && pnpm lint && pnpm format:check && pnpm i18n:check && pnpm test:coverage && pnpm build`
4. Add or update a Playwright journey in `e2e/journeys/` when user-facing behavior changes
5. Open a pull request against `main` with a screenshot of the affected screen

## Guidelines

- **SDK components first** — `@iblai/iblai-js` (profile, notifications, account/management, invitations) before shadcn/ui, before anything custom
- **Never override SDK styles** — SDK components ship with their own
- **Platform comes from the URL** — build every in-app link with `useSession().href(path)`; nothing lands on the community platform
- **Existing endpoints only** — DM calls in `lib/sis/api.ts`, LMS in `lib/sis/lms-api.ts`, Studio in `lib/sis/studio-api.ts`; a missing endpoint goes into the README's lists, not into a workaround
- **Every string is translated** — `useTranslations()`; a key goes into all four `messages/*.json` files or none
- **Brand** — primary `#0058cc`, gradient buttons via `ibl-button-primary`, Lucide icons, system font
- **pnpm 12** as the package manager (`corepack enable`); conventional commit messages — they drive the release: every push to main is released by [release-it](.release-it.json), the subjects since the last `v*` tag become the CHANGELOG entry, and `fix` bumps the patch number, `feat` the minor, a breaking change (`!` or `BREAKING CHANGE`) the major

See [AGENTS.md](AGENTS.md) for the rules AI assistants follow in this repo.
