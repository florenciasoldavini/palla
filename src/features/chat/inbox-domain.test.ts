import { describe, expect, it } from "vitest";
import {
  flattenInboxPages,
  inboxCursorSchema,
  inboxPageSchema,
  type InboxPage
} from "./inbox-domain";
import type { ConversationSummary } from "./domain";
const row = (id: string): ConversationSummary => ({
  conversation: {
    id,
    organizer_id: "94000000-0000-4000-8000-000000000001",
    player_id: "94000000-0000-4000-8000-000000000002",
    source_session_id: null,
    created_at: "2026-10-15T10:00:00Z"
  },
  other_participant: {
    id: "94000000-0000-4000-8000-000000000002",
    first_name: "QA",
    last_name: null,
    avatar_url: null,
    playing_category: null
  },
  other_role: "player",
  last_message: null,
  unread_count: 0,
  pinned_at: null,
  marked_unread: false,
  other_read_sequence: null,
  source_session: null
});
const a = "95000000-0000-4000-8000-000000000001",
  b = "95000000-0000-4000-8000-000000000002",
  c = "95000000-0000-4000-8000-000000000003";
const page = (ids: string[]): InboxPage => ({
  conversations: ids.map(row),
  next_cursor: null,
  counts: { all: 65, unread: 40, total_unread: 40, badge: 80 }
});
describe("inbox page boundaries", () => {
  it("deduplicates a conversation moved between pages while preserving server order", () => {
    const pages = [page([b, a]), page([a, c])];
    expect(flattenInboxPages(pages).map((x) => x.conversation.id)).toEqual([
      b,
      a,
      c
    ]);
    expect(pages[1].conversations).toHaveLength(2);
  });
  it("retains full-inbox counts rather than deriving them from the loaded slice", () => {
    const parsed = inboxPageSchema.parse(page([a]));
    expect(parsed.conversations).toHaveLength(1);
    expect(parsed.counts).toEqual({
      all: 65,
      unread: 40,
      total_unread: 40,
      badge: 80
    });
  });
  it("requires all cursor tie-break fields and rejects oversized or malformed pages", () => {
    expect(
      inboxCursorSchema.safeParse({
        id: a,
        last_at: "2026-10-15T10:00:00Z",
        pinned_at: null
      }).success
    ).toBe(true);
    expect(
      inboxCursorSchema.safeParse({ id: a, last_at: null, pinned_at: null })
        .success
    ).toBe(false);
    expect(
      inboxCursorSchema.safeParse({ id: a, last_at: "2026-10-15T10:00:00Z" })
        .success
    ).toBe(false);
    expect(inboxPageSchema.safeParse(page(Array(51).fill(a))).success).toBe(
      false
    );
  });
});

describe("shared session filters", () => {
  it("uses current shared registrations, with Upcoming taking priority over Past", async () => {
    const { matchesInboxFilter } = await import("./inbox-domain");
    const base = row(a);
    const future = {
      ...base,
      session_context: {
        next_session: {
          id: b,
          title: "Next",
          starts_at: "2026-10-20T19:00:00Z",
          ends_at: "2026-10-20T20:30:00Z"
        },
        upcoming_count: 2,
        past_count: 3
      }
    };
    expect(matchesInboxFilter(future, "upcoming")).toBe(true);
    expect(matchesInboxFilter(future, "past")).toBe(false);
    expect(
      matchesInboxFilter(
        {
          ...future,
          session_context: {
            next_session: null,
            upcoming_count: 0,
            past_count: 3
          }
        },
        "past"
      )
    ).toBe(true);
    expect(matchesInboxFilter(base, "upcoming")).toBe(false);
    expect(matchesInboxFilter(base, "past")).toBe(false);
    expect(matchesInboxFilter({ ...base, marked_unread: true }, "unread")).toBe(
      true
    );
  });
});
