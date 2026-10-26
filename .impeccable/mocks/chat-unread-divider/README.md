# Unread divider

Approved proposal: `proposal.png`. Pale lilac pill labelled **Unread messages**, with fine lines on either side and no counter. Preserve the chat's existing incoming/outgoing bubbles and paper-plane composer.

The divider marks the first incoming, non-deleted message after the saved opening read position. The opening snapshot stays fixed while receipts and Realtime data refresh. A fully read chat (including a manual-unread reminder with no unread messages) has no divider. Search hides the divider. If the boundary lies in older unloaded history, defer it until history covers that position rather than mislabelling the current page. Closing and reopening creates a fresh snapshot.
