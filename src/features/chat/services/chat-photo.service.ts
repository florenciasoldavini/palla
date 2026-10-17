import { z } from "zod";
import { entityIdSchema } from "@/types/domain-schema";
import { chatMessageSchema } from "../domain";
import { localPhotoSchema, type LocalPhoto } from "../attachment-domain";
import { photoRequest } from "../repositories/chat-photo.repository";
import * as files from "../repositories/photo-files";
import { OutboxSendError } from "../offline-errors";
export const selectChatPhoto = (actor: string) =>
  files.choosePhoto(entityIdSchema.parse(actor));
export const discardChatPhoto = (actor: string, photo: LocalPhoto) =>
  files.removePhoto(actor, photo);
export async function sendChatPhoto(
  actor: string,
  input: {
    id: string;
    conversation_id: string;
    body: string;
    reply_to_id?: string | null;
    photo: LocalPhoto;
  },
  signal: AbortSignal
) {
  const photo = localPhotoSchema.parse(input.photo);
  let base64: string;
  try {
    base64 = await files.readPhoto(actor, photo);
  } catch {
    throw new OutboxSendError(false);
  }
  if (signal.aborted) throw new OutboxSendError(true);
  const result = await photoRequest(
    {
      op: "send",
      id: entityIdSchema.parse(input.id),
      conversation_id: entityIdSchema.parse(input.conversation_id),
      body: z.string().trim().max(4000).parse(input.body),
      reply_to_id: input.reply_to_id ?? null,
      base64
    },
    actor,
    signal
  );
  return chatMessageSchema.parse(result.message);
}
export async function chatPhotoUrl(id: string) {
  return z
    .object({ url: z.url() })
    .parse(await photoRequest({ op: "access", id: entityIdSchema.parse(id) }))
    .url;
}
export async function saveChatPhoto(id: string) {
  await files.savePhoto(await chatPhotoUrl(id));
}
export const cleanupChatPhotos = () => photoRequest({ op: "cleanup" });

export const saveLocalChatPhoto = (photo: LocalPhoto) =>
  files.savePhoto(localPhotoSchema.parse(photo).uri);
