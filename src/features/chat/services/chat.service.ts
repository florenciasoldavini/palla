import { chatSearchPageSchema, chatSearchTermSchema } from "../search-domain";
import { z } from "zod";
import {
  chatMessageSchema,
  messageBodySchema,
  messageSequenceSchema,
  reactionEmojiSchema,
  type ReactionEmoji,
  chatActionSchema,
  type ChatAction,
  conversationSchema,
  conversationSummarySchema,
  markConversationReadInputSchema,
  sendMessageInputSchema,
  type SendMessageInput
} from "../domain";
import { entityIdSchema } from "@/types/domain-schema";
import * as repository from "../repositories/chat.repository";
import {
  inboxPageSchema,
  inboxCursorSchema,
  inboxFilterSchema,
  type InboxFilter,
  type InboxCursor
} from "../inbox-domain";
export async function loadInboxPage(
  search = "",
  unread = false,
  cursor?: InboxCursor,
  filter?: InboxFilter
) {
  return inboxPageSchema.parse(
    await repository.fetchInboxPage(
      z.string().trim().max(200).parse(search),
      z.boolean().parse(unread),
      cursor ? inboxCursorSchema.parse(cursor) : undefined,
      filter ? inboxFilterSchema.parse(filter) : undefined
    )
  );
}
export async function loadConversations(id?: string) {
  return z
    .array(conversationSummarySchema)
    .parse(
      await repository.fetchConversations(
        id ? entityIdSchema.parse(id) : undefined
      )
    );
}
export async function loadMessages(id: string, before?: string) {
  return z
    .array(chatMessageSchema)
    .parse(await repository.fetchMessages(entityIdSchema.parse(id), before));
}
export async function loadConversationEntry(id: string, actorId: string) {
  const conversationId = entityIdSchema.parse(id);
  const actor = entityIdSchema.parse(actorId);
  const [rows, position] = await Promise.all([
    loadConversations(conversationId),
    repository.fetchReadPosition(conversationId, actor)
  ]);
  const read = z
    .object({
      through_sequence: z.union([z.literal("0"), messageSequenceSchema])
    })
    .nullable()
    .parse(position);
  return rows[0]
    ? { ...rows[0], read_sequence: read?.through_sequence ?? "0" }
    : null;
}
export async function loadChatMessage(id: string) {
  return chatMessageSchema
    .nullable()
    .parse(await repository.fetchMessage(entityIdSchema.parse(id)));
}
export async function beginConversation(
  organizerId: string,
  playerId: string,
  sessionId?: string
) {
  return conversationSchema.parse(
    await repository.startConversation(
      entityIdSchema.parse(organizerId),
      entityIdSchema.parse(playerId),
      sessionId ? entityIdSchema.parse(sessionId) : undefined
    )
  );
}
export async function sendMessage(input: SendMessageInput) {
  return chatMessageSchema.parse(
    await repository.writeMessage(sendMessageInputSchema.parse(input))
  );
}
export async function markRead(id: string, through: string) {
  const input = markConversationReadInputSchema.parse({
    conversation_id: id,
    through_sequence: through
  });
  await repository.writeReadPosition(
    input.conversation_id,
    input.through_sequence
  );
}
export const subscribeToChat = repository.watchChat;

export async function acknowledgeDeliveries(ids: string[]) {
  await repository.writeDeliveries(
    z.array(entityIdSchema).min(1).max(100).parse(ids)
  );
}
export const subscribeToTyping = repository.watchTyping;

export async function editChatMessage(input: {
  id: string;
  body: string;
  revision: number;
}) {
  return chatMessageSchema.parse(
    await repository.editMessage(
      entityIdSchema.parse(input.id),
      messageBodySchema.parse(input.body),
      z.number().int().positive().parse(input.revision)
    )
  );
}
export async function deleteChatMessage(input: {
  id: string;
  revision: number;
}) {
  return chatMessageSchema.parse(
    await repository.deleteMessage(
      entityIdSchema.parse(input.id),
      z.number().int().positive().parse(input.revision)
    )
  );
}
export async function setChatReaction(input: {
  id: string;
  emoji: ReactionEmoji | null;
}) {
  return chatMessageSchema.parse(
    await repository.setReaction(
      entityIdSchema.parse(input.id),
      reactionEmojiSchema.nullable().parse(input.emoji)
    )
  );
}
export async function updateChatPreferences(input: {
  id: string;
  action: ChatAction;
}) {
  const id = entityIdSchema.parse(input.id);
  const action = chatActionSchema.parse(input.action);
  if (action === "block" || action === "unblock") {
    await repository.setBlock(id, action === "block");
    repository.refreshOnlineTopics();
  } else await repository.updatePreferences(id, action);
}

export { copyText as copyChatText } from "@/infrastructure/clipboard/copy-text";

export async function sendQueuedChatMessage(
  actor: string,
  input: SendMessageInput,
  signal: AbortSignal
) {
  entityIdSchema.parse(actor);
  return chatMessageSchema.parse(
    await repository.writeQueuedMessage(
      actor,
      sendMessageInputSchema.parse(input),
      signal
    )
  );
}

export { watchOnline as subscribeToOnline } from "../repositories/chat-presence.repository";

export async function loadConversationSearch(
  id: string,
  term: string,
  index: number
) {
  return chatSearchPageSchema.parse(
    await repository.fetchConversationSearch(
      entityIdSchema.parse(id),
      chatSearchTermSchema.parse(term),
      z.number().int().nonnegative().parse(index)
    )
  );
}
