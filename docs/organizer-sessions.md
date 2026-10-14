# Organizer session management

The organizer Sessions tab now reads real Supabase inventory. Create a single session or a weekly series, save an incomplete draft, resume/delete drafts, edit an occurrence or its future scope, and cancel an occurrence or future scope. Full-screen editors are protected by the same active-organizer guard as the organizer tabs.

## Creation and drafts

The implemented form has five scrollable steps: Details, Schedule, Players, Waitlist, and Policies. Details and Schedule follow the revised Stitch references; the user directed implementation now with visual polish later. Details collects title, optional description, and club/address. Schedule offers one-time/weekly dates, local start, independent start/end times with calculated duration, and a computed weekly occurrence count. Players exposes capacity, eight-category multi-select, optional strict category enforcement, and Everyone/Women only/Men only. Waitlist exposes enabled state, promotion mode, and unlimited/numeric capacity. Policies exposes visibility and optional timing rules with selectable units. A separate, unnumbered review screen contains the summary, court-arrangement acknowledgement, and publication. Club name and address can be entered manually, or selected from existing saved venues. Street-address autocomplete uses Google Places API (New) through an authenticated server proxy. It requires a configured server API key; manual entry remains available. Club names stay organizer-entered and no provider directory is copied. See google-address-search.md for setup. Shared venues are immutable through the client: changing a selected name/address creates or reuses a different manual venue, without changing anyone else's club reference.

The creation wizard omits assigned court until court support is ready; existing optional court labels remain preserved in the backend. The organizer confirms they arranged the court externally. No court availability, reservations, exclusivity, payments, or refunds are handled by Palla.

Weekly creation includes the first occurrence and repeats every seven days through the chosen end date, capped at 52 occurrences. Times use America/Argentina/Buenos_Aires regardless of device timezone. End time must follow start on the same day; overnight sessions are deferred. Prices use ARS centavos in persistence. Persistence uses explicit Argentine category arrays with unique integers 1–8, where lower numbers indicate stronger play and NULL means all categories. The form exposes all categories or explicit multi-select, including noncontiguous selections. Strict category enforcement defaults off and is stored on series and occurrences; future joining must enforce it. Existing price values remain in the payload, with no pricing or payment controls.

Incomplete drafts persist the form's JSON input in session_series without generating occurrences or publishing a venue. Publishing validates the full input and creates the shared venue and occurrences in one transaction. A secure client UUID identifies the draft/series request; retrying a successful publish does not duplicate its occurrences.

## Editing and destructive actions

Editors cover all creation fields except recurrence configuration, which stays fixed after publishing. Editing changes existing occurrences; it never silently extends a series. Future scope includes the selected occurrence and subsequent original occurrence dates, excluding cancelled or started occurrences. Changing the time applies the chosen local clock time consistently, including when the selected occurrence was previously edited alone. Original occurrence identity remains stable.

The database locks the series and affected rows and rejects stale selected-occurrence versions. Draft deletion matches the saved version and requires confirmation. Published sessions have no client DELETE grant; cancellation retains dated history and an optional reason. Started and already cancelled sessions are read-only. Unsaved changes prompt before leaving the editor; requests prevent navigation until completion.

## Persistence and authorization

The migration adds venues, session_series, and sessions. Every table has RLS. Series lifecycle uses draft/active/paused/ended, with version-checked pause/resume/end backend operations. Session/series ownership uses auth.uid() and the trusted active organizer record. Shared venues are readable by authenticated users; only active organizers can insert locations. No venue update/delete grants are given to the client. Save and cancel RPCs use SECURITY INVOKER, empty search_path, and revoked public/anon execution. Anonymous and other organizers cannot read private organizer inventory.

The session_series JSON stores incomplete creation configuration. Typed series columns are authoritative for published template defaults; normalized sessions are authoritative for individual occurrence details. A one-off session also has a series identity with one occurrence. Sessions now have allowed_categories instead of category_min/category_max. Series and occurrences also store visibility and waitlist configuration; series timing offsets generate per-occurrence timestamps. No historical profile level is converted.

## Feature boundaries

Player discovery still uses illustrative data. Registration transactions, attendance counts, waitlist operations, participant notification delivery, public discovery/sharing, and payment instructions are not part of this slice. Persisted settings for visibility, timing, and waitlists are implemented; operational behavior will be added with those features. The UI does not promise notifications or invent attendee counts. Before implementing joining, registration transactions must lock the same session rows and enforce capacity; organizer edits must reject capacity below confirmed attendance and notify affected players through a real delivery mechanism.

## Verification

The isolated PostgreSQL test in supabase/tests/organizer-sessions.sql creates rollback-only fixture accounts. It covers publication, five weekly occurrences, idempotency, manual venue reuse, one/future edits, stale saves, draft deletion, cancellation history, player rejection, anonymous rejection, and organizer isolation. Native development fixtures exercise shared form/confirmation components, not live account writes. See native-testing.md for the actual device checks and their limits.

### Occurrence detail and future controls

Selecting **View session** opens `/organizer-session/[id]`. The occurrence detail reads the existing organizer inventory through its query/service/repository boundary. It displays the saved date, venue, court, categories, price, description, deadlines, cancellation reason, and weekly context. Editing is a separate `/organizer-session/edit?id=...` route. Only published future occurrences expose edit and cancel actions. Cancellation reuses the version-checked mutation and explicit one-date/future-date confirmation.

Roster, invitations, waitlist, registration toggling, sharing/QR, check-in, and broadcasts are visual placeholders. Sample participants are labelled illustrative; enabled future controls open an explanation without persisting changes. Capacity is real; it is not shown as a fabricated registration count. Club booking/payment responsibilities remain outside Palla. The development-only `/sessions-preview/occurrence` renders the same presentation with fixture data and safe preview actions.

Native evidence and verification limits: `.impeccable/review/native/occurrence/report.json`. The current run tested native presentation and placeholder interactions on iOS and Android plus Android reading of an existing cancelled QA occurrence. It did not perform another live publish/edit/cancel mutation.

## Updated creation settings

Migration `20261014151114_session_creation_settings.sql` is deployed. See [session-creation-settings.md](session-creation-settings.md) for the canonical contract and compatibility behavior. Existing prices and payment data are preserved; this update adds no payment settings.

Rollback-only SQL tests in `supabase/tests/session_creation_settings.sql` cover the updated save RPC, one/future edits, recurrence, validation, idempotency, stale versions, legacy inputs, and authorization. `supabase/tests/session_settings_backfill.sql` verifies migration preservation in an isolated database only. The five-step native form now uses those canonical settings. Migration `20261014162834_session_strict_categories.sql` is also deployed, adding a required boolean with a false default to series and occurrences. Choosing all categories resets strict enforcement to false. No registration enforcement, roster format/layout, team balancing, or payment workflow is implemented.

Current verification: `npm run verify` passed 54 unit tests, TypeScript, formatting, and lint with 13 existing warnings. Isolated SQL save and lifecycle suites passed. Native fixtures exercised all five steps on iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17, including the iOS time picker, Android date picker, duration/weekly/category interactions, and waitlist guards. Evidence is under `.impeccable/review/native/session-creation/`. Final native fixture checks completed: Android exercised court-confirmation rejection and the publication callback; iOS exercised the draft-save callback. Both traversed all five steps. Production creation routes then loaded successfully on both signed-in simulators. No live account save, slow-request runtime save, or complete keyboard/large-text/screen-reader acceptance is established by this run.

Fresh review found in-flight mutation controls and a hidden legacy deadline cap; both were corrected and the narrow follow-up verdict was resolved/ship. That verdict does not certify pixel-perfect fidelity or a full UI review. Visual additions are opt-in input surfaces and feature-local 16-unit card/12-unit input geometry; global `DESIGN.md`, `.impeccable/design.json`, and tokens were preserved.

The wizard omits the blue Details context chip, the Schedule location recap, and Delete draft actions. All wizard Back buttons use the ghost variant with no background or border.

Review sits outside the five-step progress indicator. Each summary section returns to its corresponding form step via Edit, preserving values and offering Return to review after validation. Publish/Save changes and session cancellation appear only on review.

Schedule redesign: dates precede the Time card. Start and end times use matching soft fields and Geist SemiBold labels; duration is read-only and calculated from the two values. Editing start does not shift end. End must be later on the same day. Weekly weekday is derived from the first date; one-time sessions omit the last date. Native pickers use Buenos Aires timezone.
