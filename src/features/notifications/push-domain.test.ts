import { describe, expect, it } from "vitest";
import { parseChatPush, shouldPresentChatPush } from "./push-domain";
const data = {
  type: "chat_message",
  conversation_id: "a2000000-0000-4000-8000-000000000001",
  message_id: "a4000000-0000-4000-8000-000000000001",
  recipient_id: "a1000000-0000-4000-8000-000000000002"
};
describe("chat push routing", () => {
  it("accepts only typed UUID payloads, never arbitrary URLs", () => {
    expect(parseChatPush({ url: "https://untrusted.example" })).toBeNull();
    expect(
      parseChatPush({ ...data, conversation_id: "../../sign-in" })
    ).toBeNull();
    expect(parseChatPush(data)).toEqual(data);
  });
  it("suppresses another account and the chat already open", () => {
    expect(shouldPresentChatPush(data, undefined, undefined)).toBe(false);
    expect(shouldPresentChatPush(data, "another-account", undefined)).toBe(
      false
    );
    expect(
      shouldPresentChatPush(data, data.recipient_id, data.conversation_id)
    ).toBe(false);
    expect(shouldPresentChatPush(data, data.recipient_id, undefined)).toBe(
      true
    );
  });
});
