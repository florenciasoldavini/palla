import { entityIdSchema, timestampSchema } from "@/types/domain-schema";
import { z } from "zod";
import { attachmentSchema } from "./attachment-domain";

// Keep PostgreSQL bigint cursors as decimal strings throughout the client.
export const messageSequenceSchema = z.string().regex(/^[1-9]\d*$/);
export const messageBodySchema = z.string().trim().min(1).max(4000);
export const reactionEmojiSchema = z.enum(["🎾", "🔥", "💪", "👏", "❤️", "😂"]);
export const reactionOptions = [
  { emoji: "🎾", label: "Padel" },
  { emoji: "🔥", label: "On fire" },
  { emoji: "💪", label: "Let’s go" },
  { emoji: "👏", label: "Well played" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Laugh" }
] as const;
export type ReactionEmoji = z.infer<typeof reactionEmojiSchema>;
export const replyQuoteSchema = z
  .strictObject({
    id: entityIdSchema,
    sender_id: entityIdSchema.nullable(),
    sequence: messageSequenceSchema.nullable(),
    body: messageBodySchema.nullable(),
    deleted_at: timestampSchema.nullable(),
    available: z.boolean()
  })
  .refine(
    (quote) =>
      quote.available
        ? quote.sender_id !== null &&
          quote.sequence !== null &&
          (quote.deleted_at ? quote.body === null : quote.body !== null)
        : quote.body === null &&
          quote.sender_id === null &&
          quote.sequence === null,
    { message: "Unavailable quotes must omit message details" }
  );
export type ReplyQuote = z.infer<typeof replyQuoteSchema>;
export const chatMessageSchema = z
  .strictObject({
    id: entityIdSchema,
    conversation_id: entityIdSchema,
    sender_id: entityIdSchema,
    sequence: messageSequenceSchema,
    body: z.string().trim().max(4000).nullable(),
    kind: z.enum(["text", "attachment"]).optional(),
    attachments: z.array(attachmentSchema).max(1).optional(),
    edited_at: timestampSchema.nullable().default(null),
    deleted_at: timestampSchema.nullable().default(null),
    revision: z.number().int().positive().default(1),
    created_at: timestampSchema,
    delivered_at: timestampSchema.nullable().default(null),
    reply_to_id: entityIdSchema.nullable().optional(),
    reply: replyQuoteSchema.nullable().optional(),
    reactions: z
      .array(
        z.strictObject({
          profile_id: entityIdSchema,
          emoji: reactionEmojiSchema
        })
      )
      .max(2)
      .optional()
  })
  .refine(
    (message) =>
      message.deleted_at
        ? message.body === null && !message.attachments?.length
        : message.body !== null &&
          (!!message.body.trim() || !!message.attachments?.length),
    {
      message: "Deleted messages must omit their text"
    }
  );

export const conversationSchema = z
  .strictObject({
    id: entityIdSchema,
    organizer_id: entityIdSchema,
    player_id: entityIdSchema,
    source_session_id: entityIdSchema.nullable(),
    created_at: timestampSchema,
    access_version: z.number().int().nonnegative().optional()
  })
  .refine((value) => value.organizer_id !== value.player_id, {
    message: "A conversation needs two different participants"
  });

export const chatParticipantSchema = z.strictObject({
  id: entityIdSchema,
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  playing_category: z.number().int().min(1).max(8).nullable()
});
export const sharedSessionContextSchema = z
  .strictObject({
    next_session: z
      .strictObject({
        id: entityIdSchema,
        title: z.string(),
        starts_at: timestampSchema,
        ends_at: timestampSchema
      })
      .nullable(),
    upcoming_count: z.number().int().nonnegative(),
    past_count: z.number().int().nonnegative()
  })
  .refine(
    (value) => value.upcoming_count > 0 === (value.next_session !== null)
  );
export const conversationSummarySchema = z.strictObject({
  conversation: conversationSchema,
  other_participant: chatParticipantSchema,
  other_role: z.enum(["player", "organizer"]),
  last_message: chatMessageSchema.nullable(),
  unread_count: z.number().int().nonnegative(),
  pinned_at: timestampSchema.nullable().default(null),
  marked_unread: z.boolean().default(false),
  other_read_sequence: messageSequenceSchema.nullable().default(null),
  blocked_by_me: z.boolean().optional(),
  messaging_available: z.boolean().optional(),
  session_context: sharedSessionContextSchema.optional(),
  source_session: z
    .strictObject({
      id: entityIdSchema,
      title: z.string(),
      starts_at: timestampSchema
    })
    .nullable()
});

// A retry reuses the same message ID. Identity and timestamps come from the server.
export const sendMessageInputSchema = z.strictObject({
  id: entityIdSchema,
  conversation_id: entityIdSchema,
  body: messageBodySchema,
  reply_to_id: entityIdSchema.nullable().optional()
});
export const markConversationReadInputSchema = z.strictObject({
  conversation_id: entityIdSchema,
  through_sequence: messageSequenceSchema
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export function toReplyQuote(message: ChatMessage): ReplyQuote {
  return {
    id: message.id,
    sender_id: message.sender_id,
    sequence: message.sequence,
    body:
      message.body || (message.attachments?.length ? "Photo" : message.body),
    deleted_at: message.deleted_at,
    available: true
  };
}

/** Reconcile HTTP/realtime/reconnect overlap without duplicating sent messages. */
export function mergeChatMessages(...batches: ChatMessage[][]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const batch of batches) {
    for (const message of batch) byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) => {
    const left = BigInt(a.sequence);
    const right = BigInt(b.sequence);
    return left < right ? -1 : left > right ? 1 : a.id.localeCompare(b.id);
  });
}

/** Read status is based on the recipient’s cursor, never the sender’s cursor. */
export function isChatMessageRead(
  sequence: string,
  otherReadSequence: string | null
): boolean {
  return (
    otherReadSequence !== null && BigInt(sequence) <= BigInt(otherReadSequence)
  );
}

export const typingPayloadSchema = z.strictObject({
  actor_id: entityIdSchema,
  typing: z.boolean()
});

export function chatReceiptState(
  message: ChatMessage,
  otherRead: string | null
) {
  if (isChatMessageRead(message.sequence, otherRead)) return "read";
  return message.delivered_at ? "delivered" : "sent";
}

export const chatActionSchema = z.enum([
  "pin",
  "unpin",
  "mark_read",
  "mark_unread",
  "block",
  "unblock",
  "delete"
]);
export type ChatAction = z.infer<typeof chatActionSchema>;
export function isConversationUnread(row: ConversationSummary) {
  return row.marked_unread || row.unread_count > 0;
}

export function chatMessagePreview(message: ChatMessage) {
  return message.deleted_at
    ? "Message deleted"
    : message.body || (message.attachments?.length ? "Photo" : "Message");
}
