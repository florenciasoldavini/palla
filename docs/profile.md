# Profile overview and account menu

Both role tabs now open the same profile overview component, with a white summary card and a divided Preferences & account menu based on the approved Stitch references. The card shows the stored profile image (initials on missing/failed images), name, role and Edit profile. The player card shows the self-reported Argentine category, beginner status or unknown category; a stored not-playing answer does not fabricate a numbered category. Both role cards use the same user name and optional bio. No PRO, verification, ratings or location claims are added.

The shared menu contains Notifications, Account & security, Privacy & blocked users, Payment methods, Help & support, About Palla and Log out. Existing role navigation remains intact. Profile cards size to content and scroll above the tab bar. At larger text sizes the edit action stacks under the avatar and rows grow to fit their text.

Edit profile is a separate authenticated `/account/edit-profile` route. It has one Save changes action. Basic information contains shared name, phone, photo and About me. Player mode also includes Player profile for category, dominant hand and court side. Organizer mode omits those playing controls without changing their stored values; there is no separate organizer name or description editor. `/account/security` preserves password and linked sign-in methods. Dirty forms prompt before leaving, including native back navigation; pending saves block leaving. Identity fetching goes through the service/repository boundary.

Unimplemented menu destinations are clear placeholder pages. No notification preference, payment instrument, support submission or privacy setting is changed by opening them. Privacy copy points to existing block controls in Messages. About shows the real app version; legal documents remain pending. Log out uses a native confirmation and the existing auth/outbox/push cleanup flow.

## Verification

`npm run verify` passes 150 tests, TypeScript, formatting and lint with pre-existing warnings. Native evidence uses iPhone 17 Pro / iOS 26.5 and Pixel 8 / Android 17 API 37. Both organizer editors saved a labelled temporary shared bio; both player and organizer overviews displayed it. The original empty bios were restored using a conditional update, confirmed in the database, and reloaded on both devices. Player trait save/display, owner-only SQL checks, larger text, keyboard focus and unsaved changes are recorded in `docs/native-testing.md`. Historical runs are dated there; they are not claims that removed organizer-specific forms still exist.

An existing iOS startup assertion from a native-stack status-bar setting was fixed by restricting that setting to Android. iOS retains its existing Expo status-bar behavior. No native rebuild is needed for these UI changes.

## Shared user bio

The optional user bio is stored in `profiles.bio` and shared by both modes. About me is a multiline Basic information field with a 500-character limit. Both profile cards show it only when non-empty; no empty-bio block is added. There is no separate hosting description in the UI.

Migration `20261017014453_player_profile_bio.sql` adds nullable `profiles.bio` with a database length constraint and authenticated column-level UPDATE permission. Existing owner-only profile RLS applies; this does not introduce public profile access. Blank input is trimmed to null. The auth/profile adapter includes the saved bio and defaults older cached records to null. Tests cover the limit, whitespace handling, preserving an unspecified bio during unrelated updates, and account-model mapping. Hosted rollback-only `supabase/tests/player_profile_bio.sql` verifies owner save/clear, cross-account denial, the database limit and isolation from the organizer description without modifying real accounts.

## Profile photo management

Edit profile uses an explicit Add/Change photo control and a separate destructive Remove action. Removal asks for confirmation and stays local until Save changes; leaving the screen offers the existing discard confirmation. The photo is shared across player and organizer modes. The editor groups photo controls, personal details, and playing category, uses the shared labels/placeholders, and keeps the essential save action neon. Name and bio are shared across modes.

Photos use the public `user-avatars` bucket (5 MB maximum; JPEG, PNG, WebP, HEIC/HEIF). Every upload has a unique `users/<auth-user-id>/avatar/<uuid>.<extension>` path. Native uploads use an ArrayBuffer rather than a React Native Blob. Storage policies permit only uploads within the authenticated owner's folder and prevent deleting the photo currently referenced by that profile. No overwrite policy is granted.

After a successful profile save, the editor deletes the previous uploaded photo. The repository verifies both the project/bucket/owner path and the saved profile before deletion. Google or other externally hosted images are never deleted. Cleanup failures show a saved-profile notice and a retry action; the pending retry list currently lives in the open editor, so it does not survive closing the screen. Interrupted/failed saves can leave an unreferenced upload; a scheduled orphan sweep is not part of this change. Existing public CDN caches may retain a deleted image until their cache expires.

Verification covers avatar path ownership, protecting the active photo, replacement/removal cleanup, cleanup failures, native byte uploads and size rejection. `supabase/tests/profile_avatar_storage.sql` uses synthetic metadata in a rolled-back transaction to test upload/delete ownership and active-photo protection without touching real files.

## Player profile identity

The player editor is one scrollable form with two cards: **Basic information** (shared photo, first/last name, phone, bio) and **Player profile** (existing playing category, optional dominant hand, optional preferred court side). One essential Save changes button saves both. Photo replacement/removal and unsaved-change confirmation are preserved. Organizer editing uses Basic information only; it does not overwrite the player traits.

`profiles.dominant_hand` accepts `right`, `left`, or null. `profiles.preferred_court_side` accepts `left`, `right`, `flexible`, or null. Both default to null for existing accounts and remain optional. No ambidextrous option or Clear selection control is exposed. Court labels are Left (Revés), Right (Drive), and Flexible (Both sides); these describe court position independently of dominant hand. Database checks and the owner-only profile policies enforce values and ownership. Defaults in the profile parser also support older cached records without these properties.

Player Specifications shows the existing category and only the hand/side cards that contain saved values. Category remains self-reported; beginner, unknown and not-playing states are retained. No ratings, verification or statistics are implied. Profile information, auth mapping, form validation and persistence carry both new fields; basic-only updates leave them untouched. Larger text stacks court choices and specification cards, while text and controls remain scrollable.

## Shared identity across modes

The user has one name, photo and optional 500-character bio. Both player and organizer overview cards read `profiles.first_name`, `last_name`, `avatar_url` and `bio` through the shared user model. About me now belongs to Basic information in both modes. Player profile contains category, court side and dominant hand only. Each editor has one Save changes action; organizer mode updates the shared bio while preserving player traits.

The separate organizer-name/description form, mutation and profile-fetch path have been removed. Organizer profile cards no longer need a second query or choose an organizer-specific display name. Existing `organizers.display_name` and `organizers.bio` columns remain legacy compatibility data for the onboarding record; the profile UI does not read or write them. An aggregate check before consolidation found no stored organizer bios, so no description migration was needed and no content was discarded.
