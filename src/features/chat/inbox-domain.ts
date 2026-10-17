import { z } from "zod";
import { entityIdSchema, timestampSchema } from "@/types/domain-schema";
import {
  conversationSummarySchema,
  isConversationUnread,
  type ConversationSummary
} from "./domain";

export const inboxFilterSchema = z.enum(["all", "unread", "upcoming", "past"]);
export type InboxFilter = z.infer<typeof inboxFilterSchema>;
export function matchesInboxFilter(
  row: ConversationSummary,
  filter: InboxFilter
) {
  const context = row.session_context;
  return (
    filter === "all" ||
    (filter === "unread" && isConversationUnread(row)) ||
    (filter === "upcoming" && (context?.upcoming_count ?? 0) > 0) ||
    (filter === "past" &&
      (context?.upcoming_count ?? 0) === 0 &&
      (context?.past_count ?? 0) > 0)
  );
}
export const inboxCursorSchema = z.strictObject({
  id: entityIdSchema,
  pinned_at: timestampSchema.nullable(),
  last_at: timestampSchema
});
export const inboxPageSchema = z.strictObject({
  conversations: z.array(conversationSummarySchema).max(50),
  next_cursor: inboxCursorSchema.nullable(),
  counts: z.strictObject({
    all: z.number().int().nonnegative(),
    unread: z.number().int().nonnegative(),
    upcoming: z.number().int().nonnegative().optional(),
    past: z.number().int().nonnegative().optional(),
    total_unread: z.number().int().nonnegative(),
    badge: z.number().int().nonnegative()
  })
});
export type InboxCursor = z.infer<typeof inboxCursorSchema>;
export type InboxPage = z.infer<typeof inboxPageSchema>;
export function flattenInboxPages(pages: InboxPage[]) {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.conversations)
    .filter((row) => {
      if (seen.has(row.conversation.id)) return false;
      seen.add(row.conversation.id);
      return true;
    });
}
