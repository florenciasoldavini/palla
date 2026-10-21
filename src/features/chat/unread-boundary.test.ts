import { describe, expect, it } from "vitest";
import type { ChatMessage } from "./domain";
import { unreadDividerMessageId as boundary } from "./unread-boundary";

const message = (
  sequence: string,
  sender = "peer",
  deleted = false
): ChatMessage => ({
  id: sequence,
  sequence,
  sender_id: sender,
  conversation_id: "chat",
  body: deleted ? null : "Hello",
  deleted_at: deleted ? "2026-10-16T12:00:00Z" : null,
  edited_at: null,
  created_at: "2026-10-16T12:00:00Z",
  delivered_at: null,
  revision: 1
});
describe("unread entry boundary", () => {
  it("marks the first incoming non-deleted unread message, irrespective of sort order", () => {
    expect(
      boundary(
        [
          message("6"),
          message("5", "me"),
          message("3"),
          message("4", "peer", true)
        ],
        "me",
        { through: "3", latest: "6" },
        false
      )
    ).toBe("6");
  });
  it("does not invent a boundary for read chats, manual-unread reminders or later arrivals", () => {
    const rows = [message("2"), message("3")];
    expect(
      boundary(rows, "me", { through: "2", latest: "2" }, false)
    ).toBeNull();
    expect(boundary(rows, "me", null, false)).toBeNull();
    expect(boundary([], "me", { through: "0", latest: "2" }, false)).toBeNull();
  });
  it("waits until paginated history covers the saved read position", () => {
    const entry = { through: "2", latest: "6" };
    expect(
      boundary([message("5"), message("6")], "me", entry, true)
    ).toBeNull();
    expect(
      boundary([message("2"), message("3"), message("5")], "me", entry, true)
    ).toBe("3");
    expect(boundary([message("3"), message("5")], "me", entry, false)).toBe(
      "3"
    );
  });
  it("keeps a fixed entry boundary after adding older history and receiving new messages", () => {
    const entry = { through: "2", latest: "4" };
    expect(
      boundary(
        [message("1"), message("2"), message("3"), message("4"), message("5")],
        "me",
        entry,
        false
      )
    ).toBe("3");
  });
  it("compares bigint sequences without losing precision", () => {
    expect(
      boundary(
        [message("9007199254740993"), message("9007199254740992")],
        "me",
        { through: "9007199254740992", latest: "9007199254740993" },
        false
      )
    ).toBe("9007199254740993");
  });
});
