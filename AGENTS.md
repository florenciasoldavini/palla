# Palla Engineering Guide

Read the exact Expo SDK 54 documentation at https://docs.expo.dev/versions/v54.0.0/ before changing Expo or React Native code.

## Product

Palla is a mobile-first platform for recurring social padel sessions. The first MVP covers recurring-session creation, registration, cancellation, waitlists, an organizer dashboard, and notifications.

Primary user modes are player, organizer, and unauthenticated explorer. Palla is a native iOS and Android app. Browser usage is not a product requirement.

## Stack

- Expo SDK 54, Expo Router, React Native, and TypeScript
- Supabase for auth, PostgreSQL, RLS, Realtime, Storage, and Edge Functions
- TanStack Query for server state
- React Hook Form with Zod for production forms
- NativeWind and the reusable UI primitives under `src/components/`
- Expo SecureStore, Expo Notifications, and Sentry
- npm, ESLint, Prettier, and Vitest

## Architecture

- Routes live only in `src/app/` and use `(auth)`, `(player)`, and `(organizer)` boundaries.
- Use the dependency direction `screens/components -> hooks -> services -> repositories -> Supabase or Edge Functions`.
- Each product feature owns its screens, components, hooks, queries, mutations, services, repositories, validation, and types under `src/features/<feature>`.
- Shared UI belongs in `src/components/`; shared external adapters belong in `src/infrastructure/`.
- UI must not call Supabase or external APIs directly.
- TanStack Query owns remote state. Do not mirror server data in Zustand.
- Keep platform-specific adapters close to the shared interface when native and web behavior differ.

## Supabase

- Never expose a secret or service-role key to the client.
- Enable RLS on every table in an exposed schema and test authorization rules.
- Authorization must use trusted database state, not editable user metadata.
- Privileged, paid, secret, or abuse-sensitive workflows belong in Edge Functions.
- Add product tables only when their feature is implemented. Palla carries the user/auth bootstrap and organizer session management (venues, session_series, sessions). Organizer attendance and waitlist management use the registrations roster foundation. Player registration workflows and notification tables remain deferred until their features are implemented.

## Product rules

- Every feature must account for native iOS and Android. Existing web compatibility may remain, but it is not an acceptance target.
- Every async surface needs an explicit loading state.
- Persistent destructive actions require a clear confirmation flow.
- Production forms use React Hook Form and Zod; transient UI-only state may use local component state.
- Prefer small composable files and descriptive names. Avoid premature abstractions.

## Environment and verification

- `.env.local` is ignored and is the local source of truth.
- `env-sync.config.json` defines documented variables and deployment targets.
- Run `npm run env:example` after changing environment metadata.
- Run `npm run verify` before publishing changes. This verifies code quality, not native runtime behavior.
- UI and end-to-end flow testing must run in iOS Simulator AND Android Emulator. Do not use a browser, mobile browser viewport, or web screenshots as app validation unless the user explicitly asks for web-specific work.
- Verify keyboards, safe areas, back navigation, scrolling, large text, loading/errors, and accessibility using the native app on both platforms.
- Record device/OS and checks performed. If a simulator, emulator, build, or account handoff is blocked, report that platform as unverified and explain the concrete blocker; never substitute browser testing or claim native validation from a build or unit test.
- Repeatable no-write onboarding QA: `python3 scripts/test-native-onboarding.py --platform ios` and `--platform android` with Expo Go/Metro running. Use the experience-scoped `nativeQa=1` preview preparation and full native AXe tree when the plugin omits radio controls; see `docs/native-testing.md`. Preview completion verifies the form, not live account persistence.
- Google signup must prefill editable first/last names from provided Google identity metadata. Fill only missing fields in incomplete profiles; preserve user-entered names and completed profiles.

Native directories are generated through Expo Continuous Native Generation and remain ignored. App identity is `palla`, with `palla://` redirects and `com.florenciasoldavini.palla` native identifiers.
