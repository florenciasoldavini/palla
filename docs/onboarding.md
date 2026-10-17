# Account creation and onboarding

## Confirmed scope

Account creation supports email/password and Google through Supabase Auth. Email signup must confirm the address before authenticated onboarding. Existing accounts without completed profiles will enter the same onboarding flow. Credentials and email stay in Auth.

After verification, collect a starting mode (player or organizer), a required first name, and an optional last name. Players provide a playing-category answer in a third step. Organizers finish after the name step without a playing-category question. Defer photo and phone number to profile editing. Both modes use the same account. Organizer access is immediate and self-service, as confirmed October 13, 2026; there is no approval queue.

## Data foundation implemented

`profiles.id` references `auth.users.id`. The profile stores identity, self-reported Argentine playing category and category status, a `preferred_mode` navigation preference, and `onboarding_completed_at`. Client inserts and updates are limited to allowed columns and the caller's row. Database timestamps and welcome-email delivery state are protected.

`organizers.profile_id` references `profiles.id`. A completed account can create its own active organizer record. Clients can edit display name and bio but cannot edit administrative status, approval metadata, or delete a suspended record to restore access. No separate player table is required.

`complete_onboarding(first_name, last_name, mode, category_status, playing_category)` is an invoker-rights RPC. It updates the caller's profile and creates organizer capability in one transaction. Repeated submissions do not create duplicates. A suspended organizer can still use player mode but cannot restore organizer access through onboarding.

The migration has been applied to the connected Palla project. Authorization tests in `supabase/tests/onboarding.sql` passed in an isolated local PostgreSQL database using simulated Supabase roles and `auth.uid()`. Remote read-only inspection confirmed RLS on both tables. No remote test accounts were created.

## UI implementation

The user selected layout A: stacked radio panels with both choices visible. The player flow has three steps: choose a mode, enter a name, then answer the playing-category question. Organizer flow has two steps: choose organizer, enter a name, then Start organizing. The user approved category mockup C: guided choice with an expandable category selector, beginner and unknown answers. Organizer onboarding skips this screen. It preserves the current light-only palette, fonts, and shared controls. Errors stay inline; choices expose accessible selection state; draft names survive back navigation within the form. Android Back moves to the preceding step. Category and name drafts survive back navigation.

The legacy `users` auth adapter has been replaced with `profiles`. TanStack Query owns the loaded profile and organizer capability. Incomplete accounts enter `/onboarding`; completed accounts enter `/discover` or `/dashboard` according to their starting mode and active organizer capability. Organizers can still use player mode. Profile settings include a starting-mode change action. Query failures have retry/sign-out actions; profile loading has an explicit state.

Email signup and Google sign-in are enabled in the connected project, and email confirmation is required. No real signup/verification or Google identity handoff was executed during automated checks. The retained welcome-email function source now uses profiles, but it is not deployed or automatically invoked; verification emails remain Supabase Auth's responsibility.

The development-only `/onboarding-preview` renders the same form and simulates completion without account writes. Production redirects that route to sign-in. The development-only `?step=category` fixture starts at category selection with a synthetic 6ta player; it never changes an account.

Earlier browser checks are historical evidence only. Current acceptance uses native simulators; see native-testing.md for the exact scope.

### Approved category surface

The durable direction is the right-hand **C · Guided choice** in [the category comparison](../.impeccable/mocks/onboarding-category-options.png); its [generation sidecar](../.impeccable/mocks/onboarding-category-options.png.json) records the approval. This extends the incumbent [design system](../DESIGN.md), rather than introducing a new palette, typography ramp, or visual identity.

Keep the answer choices stacked. White unselected panels become pale lime with an olive outline and checked radio when selected. The known-category panel reveals a white expandable selector ordered 8va through 1ra and the self-reported caption. Beginner and unknown remain distinct answers; organizer onboarding skips this question. Profile editing reuses `CategoryChoice` so the answer vocabulary and visual states stay consistent.

The implementation uses shared `AppText` and `AppButton`, semantic atom colors and spacing, and the existing `volt[50]` selected surface. Category rows retain at least 48 logical units of touch height; the selector and answer panels can expand with text. The category step retains the existing wordmark, step count, Back action, scrolling form, lime main action, and Sign out. These are surface decisions, not new global tokens.

Native player preview flows have passed on iOS and Android; see [native testing](native-testing.md) for evidence and limits. Organizer onboarding now omits this category surface. Profile editing, large text, and full screen-reader behavior still need native acceptance.

## Google name prefill and native acceptance

Google names come from explicit first/given and last/family name fields in Auth user metadata or Google identity data. If only a full name is provided, the first word prefills first name and the remaining words prefill last name; both stay editable. Missing fields remain editable rather than being populated from the email address. Only missing names in incomplete profiles are backfilled. Existing user-entered names and completed profiles are preserved.

UI and real account-flow acceptance must be checked in iOS Simulator and Android Emulator. The earlier browser captures are historical web-only evidence and do not satisfy this requirement. Real Google identity handoff and full native flow checks remain pending. The Android mode-selection preview received a native launch/layout smoke check; the iOS license blocker is resolved. See [native testing](native-testing.md) for the exact evidence and limits.

## Argentine categories

Store `playing_category` as an integer 1–8 only for `category_status = known`. Store null for `beginner`, `unknown`, or `not_playing`. Lower category numbers mean stronger play. Beginners are not automatically assigned 8va or 7ma. These are self-reported club/tournament categories, not federation verification. Profile editing uses the same guided choice.

APA's amateur regulations cover 2da–6ta and promotional 7ma; local Buenos Aires circuits also offer 8va. Offer 8va–1ra as a practical local vocabulary, without claiming identical classification across clubs. Sources: [APA regulations](https://padel.org.ar/wp-content/uploads/2025/02/REGLAMENTO-DEPORTIVO-AMATEUR-APA.pdf), [Pilar tournament listing](https://onpadel.app/es/tournaments/on-fire-padel-tour-8va-damas).

Migration `20261013192205_player_categories.sql` adds the category fields and updates the atomic onboarding RPC. The old decimal `playing_level` is retained as legacy data without conversion. Future session-category filtering must use Argentine categories, not the provisional decimal scale.

### Organizer category omission

Organizer onboarding submits null category arguments to the existing RPC. It preserves any existing category; a fresh profile keeps its default unknown status and null numbered category. This records no self-reported playing answer and does not assign `not_playing`. No database migration is needed. Returning to mode selection and choosing player still requires an explicit playing-category answer.

The placeholder “Help me choose” action was removed from onboarding and profile editing. A future guide must help users assess their level before this action returns; users who do not know their category can select “Not sure yet”.
