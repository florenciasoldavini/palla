import { randomUUID } from "expo-crypto";
import { chatLocalRepository as local } from "../repositories/chat-local.repository";
export { local as chatLocalStore };
export const saveChatDraft = (
  actor: string,
  conversation: string,
  body: string
) => local.saveDraft(actor, conversation, body);
export const queueChatMessage = (
  actor: string,
  conversation: string,
  body: string,
  replyTo?: string | null
) =>
  local.enqueue(actor, {
    id: randomUUID(),
    conversation_id: conversation,
    body,
    reply_to_id: replyTo ?? null
  });
export const retryQueuedMessage = (actor: string, id: string) =>
  local.patch(actor, id, {
    state: "queued",
    nextAttempt: 0,
    attempts: 0,
    failure: null
  });
export async function discardQueuedMessage(actor: string, id: string) {
  const row = (await local.load(actor)).outbox.find((r) => r.id === id);
  await local.discard(actor, id);
  if (row?.photo)
    await import("./chat-photo.service").then((m) =>
      m.discardChatPhoto(actor, row.photo!)
    );
}

export async function queuePhotoMessage(
  actor: string,
  conversation: string,
  body: string,
  photo: import("../attachment-domain").LocalPhoto,
  replyTo?: string | null
) {
  return local.enqueue(actor, {
    id: photo.id,
    conversation_id: conversation,
    body,
    photo,
    reply_to_id: replyTo ?? null
  });
}
