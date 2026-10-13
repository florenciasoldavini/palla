# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users and purpose

Palla helps players discover and join recurring social padel sessions, and helps organizers manage participation. Buenos Aires is the initial context. Organizer onboarding focuses on hosting; playing-category collection is deferred until a playing capability needs it.

## Capabilities and constraints

The MVP includes accounts, profiles, recurring sessions, registration, cancellation, waitlists, organizer dashboards, and notifications. Organizers arrange courts and club payments outside Palla. Multiple organizers can use the same venue independently.

Accounts use Supabase Auth. Onboarding collects a starting mode (player or organizer) and a name. Players then answer a self-reported Argentine playing-category question; organizers finish after their name without answering a playing question. Skipping the question does not imply that an organizer does not play. Beginner and unknown player answers remain distinct from numbered categories. Organizer access is self-service, available immediately after onboarding (confirmed October 13, 2026). Authorization comes from database records, never editable auth metadata.

Expo SDK 54, React Native, Expo Router, TypeScript, NativeWind, TanStack Query, React Hook Form, and Zod are the existing stack. iOS and Android are the product targets. Browser use is not required; UI and flow validation must use iOS Simulator and Android Emulator.

## Brand commitments

Palla remains light-only. Preserve the existing wordmark, lime accent, Hanken Grotesk and Geist typography, and shared design tokens. The UI is intended to demonstrate professional frontend and UX craft in a portfolio.

## Evidence on hand

Product and schema decisions are recorded in docs/mvp.md and docs/domain-model.md. The current session screens use illustrative data; no live session inventory is available.
