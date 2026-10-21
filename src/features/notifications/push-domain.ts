import { z } from "zod";

export const chatPushSchema = z.object({
  type: z.literal("chat_message"),
  conversation_id: z.uuid(),
  message_id: z.uuid(),
  recipient_id: z.uuid()
});
export function parseChatPush(data: unknown) {
  const result = chatPushSchema.safeParse(data);
  return result.success ? result.data : null;
}
export function shouldPresentChatPush(
  data: unknown,
  actor: string | undefined,
  openConversation: string | undefined
) {
  const push = parseChatPush(data);
  return (
    !!push &&
    push.recipient_id === actor &&
    push.conversation_id !== openConversation
  );
}
