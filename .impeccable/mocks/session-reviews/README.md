# Session reviews — UI proposal

Generated with the built-in image-generation tool on October 18, 2026. Design proposals only; no review UI, database schema, or notification behavior has been implemented. Example people, dates, ratings and counts are illustrative.

- `01-write-review.png`: past-session invitation, one-rating review form with all sixteen optional tags, public review and author floating actions.
- `02-review-actions.png`: edit/republish, destructive deletion confirmation, host-only report form and feedback sample.
- `03-ratings-notifications.png`: host public review display, separate player and organizer notification settings. The corrected board removes the empty-state sample from the populated profile and uses a compact title-only toast.

## Prompt set / visual direction

Create high-fidelity Palla native-mobile mockups using the supplied player-profile proposal and actual native Notifications screenshot as visual references only. Preserve Stitch composition and current design rules: near-white lilac canvas, white thin-bordered panels, dark sans typography, lilac same-hue icon tiles, neon rectangular primary actions with dark text, red destructive actions, pill tags and circular icon controls. Shared production components and current tokens remain authoritative for exact geometry, toasts, input fills and accessibility; generated raster images illustrate flow rather than native acceptance.

Board 1: show past-session detail with completed status, an optional review invitation and its 14-day deadline; show the scrollable form with one five-star score, optional grouped tags (up to four total), optional 2,000-character comment, public-identity disclosure and Post review action. Show published reviews and author-only Edit/Delete floating menu. Opposite tags cannot both be selected. No attendance checkbox or attendance side effects.

Board 2: show editing a hidden review with notice that saving republishes it, an editing deadline and Save changes action; show the deletion confirmation explaining public removal and inability to submit a replacement; show a host-only report sheet with reasons, optional details, and explanation that reporting does not automatically hide the review. Reporting is limited to the responsible host, once per review. Editing must still expose the same rating/tag/comment fields as creation; the condensed board's Change tags row represents form content, not a separately approved navigation step.

Board 3: show a public host profile and ratings across its sessions, with reviewer identity and occurrence context. Show player Notifications with Chat messages and Reminders to review sessions; show organizer Notifications with Chat messages and Reviews of your sessions. No role selector or unrelated future settings. Corrective edit: remove the empty-state sample from the populated host profile and make the title-only toast a compact charcoal capsule.

## Agreed tags

- Friendly host / Unfriendly host
- Quick to respond / Hard to reach
- Well organized / Disorganized
- Started on time / Started late
- Plenty of playing time / Too much waiting
- Good court conditions / Court issues
- Good level match / Level mismatch
- Matched the description / Different from advertised

## Behavior carried into the proposal

Reviews open after automatic completion at the scheduled end and are available to confirmed registrants without changing attendance. Submission/editing closes fourteen days after that scheduled end. Public reviews show profile name/photo immediately. Only published reviews contribute to averages; each occurrence's review counts equally, including repeated reviewers across different occurrences. Authors can soft-delete after the editing window; no replacement review is allowed. Editing a hidden review within the window republishes it while retaining moderation/report history. No historical-session handling is needed. One invitation is due an hour after the session ends and one host alert on first publication, with fresh preference/eligibility checks and duplicate protection. Role-specific settings will use a database notification-type catalog plus account/type preference overrides.

Mockups are awaiting user review. Native implementation and testing will follow design approval; no browser/native validation is claimed for these images.

## Review-card reference revision

`04-review-cards-reference.png` supersedes review-card styling in boards 01 and 03. User supplied the Stitch review-list reference on October 18: avatar/name/secondary metadata at left, orange stars in the same header row at right, generously spaced readable review body, white lightly outlined card on lilac canvas. Add soft lilac pill tags below the body. Orange stars explicitly replace the initial proposal's charcoal star treatment for displayed reviews. Photos use the existing initials fallback when unavailable. Mock metadata uses Palla category labels and dates rather than unavailable played-match counts or decimal skill levels; all sample content remains illustrative. Rating, name and tags should wrap responsively in implementation rather than collide.

Generated with the built-in image-generation tool using the supplied screenshot as the sole visual reference. Prompt: recreate a clean Palla portrait review list closely matching the reference; use two content-sized cards with circular MR/ES initials avatars, reviewer names, category/date metadata, five/four orange stars at top right, readable realistic review text and three agreed lilac tags below each body. Preserve existing palette and card styling; omit fabricated attendance claims, decimal player levels, match statistics and unrelated controls. This is still a design proposal, not implementation or native validation.

## Current scope: writing a review only

User deferred where/how reviews are displayed. `05-write-review-focused.png` is the current proposal and shows initial/ready states of the SAME scrollable form, not two steps. It contains one orange star rating, sixteen optional tags grouped by session (ten) and host (six), up to four selections with mutually exclusive opposite pairs, optional 2,000-character comment, public identity disclosure, fourteen-day deadline and rectangular Post review action. The empty form disables Post review until a rating is chosen; tags/comment are optional. The extended frames expose the full scroll content, not a requirement that the form fit one native viewport. All public-review, host-profile, reporting and notification-setting mockups above are deferred explorations rather than current build scope. No production implementation or database changes have been made.

Generated with the built-in image-generation tool. Complete prompt: `05-write-review-focused.prompt.txt`.

## Two-step alternative

`06-write-review-two-steps.png` responds to feedback that the single-page form felt too long. Two standard-height frames show step 1 (one required rating and ten optional session tags) and step 2 (six optional host tags and optional comment). The four-tag limit applies across both steps; Back preserves selections. Step 1 continues; step 2 posts directly without another confirmation step. Deadline/public-name disclosure are retained. Generated with the built-in image tool; the final correction makes all chips pill-shaped and fills both progress segments on step 2. The primary actions retain rectangular corners. No app implementation or native validation has been performed. This alternative awaits approval.

## Rating and comment first

`07-write-review-rating-first.png` is the latest two-step proposal: step 1 places the single star rating and optional 2,000-character review text together; step 2 places all sixteen optional session/host tags together, with one four-tag total limit. Continue leads to optional tags, Back preserves all input, and Post review submits directly from step 2 even if no tags were selected. The deadline is visible and action footers align at the bottom. Generated with the built-in image tool from the preceding two-step board as a style reference. Full prompt: `07-write-review-rating-first.prompt.txt`. This supersedes the earlier session-first / host-and-comment grouping. Mockups only; awaiting user review.

## Simplified rating screen — three alternatives

`08-simple-rating-options.png` is the current proposal after the user removed manual tags to shorten the flow. Only one required rating and one optional 2,000-character comment remain, with direct Post review, public-name/photo disclosure and fourteen-day deadline. No multi-step wizard or progress indicator. Options: A clean unboxed page, B a content-sized session/form panel, C a focused bottom sheet over session detail. All show identical data and selected rating to compare layout fairly. Future derived themes or AI summaries are deferred and not part of the review form or current implementation scope. Earlier tag and two-step proposals above are historical explorations, not current requirements.

Generated with the built-in image tool, using the previous board as a Palla/Stitch style reference. Full prompt: `08-simple-rating-options.prompt.txt`. Mockups only; awaiting selection, no implementation or native testing.

## In-app review notifications

`09-in-app-review-notifications.png` responds to the October 19 request for the bell destination, which is currently a placeholder despite chat push implementation. The new mockup proposes a player review-reminder inbox, a host new-review inbox, and a reminder tap opening the rating bottom sheet directly OVER THE PLAYER INBOX. It does not depend on a public session view. Shared list affordances shown: All/Unread filter pills, read/unread distinction, Mark all as read, timestamps and session context; an acted-on review reminder can show Reviewed. These inbox/read-state affordances are proposed, not implemented or previously approved backend rules. Push preferences do not remove in-app items. Host review-display destination remains deferred and is not mocked here. The rating sheet remains one required score plus optional comment; no tags or wizard steps.

Created with built-in image generation from the latest simple-rating board as the style reference. Complete prompt: `09-in-app-review-notifications.prompt.txt`. Example data only; no production notification/review/schema changes or native validation.

## Implementation — October 19, 2026

The approved one-rating/optional-comment sheet and role-specific in-app review inbox are now implemented. Earlier manual-tag and multi-step concepts remain superseded. The current code uses existing essential neon buttons and shared fields/toasts, with fixed sheet controls and a scrollable body. Eligibility, automatic completion, fourteen-day editing, deletion, host-only reports/moderation, notification deduplication and catalog-driven settings are enforced in the backend. See `docs/session-reviews.md` and `docs/native-testing.md` for behavior, tests and remaining live-device push activation. Public review lists/placement remain deferred.
