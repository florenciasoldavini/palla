# Palla

Mobile-first platform for discovering, organizing, and joining recurring social padel sessions.

This repository is the production foundation for the MVP. It intentionally contains navigation, integrations, design primitives, and boundaries—not product features or a database schema.

## Stack

- Expo 57, Expo Router, React Native, and TypeScript
- Supabase client with SecureStore-backed native sessions
- TanStack Query for server state
- React Hook Form and Zod for forms and validation
- NativeWind 5 and Tailwind CSS 4
- Expo Notifications, Sentry, and PostHog
- pnpm, ESLint, and Prettier

## Start locally

```sh
pnpm install
cp .env.example .env.local
pnpm start
```

The Codex `Run` action executes the same development path through `./script/build_and_run.sh`.

Useful checks:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm verify
```

## Environments

Committed templates exist for development, preview, and production. Copy the desired template to `.env.local` for local work. Expo only exposes variables prefixed with `EXPO_PUBLIC_`; those values are embedded in the client and must never contain service-role keys or other secrets.

The Supabase publishable key is expected in the client. Server-only secrets belong in Supabase Edge Function secrets or the future deployment environment.

## Architecture

Routes live under `src/app` and contain only layouts or screen entry points:

- `(auth)` for authentication flows
- `(player)` for discovery and registration flows
- `(organizer)` for session management flows

Reusable code lives under `src`:

- `components` — genuinely reusable presentation primitives
- `features` — product capabilities with their own components, hooks, queries, mutations, schemas, and types
- `lib` — configured third-party clients and runtime infrastructure
- `providers` — application-level React providers
- `services` — native or external platform operations
- `theme` — design tokens
- `types` — cross-cutting declarations only
- `utils` — small framework-independent helpers

Create folders such as `hooks`, `constants`, or `store` only when real code needs them. Server data belongs in TanStack Query; Zustand should only be introduced for proven client-global state.

## Supabase

No database schema or migration is generated yet. `getSupabaseClient()` exposes Auth, PostgreSQL/Data API, Realtime, Storage, and Edge Function capabilities once environment values are configured.

Native auth sessions use chunked Expo SecureStore values; web sessions use browser local storage. The client uses a publishable key only. Every future exposed table must enable RLS and receive explicit policies and grants as part of its migration.

Sentry source-map uploads additionally require `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in the private build environment. These are build-time secrets and must not use the `EXPO_PUBLIC_` prefix.

## Notifications

Notification registration is opt-in and is not called during startup. The service is ready for the future permission UI. Remote push notifications require an EAS project ID and a development build on Android; local notifications remain available in Expo Go.
