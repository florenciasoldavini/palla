# Palla Engineering Guide

Read the exact Expo SDK 54 documentation at https://docs.expo.dev/versions/v54.0.0/ before changing Expo or React Native code.

## Product

Palla is a mobile-first platform for recurring social padel sessions. The first MVP covers recurring-session creation, registration, cancellation, waitlists, an organizer dashboard, and notifications.

Primary user modes are player, organizer, and unauthenticated explorer. Web reduces shared-link friction; native mobile is the long-term product priority.

## Stack

- Expo SDK 54, Expo Router, React Native, and TypeScript
- Supabase for auth, PostgreSQL, RLS, Realtime, Storage, and Edge Functions
- TanStack Query for server state
- React Hook Form with Zod for production forms
- NativeWind and the reusable UI primitives under `components/`
- Expo SecureStore, Expo Notifications, and Sentry
- npm, ESLint, Prettier, and Vitest

## Architecture

- Routes live only in `app/` and use `(auth)`, `(player)`, and `(organizer)` boundaries.
- Use the dependency direction `screens/components -> hooks -> services -> repositories -> Supabase or Edge Functions`.
- Each product feature owns its components, hooks, queries, mutations, services, repositories, validation, and types under `features/<feature>`.
- UI must not call Supabase or external APIs directly.
- TanStack Query owns remote state. Do not mirror server data in Zustand.
- Keep platform-specific adapters close to the shared interface when native and web behavior differ.

## Supabase

- Never expose a secret or service-role key to the client.
- Enable RLS on every table in an exposed schema and test authorization rules.
- Authorization must use trusted database state, not editable user metadata.
- Privileged, paid, secret, or abuse-sensitive workflows belong in Edge Functions.
- Add product tables only when their feature is implemented. Palla currently carries only the reusable user/auth bootstrap.

## Product rules

- Every feature must account for iOS, Android, and web.
- Every async surface needs an explicit loading state.
- Persistent destructive actions require a clear confirmation flow.
- Production forms use React Hook Form and Zod; transient UI-only state may use local component state.
- Prefer small composable files and descriptive names. Avoid premature abstractions.

## Environment and verification

- `.env.local` is ignored and is the local source of truth.
- `env-sync.config.json` defines documented variables and deployment targets.
- Run `npm run env:example` after changing environment metadata.
- Run `npm run verify` before publishing changes.

Native directories are generated through Expo Continuous Native Generation and remain ignored. App identity is `palla`, with `palla://` redirects and `com.florenciasoldavini.palla` native identifiers.
