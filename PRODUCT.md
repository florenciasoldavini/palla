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

The Palla Stitch project is the visual reference for colors, typography, card composition, and future screen functionality (user direction, October 14, 2026). Preserve that aesthetic while correcting spacing, alignment, text readability, and native touch targets. Mockups guide production UI implementation. For the session-creation wizard, the user explicitly directed implementation now with visual polish later (October 14, 2026). Reference features may be represented as placeholders before their backend exists; label unavailable actions and illustrative data clearly and never report a successful save, payment, message, booking, or check-in without performing it. Stitch's feature ideas guide the roadmap; they do not change the agreed off-platform court/payment model without a separate decision.

## Evidence on hand

Product and schema decisions are recorded in docs/mvp.md and docs/domain-model.md. Organizer session management reads live Supabase inventory and supports drafts, bounded weekly creation, editing, and cancellation. Player discovery still uses illustrative data; player registration and My games remain deferred. Organizer roster/attendance and waitlist management, chat push preferences, and the review notification inbox are implemented. Session review behavior and remaining public display scope are recorded in docs/session-reviews.md.

Organizer Overview implements period-based performance cards, a cumulative booking chart, player feedback, attention items, and the next session using the existing design system. View all reviews opens a dedicated page with a period filter and virtualized, paginated feedback. Its authenticated read-only RPC migration is prepared but remains undeployed; native preview checks use illustrative fixtures and do not establish live statistics or review pagination. Calculation rules and verification limits are recorded in docs/organizer-dashboard.md.

Session settings now persist optional registration opening/closing, optional player cancellation cutoff, public/private visibility, explicit allowed categories, and waitlist configuration. The implemented creation form has five steps: Details, Schedule, Players, Waitlist, and Policies and review. It exposes canonical settings, explicit category multi-select, gender policy, and optional minute-based deadlines. Existing price values remain in the save payload without fee controls; no new payment settings are included. Visibility and waitlist configuration do not yet implement discovery access or player registration/queue operations.

Published series now have a normalized content/schedule template, gender participation policy (Everyone by default), and draft/active/paused/ended lifecycle. Pause and end preserve already published dates. Current creation still generates bounded dates upfront; automatic future generation is deferred. The five-step creation form is implemented; its first two steps follow the revised Stitch references. Strict category enforcement is stored on series and occurrences and defaults off; joining enforcement remains deferred with registration. Lifecycle backend operations exist, while dedicated lifecycle/template UI remains deferred. Native fixtures exercised all five creation steps on iOS and Android; this run did not perform live account saves. Shared design tokens and DESIGN.md remain the incumbent brand contract.

Session announcements are one-way, occurrence-specific messages from the active host to confirmed players. Announcement inbox items are independent of the player-only push preference. Sending snapshots recipients; late registrants can read history without old alerts. Hosts may remove but cannot edit announcements. See `docs/session-announcements.md`.

Session cancellation is occurrence-only in the app, entered from occurrence detail. The dedicated screen requires a structured reason and accepts an optional player message; confirmed and waitlisted players receive typed inbox notifications and optional player-mode push alerts. Multi-date cancellation remains a backend capability without a UI control. Reasons do not automatically determine host reliability or exemptions. See `docs/session-cancellations.md`.
