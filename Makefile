.PHONY: dev build start check test e2e e2e-ui tauri-dev tauri-build ios android mobile-init

dev: ; pnpm dev
build: ; pnpm build
start: ; pnpm start
check: ; pnpm typecheck && pnpm lint && pnpm format:check && pnpm i18n:check && pnpm test:coverage && pnpm build
test: ; pnpm test
e2e: ; pnpm test:e2e
e2e-ui: ; pnpm test:e2e:ui
tauri-dev: ; pnpm tauri:dev
tauri-build: ; pnpm tauri:build
ios: ; pnpm tauri:dev:ios
android: ; pnpm tauri:dev:android
mobile-init: ; bash scripts/mobile-init.sh
