# Private realtime chat

The first chat release supports private text conversations between an organizer and a player. Organizers start chats from the session’s active roster. Both roles can open the Messages bottom tab, read, search, filter unread conversations, and reply. Messages sits before Profile as the fourth tab and shows a live unread badge. The header keeps the notification bell. The legacy `/messages` entry redirects to the appropriate role’s Messages tab.

Registration is deliberately **not** a backend prerequisite. Future interfaces can let players ask organizers questions before joining. Authentication, trusted active organizer status, completed recipient onboarding, and participant authorization are still required. The backend never trusts a supplied sender identity.

## Database

Migration: `20261015002829_realtime_chat.sql`.

| Table                | Fields                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat_conversations` | `id`, `organizer_id`, `player_id`, nullable `source_session_id`, `created_at`                                                                                    |
| `chat_messages`      | client-generated UUID `id`, `conversation_id`, server-derived `sender_id`, generated bigint `sequence`, trimmed `body` (1–4,000 characters), server `created_at` |
| `chat_reads`         | composite key `conversation_id` + `profile_id`, monotonic `through_sequence`, `updated_at`                                                                       |

`chat_deliveries` adds one recipient acknowledgment per message: `message_id` (PK/FK), server-derived `recipient_id`, and server `delivered_at`. Clients cannot insert/update these rows directly.

There is one conversation per organizer/player pair, shared across sessions. The optional source session records the original entry point; displayed context is derived from current shared registrations (see October 16 below); it does not create separate chats for each session. There are no group or session-wide conversations. Profiles are not duplicated into chat tables.

Messages use a sequence cursor, represented as a decimal **string** in TypeScript to preserve bigint precision. History is fetched in pages of 50, newest page first and each page ordered chronologically. Scrolling near the top automatically fetches the next older page; normal browsing has no load-more button. The inbox fetches 30 conversations per page and automatically loads the next page when scrolling near the bottom. Search and All/Unread counts cover the full inbox, not just loaded rows.

RPCs:

- `start_chat`: get or create a pair. Either participant can call it without registration. Only the owning organizer may attach a source session. An existing pair without context can acquire its first source session later; later calls preserve that original source.
- `send_chat_message`: validates membership, active organizer, body and a 30-message/minute sender limit. The server chooses identity and timestamp. Retrying the same message UUID and body returns the existing message; mismatched reuse is rejected. Sender and conversation transaction locks serialize rate checks and durable sequence ordering.
- `get_chat_messages`: authorized cursor pagination.
- `list_chat_conversations`: participant-scoped summaries, minimal other-profile fields, latest message, optional session context and unread count.
- `acknowledge_chat_deliveries`: idempotently acknowledges 1–100 distinct incoming messages actually received by the current participant. The server derives recipient and timestamp; self-acknowledgment and unrelated IDs are rejected.
- `mark_chat_read`: validates a real message cursor within the conversation and advances the current participant’s cursor monotonically.

All tables have RLS. Authenticated clients can read only participating conversations/messages and the two participants’ read positions within those conversations. Direct client writes and anonymous access are denied. Public invoker RPC wrappers delegate to private definer implementations with an empty search path and explicitly restricted grants.

## Realtime and client state

`chat_messages`, `chat_reads` and `chat_deliveries` publish Postgres Changes. RLS scopes delivery. Events invalidate actor-scoped TanStack Query keys; the client refetches authorized RPC results rather than accepting unvalidated event payloads as application state. Subscribing and returning to the foreground refresh queries to recover gaps. A 20-second polling fallback also refreshes active queries. Channels are removed on background, auth change and unmount. Sign-out clears the shared query cache.

Opening a focused foreground conversation advances the read position through its newest loaded message. This supports inbox unread counts and sender-visible read receipts. A grey single check beside an outgoing message means the database saved it. Two grey checks mean a foreground recipient client fetched that message. Two green checks mean the recipient’s read position is at or beyond that message. The client compares bigint sequence strings without converting them to JavaScript numbers. Delivery is acknowledged per actual message, not inferred from a latest-message cursor. Fetching an inbox preview acknowledges that preview only; fetching history acknowledges its received incoming messages. An offline/closed client cannot acknowledge until it syncs again. This is an app acknowledgment, not push delivery. A reconnect notice explains delayed delivery.

Sending first saves the message into a durable, account-scoped local outbox. Waiting messages survive leaving the screen and restarting the app. Temporary connection failures retry automatically with the same UUID; rejected messages retain Retry and Remove controls. Saved messages persist in Supabase. See the persistence details below.

## Boundaries

Text only for now: no attachments, group messaging, push notifications, blocking/reporting or mute/archive controls. Message editing/deletion and personal chat deletion are implemented below. The roster is the only current start-chat entry point. The waitlist has no start-chat control yet.

## Verification

`supabase/tests/chat.sql` runs in an isolated local PostgreSQL fixture and rolls back its test accounts. It covers authorization, intruder isolation, anonymous/direct-write denial, no-registration initiation, duplicate retry behavior, rate limiting, read cursors, paging and suspended organizers. Unit tests cover input validation, identity spoofing and bigint-safe merge/deduplication.

The development-only native route `/sessions-preview/chat?nativeQa=1` uses the real presentation components with explicitly labelled synthetic data. `QA fail` simulates a failed send; Retry succeeds locally. It makes no account changes and cannot prove live realtime delivery. The `role=player` query changes the participant viewpoint. Record native device checks separately in `docs/native-testing.md`.

Live follow-up on 2026-10-15 verified two-way native sends, inbox/header unread counts, read-position updates, database persistence with no duplicates, and missed-message recovery after Android restart. Four explicitly authorized QA messages remain in the two test accounts. Conversation setup used `start_chat` with the organizer’s authenticated role because no real roster entry was available; the organizer roster initiation button remains outside that live pass. See `docs/native-testing.md` for scope and remaining limits.

## Read receipt implementation

Migration `20261015120326_chat_read_receipts.sql` changes read-position SELECT authorization to conversation participants and adds nullable decimal-string `other_read_sequence` to conversation summaries. Unrelated accounts cannot see either cursor. Direct writes remain denied, and `mark_chat_read` still derives the reader from `auth.uid()`; a caller cannot alter the peer’s cursor. The existing table is reused, without a per-message read flag.

Realtime listens for both participants’ read changes under RLS, invalidating authorized conversation summaries. Conversation details also refresh every 20 seconds as a fallback. Pending and failed sends keep their existing spinner/retry UI; they never show read checks. The UI uses Lucide Check / CheckCheck and the existing Palla accent green. Read receipts follow the established rule that opening a focused foreground conversation marks its latest loaded messages read; this is not gaze tracking or a guarantee that every bubble was individually viewed. Delivery acknowledgment was added in the follow-up below. No read-privacy toggle is implemented.

Live native QA verified single-grey → double-blue transitions in both directions between iOS and Android, without refreshing the sender. Two further clearly labelled QA messages remain in the authorized test accounts. SQL regression tests cover peer cursor visibility, unrelated-account denial, monotonic positions and denial of direct peer updates. Bigint boundary unit tests preserve precision. All 75 tests passed.

## Typing, delivery and session context — October 15 follow-up

Migration `20261015122421_chat_delivery_typing_context.sql` adds participant-scoped delivery storage/RPC, realtime publication, private typing-channel policies, and first-source-session attachment. No extra session summary endpoint or screen is introduced.

Typing uses a private Supabase Broadcast channel per conversation, authorized against trusted conversation membership through RLS on `realtime.messages`. Payloads contain only an actor ID and a boolean, never draft text. The client accepts hints only from the expected peer. Hints are throttled to one active update per 1.5 seconds, stop after 2.5 seconds idle or on send/blur/leave/background, and expire on the receiver after 5 seconds if a stop event is lost. Reconnect and auth changes remove old subscriptions. Typing is not stored in product tables and does not claim online presence.

The session chip remains **non-interactive**, by user decision. It shows the nearest current shared session’s title, date and start time in Buenos Aires time (updated October 16), with a lavender calendar tile, white surface, fine border and distinct title/metadata hierarchy. No chevron, summary sheet, new route, payment field or management action is implied. Source fields already exposed through the participant-scoped inbox RPC are reused. A conversation without an upcoming shared registration omits the chip.

All chat queries use zero stale time so opening a conversation refreshes cached content immediately; the existing 20-second fallback remains. A limited `inputStyle` override on the shared TextField lets the composer cap its height at 144 points and scroll long drafts while preserving the existing field typography. Unsent new-message text is saved locally per account and conversation, including across app restarts.

SQL regressions cover delivery idempotency, sender/intruder/direct-write denial, typing membership and context attachment/preservation. Unit tests cover three receipt states with bigint boundaries, strict hint payloads, stale auth cleanup and ignored late events. `npm run verify` passes with 79 tests and the same 13 existing lint warnings. Native evidence and limits are in `docs/native-testing.md`.

## Inbox filter counts

All and Unread show conversation counts for the current search. Unread counts conversations with unread messages or a personal unread reminder. The heading reports unread conversations, including those reminders. Selected pills use the existing dark surface and lime badge; inactive pills use lavender surfaces and muted badges. Zero is visible, visual counts cap at99+, and accessibility labels expose the full count plus selected state. Initial loading/failure hides unavailable counts; refresh failure retains counts from the cached conversations.

The composer permits empty drafts without inline validation errors. Empty/whitespace drafts disable Send; submission separately validates the trimmed message before dispatch. Transport failures remain visible with Retry in the message history.

Read-check color refinement: read receipts now use Palla’s accessible accent green (`atomPalette.accent`); sent/delivered checks remain grey. Earlier blue-check QA records describe the previous appearance.

## Message and chat interactions — October 15

Migration `20261015164825_chat_interactions.sql` is deployed.

Messages now also store nullable `edited_at` / `deleted_at` and a positive `revision` (initially 1). Live messages require a nonblank body; deleted messages require a null body. `edit_chat_message` and `delete_chat_message` derive the actor from authentication and permit only the sender to change visible messages. They lock the conversation/message, check the expected revision, and increment it on a change. Stale revisions are rejected rather than overwriting newer text. Deletion is idempotent, removes the body for both participants, and leaves a **Message deleted** tombstone. Deleted messages cannot be edited or restored. Edited messages show **Edited** alongside their timestamp.

| `chat_preferences` field        | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `conversation_id`, `profile_id` | Composite key; one participant’s preferences                 |
| `pinned_at`                     | Nullable pin timestamp; pinned chats sort before other chats |
| `marked_unread`                 | Personal reminder independent of shared read receipts        |
| `hidden`                        | Hide this person’s cleared chat until a new message arrives  |
| `cleared_through_sequence`      | History cutoff visible only to that person                   |

`update_chat_preferences` accepts `pin`, `unpin`, `mark_read`, `mark_unread` and `delete`. RLS exposes only the caller’s preference rows; direct client writes are denied. Marking unread does not rewind the monotonic read cursor or change the peer’s receipt. Opening the chat or marking it read clears the reminder. Inbox filters and the tab badge include personal reminders.

Deleting a chat confirms that it clears only the caller’s history. The server records the latest sequence as their cutoff, hides the conversation, clears its pin/reminder and advances their read cursor. Their history RPC and direct message SELECT policy exclude the cleared portion. The other participant retains their history. A later new message restores the row, exposing only messages after the caller’s cutoff. Explicitly opening the pair by ID still permits starting a fresh exchange. Clearing a chat is not global deletion.

`chat_preferences` joins Realtime publication; message subscriptions now include updates, so edits and tombstones refresh both devices. Mutations refresh summaries/history and evict inactive cleared-history caches. Conversation preferences are changed from the inbox, outside the focused conversation’s read-acknowledgment effect.

Long-press a saved message for its action sheet: received messages offer Copy; own messages also offer Edit/Delete. Copy uses Expo SDK54 Clipboard through an infrastructure adapter and never reads the clipboard. Editing uses the existing composer, preserves the unsent draft, and restores it on save/cancel. Blank or unchanged edits disable Save; failure retains text with retry/cancel guidance. Message/chat deletions use explicit confirmations and loading/error states. Conversation actions are available only by long-pressing an inbox row or invoking its accessible Conversation actions action. There are no visible overflow buttons on inbox rows or in the conversation header. A realtime edit updates the open menu preview; disappearance/deletion closes it with a notice. The session chip remains non-interactive.

Isolated rollback SQL in `supabase/tests/chat_interactions.sql` covers sender ownership, stale revisions, trimmed bodies, tombstones, per-person pins/reminders, direct-write/intruder denial, cleared-history RLS, peer-history preservation and new-message recovery. The original chat SQL regression also passes. Native fixture and live cross-device evidence are recorded in `docs/native-testing.md`.

## Contextual message selection

The message action sheet is superseded by a floating contextual menu. Long-press measures the native message row, dismisses any keyboard, and shows the selected bubble above a lightly dimmed conversation. The original row is hidden while selected to avoid duplicate text/timestamps. Own messages expose Copy/Edit/Delete; received messages Copy only. The compact white menu aligns to the bubble’s side and both reposition within safe-area bounds when close to screen edges. Long message previews scroll independently while their action menu remains available. Actions use the existing service callbacks and ownership rules.

The selection uses an immediate native modal with no custom animation. Tapping outside, Android Back or an accessibility escape dismisses it. Delete swaps to the existing confirmation content within that same modal, avoiding simultaneous modal presentation. Editing restores the incumbent composer; chat-level menus and the non-interactive session chip retain their behavior. Realtime text changes refresh the preview, and unavailable/deleted messages still dismiss selection. This UI refinement requires no database changes.

## Persistent drafts and offline sending — October 15

Native devices use Expo SDK54 SQLite (`palla-local.db`, WAL mode). The infrastructure adapter stores versioned local data; chat repositories own validation and serialized updates. Each account has a separate state containing conversation drafts and an ordered outbox. Draft text is written through as it changes. Editing a saved message does not replace the new-message draft. Loading or saving failures use friendly guidance and preserve text in the composer.

Send generates one message UUID and atomically saves the queue entry while clearing that conversation's stored draft. The composer clears only after this write succeeds. Outbox entries contain `id`, `conversation_id`, `body`, `created_at`, local `order`, `state` (`queued`, `sending`, `failed`), `attempts`, `nextAttempt` and a coarse `failure` reason. The queue is limited to100 entries per account. Local creation time orders the waiting UI; the server remains authoritative for accepted message time and sequence.

A single foreground worker uses NetInfo and AppState. It drains only the current authenticated account's queue and freezes that account's access token for each request. Switching accounts, backgrounding or losing connectivity aborts the active request and stops further dispatch. Previously interrupted `sending` entries recover as queued. Temporary failures back off from2 seconds to at most60 seconds; each attempt has a15-second request timeout. Per-conversation order is preserved, including when a failed head blocks later messages; other conversations can continue. Reconnection, foregrounding and a short polling wake recover missed signals. Delivery while the app is closed is not promised; reopening resumes the queue.

The existing `send_chat_message` RPC handles retries idempotently by UUID and body, including an accepted response lost during disconnection. No new server schema is required. Accepted results merge into the actor-scoped query cache before removing the outbox entry. A clock and waiting caption distinguish queued text from saved messages; sending uses a spinner, permanent rejection exposes Retry, and waiting/failed messages can be removed after confirmation. Removal stops further attempts; an already accepted message may remain remotely. Deleting a chat pauses its worker, clears server-side personal history, and then removes its local draft/outbox and cached history.

TanStack Query persists only loaded auth profiles, inboxes, conversation summaries and message pages for up to7 days. This lets previously opened chats render after an offline restart; it does not fetch unseen chats offline. Query cache clearing on sign-out is persisted, while account-separated drafts/outbox are retained for the same account's next sign-in. Local storage uses the operating system's app sandbox; uninstalling the app or clearing its data removes drafts and waiting messages. There is no cross-device draft sync. Edits and deletions are not queued offline.

Native fixture `/sessions-preview/chat-offline` uses the real SQLite repository, composer and worker with an explicitly simulated transport/availability toggle. Its account switching, restart and single-delivery checks do not prove real network delivery. Unit tests cover atomic writes, persistence failure, account isolation, interrupted recovery, ambiguous acknowledgments, backoff/order, permanent failure, account-switch aborts and removal/delete races. Native and live evidence is recorded in `docs/native-testing.md`.

## Automatic history loading

The inverted native FlatList uses `onEndReached` within0.3 viewport lengths of its logical end (the oldest visible history). An immediate in-flight guard prevents overlapping scroll-triggered requests, alongside the query's loading state. Stable message IDs and `maintainVisibleContentPosition` preserve the reading position when older pages arrive. No automatic scroll-to-newest is triggered by history loading. A small spinner and “Loading older messages…” appear at the older edge while fetching. Exhausted history stops fetching.

A failed next-page request retains existing messages and shows “Older messages couldn’t load.” with a Retry older messages control at that edge. It does not show the generic refresh-failure banner or start a request on every subsequent scroll. Retry explicitly requests the same older cursor. Existing server pagination and authorization are unchanged.

Development-only `/sessions-preview/chat-pagination` exercises the real thread and TanStack infinite query with120 synthetic messages in50/50/20 pages. `?fail=1&slow=1` delays older requests and rejects the first attempt, allowing native checks of busy/error/retry behavior without writing120 messages into a user account. This fixture is not a new backend pagination test.

## Automatic inbox pagination

Migration `20261015190112_chat_inbox_pagination.sql` adds `list_chat_inbox` through the existing private definer / public invoker RPC pattern. It authorizes with `auth.uid()` and returns at most 30 conversations for the app (validated RPC limits: 1–50). Cursor ordering is pinned timestamp descending, latest activity descending, then conversation UUID descending. The UUID provides a deterministic tie-breaker. Personal hidden-history boundaries and participant access remain enforced; no new tables are required. The legacy conversation RPC remains available for individual conversation details.

Search runs on the server over peer names and the latest visible message body, using literal case-insensitive substring matching. The input is limited to 200 characters and debounced by 300 ms. Search and unread filtering happen before pagination. All/Unread counts cover matching conversations before the unread filter; total unread conversations and the navigation badge cover the full inbox. Counts do not shrink to the loaded page size.

`useChatInbox` uses a versioned, account/filter-scoped infinite-query key under the existing inbox invalidation prefix. Pages are deduplicated by conversation ID. The native FlatList requests the next page near its bottom, with an immediate in-flight guard. Search/filter changes return the list to the top. Loading more shows a footer spinner. Failed pages retain existing conversations and show a Retry action; further scroll events do not repeatedly retry a failed page.

Verification: `inbox-domain.test.ts` covers deduplication, full counts and page/cursor validation. Rollback-only `supabase/tests/chat_inbox_pagination.sql` covers tied ordering, pins, all pages, hidden chats, search, unread counts, validation and participant authorization in isolated PostgreSQL 16. Existing chat interaction SQL checks also passed. Native bulk checks use the no-write fixture documented in `docs/native-testing.md`; both authenticated apps additionally loaded their real inbox through the deployed RPC. Live multi-page account data was not seeded.

## Quoted replies and emoji reactions

Migration `20261015193034_chat_replies_reactions.sql` adds these native chat interactions:

- Long-press a saved message to choose Reply, Copy, or a reaction. Own messages retain Edit/Delete. Pending and deleted messages do not expose these actions.
- Reply shows a compact, cancellable author/excerpt above the composer. Sent replies contain a tappable quote; tapping loads older history as needed and highlights the original. Finding an original can be cancelled; loading failures retain the thread and provide recovery guidance.
- The six reactions are 🎾 Padel, 🔥 On fire, 💪 Let’s go, 👏 Well played, ❤️ Love and 😂 Laugh. Each participant has one reaction per message. Choosing a different emoji replaces it; choosing the current one removes it. Shared count capsules highlight your selection. Native emoji artwork varies by OS.
- The reply target and message draft persist per account/conversation. Enqueue atomically clears both draft fields and saves the target alongside the stable message UUID. Offline retries keep that target. Edit mode preserves the separate new-message draft and reply target.

### Data and access

`chat_messages.reply_to_id` is a nullable UUID referencing the original message, indexed when present. RPC writes accept only a nondeleted target visible to the sender in the same conversation. Retry identity includes the target; it cannot silently change on a repeated send. Quotes are resolved from the original row at read time, not copied into another message. Edits therefore update quotes; deletion removes their text; personally cleared originals return an unavailable quote without sender/text/sequence details.

`chat_reactions` has `(message_id, profile_id)` as its primary key, a checked nullable `emoji`, and `updated_at`. The authenticated profile comes from `auth.uid()`. Clearing uses a null emoji so Realtime can send an authorized UPDATE; no unfilterable DELETE event is needed. Read policies enforce participation and the viewer’s history boundary. Direct client writes are revoked. Deleted message responses omit reactions. The existing conversation lock serializes reactions, edits, sends and personal deletion.

`send_chat_message` gains optional `p_reply_to_id`; existing three-argument callers remain valid. `set_chat_reaction` takes an explicit desired emoji or null, making network retries idempotent. `get_chat_message` resolves a saved reply target without loading all history and returns null for unavailable targets. Public wrappers remain invokers with guarded private functions. Realtime reaction changes invalidate account-scoped chat queries; polling and reconnect refresh remain recovery paths.

### Verification

Rollback-only `supabase/tests/chat_replies_reactions.sql` verifies same-conversation/visible targets, retry identity, reaction replacement/removal, participant isolation, forbidden direct writes, edited/deleted quote behavior, personal history clearing and anonymous rejection. Existing chat-interaction SQL checks passed in isolated PostgreSQL 16. Domain and outbox tests cover quote privacy validation, allowed reactions, reply draft recovery, atomic enqueue, failed writes and target identity conflicts. Native runtime evidence and limitations are recorded in `docs/native-testing.md`.

## Floating inbox actions — October 15

Long-pressing an inbox row opens a compact white floating menu against the dimmed inbox. The menu exposes Pin/Unpin, Mark as read/unread, and Delete chat with trailing icons and at least52-unit action rows. A normal tap still opens the conversation. Message-specific long-press actions remain separate.

The native row supplies the anchor. The menu aligns to its right edge, fits below it when possible, falls back above it, and clamps to safe-area bounds with scrolling for constrained space. Android measurements include the status-bar offset for the translucent modal. An open keyboard is dismissed before measuring. Outside press, Android Back, and accessibility escape dismiss selection. Busy operations prevent duplicate actions and show progress; failures retain friendly guidance. Delete uses the existing explicit confirmation within the same modal. No database changes are required.

## Participant message identity — October 15

Incoming messages show the participant avatar, a bold name and timestamp above a white bordered bubble. Player avatars carry the stored Argentine category (for example,7ma) when present; organizers carry a dark HOST tag based on their conversation role. This is a role label, not a verification claim. Missing/failed photos use initials; unknown categories do not produce invented tags. The header reuses the same photo/initials component without the overlapping badge.

Outgoing messages retain lavender bubbles and their timestamp/delivery/read indicators below. Bubbles have a small sender-side top corner. Reaction pills are visually compact while their outer press targets remain at least48 units. Quoted replies, message selection, pending/error states and inbox-only chat actions retain their existing behavior. No backend changes are needed.

Reaction count pills use pale lavender with a subtle border and dark bold counts, including the current actor’s selected reaction. The floating emoji picker retains its selection highlight. This reference correction also uses14-unit label text and8-unit gaps between pills;48-unit outer tap targets remain intact.

## Online status — October 15

The authenticated app root publishes Presence while the account has completed onboarding, the app is active, and connectivity is available. A focused conversation observes its peer’s private `chat-online:<profile-id>` channel. The header shows an olive dot and Online, with Typing… taking priority. Otherwise it returns to the participant’s role/category. Navigating elsewhere in Palla keeps the publisher active; backgrounding, sign-out/account change or network loss stops it. Observers never publish on their peer’s channel.

Presence uses no product table, online/last-seen column, saved timestamp or history. Its ephemeral payload contains `online: true` and a changing pulse counter, renewed every15 seconds. Observers age unchanged entries out after45 seconds, checking expiry every5 seconds, so a lost disconnect notification cannot leave indefinite Online status. A new subscription initially treats received entries as fresh. At least one fresh device entry keeps the account online. Abrupt disconnection therefore has a short detection delay; Online means connected and active in Palla, not reading this conversation.

Migration `20261015205340_chat_online_presence.sql` adds Presence-only policies to Supabase-owned `realtime.messages`: authenticated clients publish only on their own profile topic; they can receive their own or an existing conversation peer’s presence. A private-schema helper checks trusted conversation rows. No new public RPC or signup/registration restriction is introduced. Channel teardown/rejoin is serialized because Supabase reuses an existing topic; stale auth completion and late callbacks cannot reopen a stopped connection. Failed subscriptions or lost observer connectivity hide Online. Tests cover multi-device presence, expiry/renewal, cleanup and rejoin; rollback SQL checks the actual deployed policy expressions, including outsider and cross-owner denial.

## Inbox cards and avatar presence — October 15

The user’s inbox reference supersedes the divided-row treatment: conversations use flat white cards with a subtle border,24-unit corners,16-unit padding and12-unit separation. A52-unit photo/initials avatar sits beside the bold name and a stored category chip or Host tag. Unknown categories omit the chip. Relative message age sits at the right; the preview remains one line with unread emphasis, unread count and pin/reminder cues retained. There is no Substitute Request tag.

Online avatars in the inbox and conversation header use a lime outline and lower-right lime dot with a surrounding surface-colored edge. Inactive/unconfirmed avatars show a muted gray dot without the ring. The Online caption remains in the header, while its former inline dot is removed; Typing… still takes priority. Incoming-message category/Host badges remain separate from header/inbox availability indicators.

Only visible rows in the focused live inbox observe presence. Read-only watchers for the same peer/token share a channel and release it after their last viewer leaves; a repository regression test covers this lifecycle. The preview can show explicitly synthetic online IDs under its existing no-account-changes label. Long press remains the only visible entry point for chat actions; normal tap opens the conversation. No schema or presence-publishing policy changes are required.

## Chat push notifications

Chat push delivery, private device registration and server retry/receipt handling are implemented. Alerts use the sender’s saved profile name and a shortened message preview, following the approved mockup; lock-screen preview visibility follows OS settings. Individual chat muting remains out of scope. The backend is deployed, but real device delivery requires Apple/Firebase credentials and native Palla development builds; Expo Go does not register for push. See [chat-push.md](chat-push.md) for behavior, activation steps and verification limits.

## Search within a conversation — October 16

A magnifier in the conversation header opens search. Literal, case-insensitive substring queries search the caller’s entire visible saved history, including messages outside loaded pages. Queries are trimmed, limited to200 characters and debounced300ms. Results count matching messages (not individual occurrences), start at the newest match, and use Older/Newer arrows with a chronological position counter. Matching words use pale lime; the selected message uses bright lime highlights and an olive outline. Done, the search back arrow, and Android Back return to normal chat. The composer stays mounted but hidden so the current draft, reply and edit state survive searching.

`search_chat_messages` is an authenticated invoker RPC backed by an explicitly authorized private function. It reuses conversation membership, the personal cleared-history boundary, the conversation/sequence index and the existing safe message serializer. Deleted bodies are excluded from matching; context can retain their normal tombstones. `%`, `_` and punctuation are literal text, never wildcard or regex operators. One request returns the total, the selected match and up to25 surrounding messages; it does not download every preceding page. A stale result index clamps after deletions. Search does not independently advance read positions or deliver acknowledgments for historical context.

Actor/conversation/query/index-scoped TanStack queries own results. Realtime message/preference changes invalidate search; foreground reconnect and20-second refresh recover missed updates. Search queries are not included in persisted query-cache storage. Local edit/delete and personal conversation clearing invalidate/remove search caches. Loading, empty input, no matches and connection errors have explicit UI; errors expose Retry. Pending local sends are not searchable until saved by the server.

Migration: `20261016124021_chat_conversation_search.sql`. `supabase/tests/chat_search.sql` exercises120 rollback-only messages, older-history matches, literal punctuation, mixed case/Unicode, authorization, parameter validation, edit/delete behavior, personal clearing, independent peer history and unchanged read positions. Native fixture: `/sessions-preview/chat-search?nativeQa=1`, with three matches across120 sample messages, an unchanged draft, and `qa fail` to simulate a failed search. This preview does not access account data or write messages; native results are recorded separately in `docs/native-testing.md`.

## Dynamic shared-session context and inbox filters — October 16

Migration `20261016134447_chat_dynamic_session_context.sql` derives context from confirmed/waitlisted registrations between the conversation's player and organizer. `chat_conversations.source_session_id` remains the original entry-point provenance; it no longer determines the displayed chip. No copied session snapshot or separate conversation per session is created.

`session_context` returns `next_session` (id, title, start/end), `upcoming_count`, and `past_count`. The next session is the earliest published shared occurrence that has not ended, including an occurrence currently in progress. The chip updates its title/time, shows `+N more` when needed, and disappears when no upcoming shared occurrence exists. Cancelled registrations and cancelled occurrences are excluded. Completed/ended shared occurrences count as past; waitlist membership does not imply attendance. The legacy summary `source_session` field also resolves dynamically for compatibility; the conversation's original source ID is preserved.

The inbox uses the new authenticated `list_chat_inbox_filtered` endpoint, retaining bounded cursor pagination, pin ordering, hidden-history rules and literal name/latest-message search. Its mutually exclusive filters are All, Unread, Upcoming (one or more active/upcoming shared occurrences), and Past (past shared occurrences and no upcoming ones). All/Unread include pre-registration questions. Count badges cover the full matching search result, not just loaded pages. Existing `list_chat_inbox` callers remain supported.

Session and registration changes invalidate chat queries through Supabase Realtime with existing SELECT RLS. Session subscriptions cover the actor and up to 100 organizers represented in the loaded inbox. The existing foreground/refocus refresh and 20-second polling also cover time transitions, unloaded organizers, and changes whose RLS prevents an event from reaching the client. Context is computed using database time on each fetch; it is not a second independently persisted state.

`supabase/tests/chat_session_context.sql` verifies nearest selection, multiple registrations, waitlist inclusion, filter counts, search, cursors, rescheduling, both cancellation cases, origin preservation, player access and unrelated/anonymous rejection in a rolled-back transaction. Legacy inbox-pagination SQL also passes. No live account data is changed by these fixtures.

## Jump to latest and new-arrival count — October 16

The conversation shows a white 48-point floating ChevronDown button, above the composer, when its inverted message list is more than 80 points from the latest end. A lime badge counts incoming saved messages received while reading older history (display capped at `99+`; accessibility names the full count). Tapping jumps to offset zero and clears the count; manually reaching the latest end clears it too. New arrivals follow automatically when already near the latest end. The control follows the message viewport above the keyboard/composer, hides during search and message selection, and does not add another navigation action.

A local sequence watermark prevents pagination, refreshes, edits, reaction changes, deleted messages and own sends from inflating the badge. Deleted counted arrivals are removed. Counts are local to the mounted conversation; existing persisted inbox/read-receipt behavior remains independent. Search uses a separate list; leaving search restores the latest end with no retained jump count. Sending also returns to latest. No backend changes or migrations are required. The composer now uses the approved paper-plane Send icon; editing retains its save check.

Unit tests cover first-load baselines, older-page exclusion, duplicate refreshes, sender/deletion rules, clearing and bigint sequence precision. Native no-write QA is available at `/sessions-preview/chat-latest?nativeQa=1`; Receive/Refresh/Reset QA controls modify only synthetic local messages.

## Blocking users — October 16

Blocking is a profile-pair messaging restriction, independent from session registrations or attendance. The existing inbox long-press menu offers Block user (or Unblock user for your own block). Confirmation explains that neither person can message the other and that history/registrations stay. The conversation preserves historical messages/search and replaces the composer with You blocked [name] and Unblock, or neutral Messaging unavailable copy for the other participant. Presence rings/dots, online text, typing, replies, edits and reactions are disabled while messaging is unavailable. Own-message deletion and copying remain available. Unblock errors retain the blocked state and expose a retry; drafts remain mounted and intact.

`20261016143355_chat_user_blocking.sql` adds `user_blocks(blocker_id, blocked_id, created_at)`, a composite primary key, self-block check and reverse index. RLS permits users to read only their own blocks. Direct client writes are revoked: authenticated `set_chat_block(conversation_id, blocked)` derives the other person from a trusted conversation. Unblock removes only the caller's block. Either person's remaining block prevents messaging. Summaries expose only `blocked_by_me` and `messaging_available`, not who else blocked whom. History/inbox SELECT authorization stays participant-scoped.

A shared pair advisory lock serializes send/start/reaction/edit operations with block changes. Existing authorization, message idempotency, rate limits and revision checks remain behind guarded private wrappers; direct EXECUTE on the pre-blocking implementations is revoked. Automatic read/delivery acknowledgments are suppressed for blocked pairs. Pending/sending push jobs are skipped and worker claims recheck blocking; an already dispatched OS push cannot be recalled. The local outbox pauses during an intentional block and retains waiting messages as failed, requiring explicit retry after unblocking. Queued sends from stale/offline devices are rejected permanently by the server rather than retried indefinitely. No draft/history erasure is performed by blocking.

`access_version` on conversations changes on block transitions. `20261016144830_chat_blocking_realtime_and_history.sql` publishes these generic revisions to both participants through existing conversation SELECT RLS. Chat queries refresh and signal observers resolve new authorized topics. Presence topics include an aggregate access revision for the subject; typing topics include the conversation revision. The publisher leaves the previous topic, so previously cached channel permissions do not grant future activity on its replacement. Presence topic resolution also refreshes every 20 seconds and on foreground/reconnect, covering missed events and rotations affecting unrelated peers. Supabase checks private-channel policies at join/token refresh; policy changes alone do not evict an existing socket. New topics are required for this reason. Existing foreground/offline cleanup still applies.

Clearing a conversation you have blocked clears your view of the history but retains the blocked row in the current inbox so Unblock stays reachable. Its confirmation explains this exception. After unblocking, ordinary hidden-chat rules apply again. A later blocked-users management screen is not included.

Rollback-only `supabase/tests/chat_blocking.sql` verifies both directions, own/other state privacy, idempotency, reciprocal blocks, unblock ownership, send/start/edit/reaction denial, direct-table/core-function bypass denial, historical access, retained blocked rows after clearing, pending push cancellation, receipt suppression, topic access/rotation and anonymous/intruder rejection. Existing chat, presence-policy, inbox-pagination and dynamic-context SQL regressions pass with versioned signal-topic fixtures. Unit tests cover presence rotation and denied/stale subscriptions. Native evidence and acceptance limits are in `docs/native-testing.md`.

## User reporting

Inbox long-press → Report user → choose a reason → optional details → Submit report → confirmation. Reasons: harassment/abuse, spam/scam, inappropriate content, impersonation, other. A reason is required; details are optional and capped at 2,000 characters. “Also block” is unchecked by default; already-blocked users retain their existing block. Reporting alone does not change messaging, attendance or session registrations. Cancellation submits nothing. Pending requests disable dismissal; failed requests preserve entered values for retry.

The `chat-report` Edge Function verifies the bearer token with Auth `getUser`, rejects anonymous identities, validates/bounds request bodies and accepts no caller-supplied reporter or evidence. A service-only `submit_chat_report` RPC derives the reported peer from trusted conversation membership and an onboarded profile. Authenticated/anonymous clients cannot invoke that RPC directly or read/write report rows. Gateway JWT verification is disabled because authentication happens explicitly in the handler, including current Auth validation; this is not an unauthenticated write endpoint.

`private.chat_user_reports` stores:

- `id`: UUID request identity; identical retries return the original result without creating another report or repeating a block. Changing a submitted request's data requires a new ID.
- `reporter_id`, `reported_id`, `conversation_id`: trusted references, nullable on referenced deletion.
- `reason`, `details`, `block_requested`.
- `messages`: a server-generated snapshot of up to 20 most recent messages visible to the reporter, in chronological order. Includes message/sender IDs, sequence, body, timestamps and revision. Cleared history is excluded; deleted messages contain no body. Subsequent edits/deletions do not rewrite submitted evidence.
- `status`: `pending`, `reviewed` or `dismissed`; `created_at`, nullable `reviewed_at`.

Reports have RLS enabled, service-only grants/policy, no client list endpoint, and no Realtime publication. No notification or report status is sent to the reported person. A per-reporter transaction lock serializes a rolling limit of 10 reports per 24 hours. Optional blocking runs in the same transaction and reuses all existing block effects: pending push cancellation and presence-topic rotation. Failed report validation/quota does not apply a new block. Local queued messages are paused before a report-and-block request and require manual retry after a later unblock, consistent with ordinary blocking.

Review is currently manual through trusted database administration: inspect pending rows in `private.chat_user_reports` and record `status`/`reviewed_at`. An admin review interface, escalation/notification process, appeals and automated evidence retention are not implemented. Define retention and the moderation operating process before public rollout; the UI promises no response time or automatic account sanctions.

Migration: `20261016151007_chat_user_reporting.sql`. Authorization, evidence boundaries, frozen snapshots, idempotency, quotas and report-and-block are covered by rolled-back `supabase/tests/chat_reporting.sql`. Native tests use the local reporting adapter in `/sessions-preview/chat-blocking?nativeQa=1`; they do not submit accusations about real accounts.

The revised blocking/reporting sheets share a participant header and explanatory panels. “Also report” in the block confirmation defaults off. Off submits only a block; on changes the primary action to Continue to report, which performs no write and opens the existing form with blocking selected. The final Report & block submits the existing atomic backend operation. Back to the block sheet preserves that reporting choice. Direct inbox reporting still defaults blocking off, and users may change the block choice before final submission. The blocking sheet’s primary action stays red/white whether optional reporting is off or on; its label/icon changes. Report-form actions remain neon/dark-green. The blocking explanation uses three rows for messaging/online status, retained history/registrations, and removing the block. The details limit remains 2,000 characters.

## Unread message boundary

The timeline shows a lilac **Unread messages** divider without a counter before the first incoming, non-deleted message unread when the conversation opens. Conversation entry loads the caller's own `chat_reads.through_sequence` alongside the summary through the repository/service layer. The database cursor is selected as text to preserve bigint precision; absent receipts mean sequence zero. Existing membership RLS applies. No migration or new table is needed.

The thread snapshots the opening cursor and latest message before its read receipt advances. Fresh entry data is awaited before reading cached messages, preventing a cached receipt from manufacturing a stale boundary. Receipt refreshes, background updates and later messages do not move the marker. Reopening a fully read chat shows no divider; manual Mark as unread alone does not rewind the receipt. Conversation search hides the marker. When older pages do not yet cover the boundary, no marker is shown until the relevant history loads. Existing pagination and jump-to-latest behavior are retained.

Native verification uses the development-only `palla://sessions-preview/chat-unread` fixture. Read sync QA simulates an advancing receipt; Receive QA adds an incoming message; Reopen read QA remounts with an updated cursor. These controls never write real messages or receipts.

## Photo attachments — October 16

Chat supports one gallery photo per message, with an optional caption. The original approved full-width preview uses a white toolbar, compact caption composer and neon paper-plane button; the viewer preserves the complete image and provides Close and Save photo. Saving requests photo-library write permission only when used. Taking photos, multi-photo messages, document/audio sending, image editing and zoom are deferred.

The shared `chat_attachments` metadata supports image/document/audio types for later expansion; only images can currently be uploaded. Metadata is embedded into the existing paginated message response, so the timeline does not issue an attachment lookup for each message. A separate authorized request resolves a private image URL only when its image component mounts. Signed URLs expire after 60 seconds and are cached in memory briefly, not persisted with messages.

The native adapter converts selected images to JPEG, strips metadata and limits the longest side to 2,048 pixels and the file to 4 MiB. The server independently decodes and re-encodes the JPEG and enforces dimensions/size. The `chat-photo` Edge Function verifies the current Auth user, derives membership and storage paths server-side, and uses service-only RPCs. The private Storage bucket has no direct client policies. RLS restricts attachment metadata to conversation participants and excludes deleted messages and cleared history. Blocking prevents new uploads/finalization while retaining access to historical photos.

Photo sends use the existing account-scoped durable outbox. A persistent owned file, frozen caption/reply and stable message UUID survive restarts. Retries reuse the reservation and message identity, preventing duplicate delivery after an ambiguous response. The local file is removed only after durable queue completion or explicit discard. A selected but unsent preview is not a persistent photo draft; cancellation removes its file, but an interrupted selection can leave a local orphan. Add a local orphan sweep before a broad rollout.

Migration `20261016193000_chat_photo_attachments.sql` adds attachment rows and private upload reservations. Finalization inserts the message and metadata atomically. Authenticated clients cannot invoke privileged photo RPCs directly. The function supports authorized image access and opportunistic cleanup of the caller's abandoned uploads (older than a day) and deleted-message files after subsequent upload/delete activity. Cleanup is not scheduled globally, and retention/account-deletion cleanup needs a follow-up. Previously issued URLs remain usable until their short expiry.

Validation: schema/outbox/JPEG tests, rollback-only hosted SQL authorization and idempotency checks, and unauthenticated Edge rejection. The development-only `palla://sessions-preview/chat-photos` fixture exercises the real native picker, normalization, local outbox, retry/discard and photo-library saving without sending real messages. This fixture cannot verify authenticated Edge upload, private remote downloads or cross-device delivery; those require signed-in test accounts.

Live follow-up: using the two user-signed-in QA accounts, iOS sent a captioned image and Android received it in real time, opened it and saved the remote image to its photo library. Android then sent the same disposable image without a caption; iOS received, viewed and saved it. Database inspection confirmed one attachment/message per send, valid JPEG metadata and the empty-caption message. Both uploads traversed the deployed Edge Function and private Storage rather than the local fixture. Evidence: `.impeccable/review/native/chat-photos/*live*`.
