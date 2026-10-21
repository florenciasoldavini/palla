# Organizer session management

Status: approved for implementation October 13, 2026. The user requested functional implementation now and visual refinement afterward. The session flow now uses the existing design system.

Mode: Operate. Preserve Palla's existing light-only palette, typography, components, and approved three-tab organizer navigation.

## Approved flow and implemented boundaries

- Sessions: Upcoming, Drafts, and Past filters; dated occurrence cards; Create session action.
- Create: place/schedule, players/price, then review. Support single sessions and a bounded weekly series. Manual club entry and reuse of saved venues are implemented. Google street-address search is implemented through an authenticated server proxy; billing/API and the server secret are configured, with bounded live prediction/selection checks passing on both native platforms.
- Review: show occurrence count, dates, category range, capacity, price, and deadlines. Confirm that the organizer has arranged the court independently.
- Edit: choose only this occurrence or this and future occurrences. Show the calculated upcoming occurrence count and date span before saving. Attendance impact and capacity validation against confirmed registrations remain requirements for the future registration feature; this slice has no attendance data.
- Delete/cancel: confirm deletion of a draft. Cancel published sessions to retain dated session history; select recurrence scope and optionally store a cancellation reason. Notification delivery is deferred.

## Mockups

- `.impeccable/mocks/organizer-session-create.png`: list, place/schedule, players/price.
- `.impeccable/mocks/organizer-session-manage.png`: review/publish, edit scope, cancellation confirmation.
- Exact generation prompts are in each image's `.png.json` sidecar and embedded in the PNG. Built-in image generation was used. Both images contain illustrative data, not real inventory.

## Translation decisions and implementation notes

The approved images are composition references. Manual club name entry and saved-venue reuse remain available. The Google integration searches street addresses rather than a club directory; manual full-address entry remains available when search fails or is not configured. The implementation uses native date/time controls, scrollable steps, inline validation, query loading/error/empty states, and destructive confirmations. Native verification scope is recorded in docs/native-testing.md. iOS accessibility-medium text layout has been checked; Android large text and screen-reader traversal remain unverified.

Court labels are organizer-entered text; the mock's dropdown must not imply a court-inventory integration. Session editing must include all relevant fields, even though the example shows the most important fields. Draft deletion uses a confirmation with Delete draft and Keep draft actions. Notifications shown in the proposed copy require an implemented delivery mechanism; do not promise delivery before that exists. Weekly scope counts are calculated from real occurrences; any future affected-player counts must use real registration data.

Session contracts now use Argentine integer category bounds. Persistence uses feature-owned repositories/services/hooks, trusted organizer ownership, RLS, and validation. The proposal does not alter shared club information or book courts.

The native editor uses existing fields, menus, cards, buttons, and chips across three steps. Date/time controls show selected values to accessibility APIs and use platform pickers. Review gives schedule, category bounds, capacity, ARS price, deadlines, and the court-arrangement acknowledgement their own readable groups. Step navigation dismisses the keyboard and resets scrolling. The form and loaded version remain pinned while editing so background refreshes cannot silently change the save baseline.

One/future scope summaries use actual published, upcoming occurrences and show their count and date span. Published recurrence stays fixed during editing. Cancellation and draft deletion are distinct actions: cancellation retains dated history and an optional reason, while draft deletion removes the draft after confirmation. Unsaved changes receive a separate discard confirmation. The shared native confirmation sheet is compact, scrollable, safe-area padded, and uses a danger confirm action plus a bordered keep action; cancellation reason uses the shared bordered textarea. Busy and error states are explicit.

## Evidence checked and verification limits

Documenter inspection covered `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, this brief, `docs/organizer-sessions.md`, `docs/native-testing.md`, actual organizer list/editor/form/review/native datetime/confirmation source, and shared input/textarea source. Meaningful accessibilityLabel/aria-label values and selected date/time accessibility values are present. Above a 1.2 font scale, the editor header and paired time/category controls stack.

Both platform fixture matrices passed seven checks each (`ios-report.json`, `android-report.json`): native date picker, creation review, required court acknowledgement, draft save, draft deletion keep/confirm, edit form, and cancellation keep/confirm. These use real shared components in a no-write preview, with illustrative inputs. The Android matrix resumed after platform-label/scroll automation fixes. Code verification passed with 43 unit tests and 13 existing lint warnings, no errors.

Authenticated iOS publication, query/list reload, edit save, and cancellation passed through real organizer routes. `ios-live-report.json` also records native entry and manual QA venue creation. The QA session remains cancelled in database history, as recorded by the connected database check in native QA documentation. Current captures visually inspected under `.impeccable/review/native/sessions/`: `live-list-ios.png`, `live-cancel-ios.png`, `large-text-ios.png`, `discard-large-text-ios.png`, and `cancel-reason-input-ios.png`. The live cancellation capture shows the calculated occurrence count and date; earlier `cancel-ios.png` is a generic-copy fixture.

Additional iOS checks passed at accessibility-medium text size: creation layout, Back/unsaved confirmation, Keep editing preserving input, and Discard changes returning to Sessions. Cancellation-reason entry and Keep session recovery passed in the fixture. The original text-size setting was restored. These checks used iPhone 17 Pro / iOS 26.5 / Expo Go SDK 54; Android fixture checks used Pixel_8 / Android 17 / Expo Go SDK 54.

Authenticated Android checks now passed after organizer onboarding: verified native title/club/address entry, publication of one QA occurrence, inventory reload, capacity edit from 8 to 9, Keep session recovery, cancellation, and retained Past history. Visually inspected `live-list-android.png`, `live-edit-review-android.png`, `live-edited-list-android.png`, `live-cancel-android.png`, and `live-past-android.png`; `android-live-report.json` records the tested flow. Connected read-only database verification, recorded by the QA handoff, confirms Android capacity 9 and iOS capacity 8, both cancelled. These current Android captures supersede earlier interrupted captures for this bounded scope.

Software-keyboard avoidance (hardware keyboard was active on iOS), VoiceOver/TalkBack traversal, Android large text, tablets, restart persistence, and live native weekly publication remain unverified. Weekly recurrence was covered in the SQL fixture rather than a live native flow. These scoped checks do not certify complete native acceptance. No browser validation substitutes for native testing. Visual refinement remains deferred. No attendance handling or notification delivery is claimed.

## Control correction and address-search setup — October 14, 2026

The requested Create session correction aligns Date, Start, End, Repeat, saved-club, and category triggers with text fields through reusable `FieldTrigger`. Native selects use scrollable bottom sheets with selected checkmarks and Done, without measuring the trigger. Date/time opens a full-width native spinner sheet on iOS and native dialogs on Android. Explicit native style objects restore the field and option surfaces in the current runtime.

Club name remains organizer-entered. Club address searches street_address/premise/subpremise predictions restricted to Argentina and biased to Buenos Aires. The authenticated `places-address` Supabase Edge Function is deployed, checks trusted active organizer state, and uses private durable quotas of 30 requests per minute and 300 per UTC day per organizer, plus a 9,000-request monthly total across all users and autocomplete/details operations combined. Loading, no matches, attribution, and manual-entry recovery are implemented. Configuration and billing scope are in `docs/google-address-search.md`. Google billing/API and the server secret are configured; bounded native live checks are recorded below.

Documenter inspected the shared field trigger/select, native date/time, address-field source, setup documentation, and both control reports. Visually reviewed current captures under `.impeccable/review/native/sessions/`: `fields-fixed-ios.png`, `picker-fields-fixed-android.png`, `time-picker-fixed-ios.png`, `select-fixed-ios.png`, and `select-fixed-android.png`. The current Android select capture shows the complete Repeat sheet, including selected Once, available Weekly, and Done.

`controls-fixed-ios.json` records no-write checks with XcodeBuildMCP physical touches: Repeat/Weekly, Categories/All categories, and Date/Start/End open/Done. Earlier AXe automation attempts were inconclusive. `controls-fixed-android.json` records Repeat/Weekly, saved-club name/address population, Date/Start/End open/Cancel, and the friendly unconfigured-search fallback. Devices remain iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17 with Expo Go SDK 54. This correction made no account writes. The parent verification handoff reports 43 unit tests, four Deno authorization/cap tests, and isolated quota tests passing; these automated code tests did not exercise provider calls.

These checks establish the bounded field/menu correction. They do not add software-keyboard, VoiceOver/TalkBack, tablet, large-text, or live Google certification. Earlier verified session flows and their limits remain as recorded above. General visual refinement remains deferred.

## Monthly-cap and Google setup follow-up

Migration `20261014125310_places_monthly_cap.sql` and the deployed proxy enforce the requested app-wide 9,000-request cap. The private monthly counter and `reserve_places_request` RPC reserve a slot atomically before contacting Google, across all users and both search/details requests. Provider failures and timeouts consume their slot without refunds. The counter resets at the start of each America/Los_Angeles calendar month; the existing per-organizer 30/minute and 300/UTC-day limits remain. Exhaustion explains that the monthly limit was reached and invites manual full-address entry.

Parent verification reports 43 unit tests, four Deno tests, and isolated SQL tests for the last permitted request, global cross-user exhaustion, private counters, and previous-month isolation passing. Documenter rechecked migration, error-helper copy, and setup documentation. This follow-up adds no native-layout or fallback-interaction certification beyond the earlier captures/reports.

Google Cloud project `palla-502717` has active billing and Places API (New) enabled. The API-restricted key is stored as the Supabase `GOOGLE_PLACES_API_KEY` secret, outside the client and repository. Applied provider daily quotas are 250 AutocompletePlacesRequest and 250 GetPlaceRequest. The combined 9,000/month Palla proxy cap remains active. This cap covers only requests through the Palla proxy; external key use, other projects, unrelated Google services, and shared billing-account usage require separate controls. It does not guarantee a zero Google bill. See `docs/google-address-search.md` for configuration and billing scope.

## Configured Google native evidence

Live Google evidence (October 14, 2026): visually reviewed `google-search-live-ios.png`, `google-selected-live-ios.png`, `google-search-live-android.png`, and `google-selected-live-android.png` under `.impeccable/review/native/sessions/`, with `google-live-report.json`. Both platforms displayed actual predictions and Google Maps attribution, fetched a formatted address after selection, and replaced the local form value. Android verified exact entry of Monroe 5765. iOS automation inserted Monroe into the existing Córdoba address; the actual Córdoba 1234 prediction was selected and resolved, so exact iOS query replacement is not claimed. Six durable monthly reservations were observed across the checks. No session/profile was saved. Provider exhaustion, offline recovery, and complete native accessibility acceptance are not certified by this bounded live check.

The user explicitly approved the billing upgrade and both 250/day quota values after automatic review blocks. Configuration completed; those approval blockers are resolved. Prior keyboard, screen-reader, large-text, tablet, persistence, and weekly-publication limits remain unchanged.
