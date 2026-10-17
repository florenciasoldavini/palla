# Profile overview and account menu

Both role tabs now open the same profile overview component, with a white summary card and a divided Preferences & account menu based on the approved Stitch references. The card shows the stored profile image (initials on missing/failed images), name, role and Edit profile. The player card shows the self-reported Argentine category, beginner status or unknown category; a stored not-playing answer does not fabricate a numbered category. The organizer card uses its organizer display name and optional description. No PRO, verification, ratings or location claims are added.

The shared menu contains Notifications, Account & security, Privacy & blocked users, Payment methods, Help & support, About Palla and Log out. Existing role navigation remains intact. Profile cards size to content and scroll above the tab bar. At larger text sizes the edit action stacks under the avatar and rows grow to fit their text.

Edit profile is a separate authenticated `/account/edit-profile` route. Existing personal name, phone, avatar and player-category forms are preserved; category controls are omitted in organizer mode without modifying stored category data. Organizer mode also has a separate Organizer profile form for display name and description, with its own save action so personal and hosting details have explicit independent save outcomes. `/account/security` preserves password and linked sign-in methods. Dirty forms prompt before leaving, including native back navigation; pending saves block leaving. Passwords were not changed during this UI test.

Organizer fields already exist in `public.organizers`; no migration is required. New hooks, services and repository adapters read/write existing `display_name` and `bio` columns using TanStack Query, RHF/Zod and existing owner/status RLS. Successful saves update the organizer query cache. Failed saves retain input. Refetches preserve dirty organizer input. The UI fetches no privileged user data and cannot update organizer status. Identity fetching now goes through the service/repository boundary instead of calling Supabase inside the screen.

Unimplemented menu destinations are clear placeholder pages. No notification preference, payment instrument, support submission or privacy setting is changed by opening them. Privacy copy points to existing block controls in Messages. About shows the real app version; legal documents remain pending. Log out uses a native confirmation and the existing auth/outbox/push cleanup flow.

## Verification

`npm run verify` passed 136 tests, TypeScript, formatting and lint with pre-existing warnings. Native checks used iPhone 17 Pro / iOS 26.5 and Pixel 8 / Android 17 API 37, with actual signed-in accounts. Both organizer profile cards, menu scrolling and destinations, profile editing, linked identities and logout cancellation were exercised. Temporary labelled organizer descriptions were saved through each app and displayed in the profile card, then restored to their original null values using a conditional trusted database update. Hosted inspection confirmed both original bios restored. A rollback-only authenticated SQL check confirmed own organizer read/update and denial of other-organizer reads/updates.

Player-card/native category editing and unsaved-change/discard behavior were checked without saving personal changes. iOS accessibility-medium and Android enlarged text checks are recorded in `docs/native-testing.md`; screenshots are local ignored QA evidence. Native avatar rendering was checked with existing profile images; selecting/uploading a replacement avatar, changing passwords and completing actual logout were not performed on the user's accounts.

An existing iOS startup assertion from a native-stack status-bar setting was fixed by restricting that setting to Android. iOS retains its existing Expo status-bar behavior. No native rebuild is needed for this UI update.

## Optional player bio

Player profiles now have an optional personal bio, independent from `organizers.bio`. Edit profile in player mode exposes an About me multiline field with a 500-character limit. The card shows the bio only when non-empty; no decorative empty-bio block is added. Organizer editing preserves any personal bio and continues using the separate hosting description.

Migration `20261017014453_player_profile_bio.sql` adds nullable `profiles.bio` with a database length constraint and authenticated column-level UPDATE permission. Existing owner-only profile RLS applies; this does not introduce public profile access. Blank input is trimmed to null. The auth/profile adapter includes the saved bio and defaults older cached records to null. Tests cover the limit, whitespace handling, preserving an unspecified bio during unrelated updates, and account-model mapping. Hosted rollback-only `supabase/tests/player_profile_bio.sql` verifies owner save/clear, cross-account denial, the database limit and isolation from the organizer description without modifying real accounts.

## Profile photo management

Edit profile uses an explicit Add/Change photo control and a separate destructive Remove action. Removal asks for confirmation and stays local until Save changes; leaving the screen offers the existing discard confirmation. The photo is shared across player and organizer modes. The editor groups photo controls, personal details, and playing category, uses the shared labels/placeholders, and keeps the essential save action neon. Organizer name and description remain a separate form below personal details.

Photos use the public `user-avatars` bucket (5 MB maximum; JPEG, PNG, WebP, HEIC/HEIF). Every upload has a unique `users/<auth-user-id>/avatar/<uuid>.<extension>` path. Native uploads use an ArrayBuffer rather than a React Native Blob. Storage policies permit only uploads within the authenticated owner's folder and prevent deleting the photo currently referenced by that profile. No overwrite policy is granted.

After a successful profile save, the editor deletes the previous uploaded photo. The repository verifies both the project/bucket/owner path and the saved profile before deletion. Google or other externally hosted images are never deleted. Cleanup failures show a saved-profile notice and a retry action; the pending retry list currently lives in the open editor, so it does not survive closing the screen. Interrupted/failed saves can leave an unreferenced upload; a scheduled orphan sweep is not part of this change. Existing public CDN caches may retain a deleted image until their cache expires.

Verification covers avatar path ownership, protecting the active photo, replacement/removal cleanup, cleanup failures, native byte uploads and size rejection. `supabase/tests/profile_avatar_storage.sql` uses synthetic metadata in a rolled-back transaction to test upload/delete ownership and active-photo protection without touching real files.
