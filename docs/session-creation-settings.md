# Session creation settings

Backend and Zod contracts were updated on October 14, 2026. Migration `20261014151114_session_creation_settings.sql` is deployed. The five-step creation form is implemented and uses canonical settings. The user directed implementation now with visual polish later. Migration `20261014162834_session_strict_categories.sql` is also deployed.

## Persisted settings

The following fields are copied from a series into each occurrence. A one-off session also has a series record.

| Column                      | Type                 | Meaning                                            |
| --------------------------- | -------------------- | -------------------------------------------------- |
| visibility                  | text, required       | `public` or `private`                              |
| allowed_categories          | smallint[], nullable | Unique categories 1–8; NULL allows all             |
| participant_gender_policy   | text, required       | `all`, `women_only`, or `men_only`                 |
| strict_category_enforcement | boolean, required    | Defaults false; enforced during waitlist promotion |
| waitlist_enabled            | boolean, required    | Whether players may queue once full                |
| waitlist_promotion_mode     | text, required       | `automatic` or `manual`                            |
| waitlist_capacity           | integer, nullable    | Maximum queued players; NULL means unlimited       |

Category selections can be noncontiguous, such as `[5, 7]`. Empty arrays, duplicates, and values outside 1–8 are rejected. Queue capacity must be 1–32767 when specified. Disabling the waitlist preserves its configured mode/capacity for later reuse; future registration operations must respect the enabled flag.

## Optional timing

| Occurrence column        | Series column                      | Meaning when NULL                                                |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------- |
| registration_opens_at    | registration_opens_minutes_before  | Opens when published                                             |
| registration_closes_at   | registration_closes_minutes_before | Closes at session start                                          |
| cancellation_deadline_at | cancellation_notice_minutes        | No advance player cancellation cutoff; cancellation before start |

Series offsets are whole minutes before each occurrence starts, between 0 and 527040. They are materialized into timestamps for each generated date. Opening must precede closing, with session start as the effective close if no explicit close exists. Closing and cancellation deadlines cannot be after start. These are player participation rules, not restrictions on organizer cancellation of a future session.

Publishing and one/future edits validate and save these settings atomically through `save_organizer_session`. A one-date edit changes only the selected occurrence. A future-scope edit updates eligible occurrences and the series settings defaults; it does not extend the recurrence schedule. Existing scope, ownership, version checks, and retry idempotency remain in place.

## Defaults and compatibility

The new-form defaults are public visibility, all categories, waitlist disabled, automatic promotion, unlimited queue, Everyone, strict category enforcement off, and no optional timing rules. The database and legacy-input defaults remain private so existing sessions are never exposed by this migration.

Existing category ranges are converted into inclusive arrays. Existing deadlines and prices are retained; legacy series hour offsets become minute offsets. Cancelled records and version timestamps are preserved. The old category-bound columns are removed after conversion.

The new form reads and writes canonical category arrays and minute offsets through its settings adapter. Optional rules have real selectable units; minute offsets remain the persisted contract. Legacy range/hour payloads remain compatible, including existing drafts, sparse categories, prices, and optional deadlines. Transient compatibility baselines are stripped before persistence. Canonical settings are validated by Zod and PostgreSQL. A hidden legacy hours limit no longer caps canonical deadlines; their limit is 527040 minutes.

No new payment fields or settings are included. Existing price/payment columns are unchanged.

## Authorization and feature boundaries

All existing RLS and inventory ownership restrictions remain. `public` means intended Explore visibility; public discovery and restricted player-detail access still require their own implementation. Private-link/invitation authorization has not been decided. Visibility metadata alone grants no additional database read access.

Waitlist promotion, player registration/cancellation, and scheduled registration enforcement are configuration contracts for those future operations. This migration does not create participant records, background jobs, or queue promotion workflows.

## Creation UI and verification

The implemented wizard has five steps: Details, Schedule, Players, Waitlist, and Policies. The first two follow the revised Stitch mockups. Players uses eight distinct multi-select category chips, a strict switch only for restricted categories, and gender policy. Waitlist hides mode/capacity controls when disabled. Policies includes visibility and optional timing rules. A separate, unnumbered review screen summarizes all settings and includes external court-arrangement acknowledgement. Fee controls, roster formats/layout, and team balancing are omitted; existing price values remain in the payload.

`npm run verify` passed 54 tests with 13 existing lint warnings, plus TypeScript and formatting. Isolated PostgreSQL save/lifecycle tests cover recurring propagation, optional deadlines, strict-category propagation, one/future edits, stale versions, idempotency, invalid settings, authorization, compatibility, and backfill preservation. These fixtures do not write live accounts.

Native fixture checks exercised all five steps on iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17, with iOS time picker, Android date picker, duration/weekly/category interactions, and waitlist guards. Evidence: `.impeccable/review/native/session-creation/`. Final fixture QA completed: Android verified court-confirmation rejection and the publication callback, and iOS verified the draft-save callback after traversing all five steps. The real creation route loaded on both simulators afterward. This run did not perform live account saves or establish slow-request runtime save behavior, complete accessibility acceptance, or pixel-perfect fidelity. Fresh review found in-flight mutation controls and a hidden legacy deadline cap; both were fixed and the narrow follow-up verdict was resolved/ship.

References: [revised five-step brief](../.impeccable/session-creation-stitch-steps-brief.md), [steps 1–3](../.impeccable/mocks/session-creation-stitch-steps-1-3.png), [steps 4–5](../.impeccable/mocks/session-creation-stitch-steps-4-5.png). The earlier four-step boards are superseded for creation; their lifecycle proposals remain unimplemented.

## Strict category configuration

`strict_category_enforcement` is a required boolean on series and occurrences, default false. Legacy settings may omit it; updates preserve the saved value when omitted. All categories (`allowed_categories = NULL`) force it false. With a restricted list and strict enforcement on, future joining and promotion must require a matching numbered profile category; beginner/unknown profiles need a matching category before joining. With enforcement off, selected categories describe the target audience. Profile categories remain self-reported. This release stores and validates the flag; registration and promotion enforcement are future work.

## Normalized series and lifecycle

Migration `20261014154329_normalized_session_series.sql` adds typed published template columns: venue_id, title, description, court_label, capacity, recurrence (`once`/`weekly`), timezone, weekday (ISO 1–7), local_start_time, duration_minutes, starts_on, and ends_on. Drafts may leave these columns NULL; publishing requires a complete template. Description/court remain optional. Scheduling is still bounded to 52 occurrences in Buenos Aires; an open-ended generation worker is not implemented. `draft_input` remains the resumable draft payload and historical form input, not the authoritative published template.

Series status is now `draft | active | paused | ended`. Existing published series become active without changing version timestamps. Lifecycle transitions are draft→active, active→paused/ended, and paused→active/ended. Only weekly series can pause. Ended is terminal; neither ending nor pausing cancels existing occurrences. The server does not automatically mark exhausted series ended yet.

`set_organizer_series_status(id, status, expected_version)` locks the owner's series, validates the version/transition and returns the updated record. It is SECURITY INVOKER, authenticated-only, and uses trusted organizer state plus RLS. An active parent is required when inserting new occurrences; existing future occurrences can still be edited/cancelled under paused or ended parents. Creation currently generates all bounded dates upfront, so pause affects permission to create additional dates, not those already published. There is no automatic generator to stop/resume, and no additional-dates UI in this change.

Template defaults are copied to occurrences to preserve individual exceptions and history. A one-date edit leaves the series template unchanged. A future-scope edit updates eligible occurrences and the template's content/settings/local time and duration. Recurrence identity and original date bounds remain fixed; edits never extend the series implicitly. A dedicated template-only editor is proposed in the mockup and is not implemented yet.

Both series and occurrences now have `participant_gender_policy`: `all | women_only | men_only`, default `all`. Form labels are Everyone, Women only, Men only. Everyone does not require mixed-gender pairs. The backend stores and validates the policy; eligibility enforcement belongs to the future joining flow. Profiles currently do not collect gender. Legacy draft settings may omit it, and legacy publication defaults to Everyone.

The earlier [Players, Review, and series lifecycle](../.impeccable/mocks/session-creation-settings-v2.png) proposal remains a lifecycle reference; creation uses the revised five-step form. The pause confirmation illustrated beneath the paused screen is a separate pre-transition overlay; it must not appear after pausing.

Verification includes rollback-only `normalized_session_series.sql` and `normalized_series_backfill.sql`: pause/resume/end, rejecting one-off pause and terminal resume, stale versions, paused-parent insertion denial, owner isolation, gender propagation/scope, preserved historical exceptions and versions. Remote checks confirmed active normalized series, Everyone defaults, unchanged cancelled/private occurrences, RLS, and anonymous RPC denial. Security advisories are unchanged: existing private Places quota default-deny tables, Places quota SECURITY DEFINER RPCs, and disabled leaked-password protection. References: [private RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Final verification for the normalized-series revision: `npm run verify` passed 53 tests, TypeScript, formatting, and lint with the same 13 pre-existing warnings. Original organizer CRUD SQL tests, updated settings/lifecycle tests, and both historical backfill suites passed on the latest isolated schema. No live account writes were used for these tests. Those earlier tests preceded the five-step UI; current native evidence and limits are described above.

Review sits outside the five-step progress indicator. Each summary section returns to its corresponding form step via Edit, preserving values and offering Return to review after validation. Publish/Save changes and session cancellation appear only on review.

Schedule redesign: dates precede the Time card. Start and end times use matching soft fields and Geist SemiBold labels; duration is read-only and calculated from the two values. Editing start does not shift end. End must be later on the same day. Weekly weekday is derived from the first date; one-time sessions omit the last date. Native pickers use Buenos Aires timezone.
