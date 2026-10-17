import { sendChatPhoto, discardChatPhoto } from "./chat-photo.service";
import { chatLocalStore } from "./chat-offline.service";
import { OutboxRunner } from "./outbox-runner";
import { sendQueuedChatMessage } from "./chat.service";
import { queryClient } from "@/lib/query-client";
import { mergeChatMessages, type ChatMessage } from "../domain";
import type { InfiniteData } from "@tanstack/react-query";
export const chatOutbox = new OutboxRunner(
  chatLocalStore,
  async (actor, row, signal) => {
    const message = row.photo
      ? await sendChatPhoto(actor, { ...row, photo: row.photo }, signal)
      : await sendQueuedChatMessage(
          actor,
          {
            id: row.id,
            conversation_id: row.conversation_id,
            body: row.body,
            reply_to_id: row.reply_to_id
          },
          signal
        );
    queryClient.setQueryData<InfiniteData<ChatMessage[]>>(
      ["chat-messages", actor, row.conversation_id],
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page, index) =>
                index === 0 ? mergeChatMessages(page, [message]) : page
              )
            }
          : { pages: [[message]], pageParams: [undefined] }
    );
    for (const key of ["chat-messages", "chat-conversation", "chat-inbox"])
      void queryClient.invalidateQueries({ queryKey: [key, actor] });
  },
  Date.now,
  async (actor, row) => {
    if (row.photo) await discardChatPhoto(actor, row.photo);
  }
);
