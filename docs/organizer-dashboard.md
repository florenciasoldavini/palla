# Organizer dashboard

The organizer Overview uses the Balanced layout approved on 20 October 2026: four performance cards, a cumulative booking chart, player feedback, attention items and the next session. Existing Palla tokens, cards, buttons, anchored floating select menus and bottom sheets are reused.

## Calculation rules

- This month runs from the first local day to now. Its comparison covers the same elapsed duration in the previous month, clipped to that month's end. Last month compares two complete calendar months.
- Boundaries use the fixed dashboard timezone America/Argentina/Buenos_Aires and exclusive end timestamps.
- Performance includes only the organizer's completed, non-cancelled occurrences with a scheduled end in the past and a start within the selected period.
- Sessions hosted counts occurrences. Player bookings counts confirmed registrations, excluding the organizer; it does not assert attendance. Fill rate is total confirmed places divided by total capacity, rather than an average of individual percentages.
- Average rating and review count include published reviews belonging to those occurrences, including reviews written later. Each eligible review counts independently, even from repeat players. Hidden/removed reviews are excluded.
- Chart points accumulate the same booking cohort by local session day. Zero comparison baselines never produce fabricated percentage increases.
- Missing fill/rating denominators display an em dash. Counts remain zero.

## Current activity

Upcoming sessions and attention items are independent of the selected historical period. Attention lists up to three published occurrences within 48 hours that are less than half full, plus unread host-side conversations. The next session is the earliest future published occurrence. Session links open occurrence details; messages use the existing inbox route. Session creation remains on the Sessions screen.

Recent feedback shows two reviews. View all opens a dedicated Player feedback page, carrying the selected period. A virtualized list uses keyset pagination (20 reviews per request), loads more near the end, and provides an explicit load/retry action. The page has its own period filter, pull-to-refresh and Back action. Individual reviews still open the existing detail/report sheet. Pull-to-refresh, the error card’s retry action, focus refresh and a 60-second active query interval keep the overview current.

## Data and access

`get_organizer_dashboard` and `get_organizer_dashboard_reviews` are authenticated read-only RPCs. Private security-definer implementations validate the caller against trusted active-organizer records and scope every result to that organizer. Public wrappers use security-invoker semantics and deny anonymous execution. There are no new product tables, client secrets or environment variables.

Migration: `supabase/migrations/20261020151233_organizer_dashboard.sql`.
Rollback-only verification: `supabase/tests/organizer-dashboard.sql`, covering period boundaries, counts, weighted fill, review scope, pagination and access isolation.

## Verification status

Local `npm run verify` passed: 178 tests, no TypeScript or lint errors (14 existing lint warnings). Native no-write preview route: `palla://sessions-preview/organizer-dashboard`; query `state=empty`, `state=error` or `state=loading` selects edge states. Fixtures are explicitly illustrative and restricted by the existing development-only preview layout.

Native preview devices: iPhone 17 Pro / iOS 26.5 and Pixel 8 / Android 17 (API 37). Populated cards/chart, period selection, scrolling, illustrative feedback sheet opening/closing, loading/error states and large-text reflow were exercised on both platforms. iOS used Accessibility Extra Large; Android used a 1.5 font scale, then both were restored to normal. The preview reuses the production dashboard view and review cards with local fixtures; its illustrative review details do not exercise the authenticated review query or report flow. Screenshots are local ignored evidence under `.impeccable/review/native/organizer-dashboard/`.

The 20 October refinement removed the standalone Create session and Refresh overview actions. Native error-state retry and pull-to-refresh callbacks were exercised in both simulators using the no-write preview; background polling does not activate the pull-refresh spinner.

Shared-backend deployment and rollback SQL execution remain pending explicit deployment approval. Automatic approval review rejected applying the migration because the current request did not explicitly authorize changing the shared backend. Live authenticated statistics and actual review pagination cannot be claimed verified until deployment.

Shared dropdown refinement: `SelectMenu` opens a floating menu below its trigger on both native platforms, with safe-area-aware above placement when needed, scrollable options, selection checkmarks and outside/Back dismissal. The same component serves session-form dropdowns. Native selection and dismissal were checked on iPhone 17 Pro / iOS 26.5 and Pixel 8 / Android 17.

Reviews-page refinement: the no-write native preview was checked on both platforms for page entry, scrolling, opening/closing an illustrative review and returning to the dashboard with its scroll position retained. Live authenticated pagination still awaits backend deployment.
