# Conversation search proposal

Approved visual mockup (user approval received 2026-10-16), generated with the built-in image generation tool on 2026-10-16. No production UI changed.

Prompt: Extend the incumbent Palla conversation UI with three states: header search entry; full-history text search with highlighted matches in the timeline and previous/next controls; no-results feedback. Preserve pale lavender canvas, white incoming and lavender outgoing bubbles, Hanken typography, subtle borders, lime active highlighting and olive accents. Use fictional Carlos M. sample content. Search replaces the composer with a match navigator and offers Done to return to normal chat.

Reference: `.impeccable/review/native/chat-inbox-cards/ios-live-header.png`, checked against `chat-thread.tsx`, DESIGN.md and the latest chat surface brief.

Implementation notes: rendered sample counter is illustrative (the selected last occurrence would be 3 of 3 with chronological indexing). Preserve actual existing category badge styling rather than the generated olive round badge. Search must cover authorized server history, not just fetched pages; deleted/personally cleared content must stay excluded. Search does not alter drafts. Native keyboard, loading, failure/retry and no-query states require implementation and iOS/Android verification after approval.
