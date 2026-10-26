# Replies and reactions proposal

Status: user approved; implemented and tested on native iOS and Android.

`proposal.png` is the generated three-state interaction mockup shown on October 15, 2026. Source: built-in image generation output `exec-7785c900-bba7-40cc-9809-7ab7f2a787bf.png`, using `.impeccable/review/native/chat-selection/own-ios.png` as the incumbent visual reference. The proposal extends the existing floating menu with a reaction strip and Reply, a cancellable composer quote, and a sent quoted message. Preserve current header/session chip/composer controls; the generated inset quote's thick left rule is not a new global token.

Reaction set: 🎾 Padel, 🔥 On fire, 💪 Let's go, 👏 Well played, ❤️ Love, 😂 Laugh. One reaction per participant per message; selecting another replaces it, selecting the current emoji removes it. Incoming messages expose Reply and Copy; own messages retain Edit/Delete.

Backend migration `20261015193034_chat_replies_reactions.sql` is deployed. Rollback-only replies/reactions and existing interaction SQL tests passed in isolated PostgreSQL 16. Code verification passes 98 tests with 13 existing lint warnings. Native fixture and live cross-device checks are recorded in `docs/native-testing.md`; visual decisions are recorded in `.impeccable/chat-brief.md`.
