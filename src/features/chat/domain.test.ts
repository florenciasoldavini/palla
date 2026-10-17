import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  chatReceiptState,
  conversationSummarySchema,
  isConversationUnread,
  typingPayloadSchema,
  isChatMessageRead,
  mergeChatMessages,
  sendMessageInputSchema
} from "./domain";
const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const message = chatMessageSchema.parse({
  id,
  conversation_id: id,
  sender_id: otherId,
  sequence: "9007199254740993",
  body: "See you at the club!",
  delivered_at: null,
  created_at: "2026-10-14T18:00:00Z"
});
describe("chat message contracts", () => {
  it("rejects blank and oversized messages and trims valid text", () => {
    expect(
      sendMessageInputSchema.safeParse({ id, conversation_id: id, body: "  " })
        .success
    ).toBe(false);
    expect(
      sendMessageInputSchema.safeParse({
        id,
        conversation_id: id,
        body: "a".repeat(4001)
      }).success
    ).toBe(false);
    expect(
      sendMessageInputSchema.parse({
        id,
        conversation_id: id,
        body: " Hello! "
      }).body
    ).toBe("Hello!");
  });
  it("does not accept client-selected senders or delivery timestamps", () => {
    expect(
      sendMessageInputSchema.safeParse({
        id,
        conversation_id: id,
        body: "Hello",
        sender_id: otherId
      }).success
    ).toBe(false);
    expect(
      sendMessageInputSchema.safeParse({
        id,
        conversation_id: id,
        body: "Hello",
        delivered_at: null,
        created_at: message.created_at
      }).success
    ).toBe(false);
  });
  it("reconciles retried and realtime messages once, preserving bigint ordering", () => {
    const earlier = { ...message, id: otherId, sequence: "9007199254740992" };
    expect(mergeChatMessages([message], [earlier, message])).toEqual([
      earlier,
      message
    ]);
  });
  it("rejects numeric cursors instead of silently losing sequence precision", () => {
    expect(
      chatMessageSchema.safeParse({ ...message, sequence: 9007199254740992 })
        .success
    ).toBe(false);
  });
});

describe("recipient read receipts", () => {
  it("keeps unacknowledged and later messages unread", () => {
    expect(isChatMessageRead("2", null)).toBe(false);
    expect(isChatMessageRead("3", "2")).toBe(false);
  });
  it("marks messages at or before the recipient cursor read", () => {
    expect(isChatMessageRead("2", "2")).toBe(true);
    expect(isChatMessageRead("1", "2")).toBe(true);
  });
  it("preserves bigint precision at read boundaries", () => {
    expect(isChatMessageRead("9007199254740993", "9007199254740992")).toBe(
      false
    );
    expect(isChatMessageRead("9007199254740992", "9007199254740993")).toBe(
      true
    );
  });
});

describe("delivery indicators", () => {
  it("distinguishes saved, received and read with read taking precedence", () => {
    expect(chatReceiptState(message, null)).toBe("sent");
    const delivered = { ...message, delivered_at: message.created_at };
    expect(chatReceiptState(delivered, null)).toBe("delivered");
    expect(chatReceiptState(delivered, message.sequence)).toBe("read");
    expect(chatReceiptState(message, message.sequence)).toBe("read");
    expect(chatReceiptState(delivered, "9007199254740992")).toBe("delivered");
  });
  it("accepts only ephemeral boolean hints, never draft contents", () => {
    expect(
      typingPayloadSchema.safeParse({ actor_id: id, typing: true }).success
    ).toBe(true);
    expect(
      typingPayloadSchema.safeParse({ actor_id: id, typing: "true" }).success
    ).toBe(false);
    expect(
      typingPayloadSchema.safeParse({
        actor_id: id,
        typing: true,
        body: "private draft"
      }).success
    ).toBe(false);
  });
});

describe("message interactions", () => {
  it("requires tombstones to remove their body and retains revision metadata", () => {
    const deleted = {
      ...message,
      body: null,
      deleted_at: message.created_at,
      revision: 2
    };
    expect(chatMessageSchema.parse(deleted).body).toBeNull();
    expect(
      chatMessageSchema.safeParse({ ...deleted, body: "erased text" }).success
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({ ...message, body: null }).success
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({ ...message, revision: 0 }).success
    ).toBe(false);
  });
  it("treats personal unread as a reminder without inventing unread messages", () => {
    const row = conversationSummarySchema.parse({
      conversation: {
        id,
        organizer_id: id,
        player_id: otherId,
        source_session_id: null,
        created_at: message.created_at
      },
      other_participant: {
        id: otherId,
        first_name: null,
        last_name: null,
        avatar_url: null,
        playing_category: null
      },
      other_role: "player",
      last_message: message,
      unread_count: 0,
      source_session: null,
      marked_unread: true
    });
    expect(isConversationUnread(row)).toBe(true);
    expect(row.unread_count).toBe(0);
    expect(isConversationUnread({ ...row, marked_unread: false })).toBe(false);
  });
});

describe("replies and padel reactions", () => {
  it("accepts an optional reply target but never client-authored quote text", () => {
    const input = {
      id,
      conversation_id: id,
      body: "Ready!",
      reply_to_id: otherId
    };
    expect(sendMessageInputSchema.parse(input).reply_to_id).toBe(otherId);
    expect(
      sendMessageInputSchema.safeParse({ ...input, reply: { body: "spoof" } })
        .success
    ).toBe(false);
  });
  it("rejects leaked text in unavailable or deleted quotes", () => {
    const reply = {
      id: otherId,
      sender_id: null,
      sequence: null,
      body: null,
      deleted_at: null,
      available: false
    };
    expect(chatMessageSchema.safeParse({ ...message, reply }).success).toBe(
      true
    );
    expect(
      chatMessageSchema.safeParse({
        ...message,
        reply: { ...reply, body: "cleared history" }
      }).success
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({
        ...message,
        reply: {
          ...reply,
          available: true,
          sender_id: otherId,
          sequence: "1",
          deleted_at: message.created_at,
          body: "deleted text"
        }
      }).success
    ).toBe(false);
  });
  it("limits reactions to the supported set and two participants", () => {
    expect(
      chatMessageSchema.safeParse({
        ...message,
        reactions: [{ profile_id: id, emoji: "🎾" }]
      }).success
    ).toBe(true);
    expect(
      chatMessageSchema.safeParse({
        ...message,
        reactions: [{ profile_id: id, emoji: "🦄" }]
      }).success
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({
        ...message,
        reactions: Array.from({ length: 3 }, () => ({
          profile_id: id,
          emoji: "🎾"
        }))
      }).success
    ).toBe(false);
  });
});
