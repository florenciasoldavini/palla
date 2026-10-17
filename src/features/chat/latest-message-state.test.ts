import { describe, expect, it } from "vitest";
import type { ChatMessage } from "./domain";
import {
  advanceLatestMessages as advance,
  type LatestMessageState
} from "./latest-message-state";
const empty: LatestMessageState = { through: null, newIds: [] };
const message = (
  sequence: string,
  sender = "peer",
  deleted = false
): ChatMessage => ({
  id: sequence,
  sequence,
  sender_id: sender,
  conversation_id: "conversation",
  body: deleted ? null : "Hello",
  deleted_at: deleted ? "2026-10-16T12:00:00Z" : null,
  created_at: "2026-10-16T12:00:00Z",
  edited_at: null,
  revision: 1,
  delivered_at: null
});
describe("new messages while reading history", () => {
  it("starts without a badge and counts only later incoming arrivals once", () => {
    const first = advance(empty, [message("10")], "me", true);
    expect(first.newIds).toEqual([]);
    const rows = [
      message("10"),
      message("11"),
      message("12", "me"),
      message("13", "peer", true)
    ];
    const next = advance(first, rows, "me", true);
    expect(next.newIds).toEqual(["11"]);
    expect(
      advance(
        next,
        rows.map((m) => ({ ...m, revision: 2 })),
        "me",
        true
      ).newIds
    ).toEqual(["11"]);
  });
  it("does not count paginated older history or recount after returning to latest", () => {
    const first = advance(empty, [message("10")], "me", false);
    const next = advance(
      first,
      [message("1"), message("10"), message("11")],
      "me",
      true
    );
    expect(next.newIds).toEqual(["11"]);
    const cleared = advance(next, [message("10"), message("11")], "me", false);
    expect(cleared.newIds).toEqual([]);
    expect(
      advance(cleared, [message("1"), message("10"), message("11")], "me", true)
        .newIds
    ).toEqual([]);
  });
  it("removes deleted counted messages and preserves bigint precision", () => {
    const first = advance(empty, [message("9007199254740992")], "me", false);
    const next = advance(
      first,
      [message("9007199254740992"), message("9007199254740993")],
      "me",
      true
    );
    expect(next.newIds).toEqual(["9007199254740993"]);
    expect(
      advance(next, [message("9007199254740993", "peer", true)], "me", true)
        .newIds
    ).toEqual([]);
  });
});
