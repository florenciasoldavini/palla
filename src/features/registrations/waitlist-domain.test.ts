import { describe, expect, it } from "vitest";
import {
  waitlistActionSchema,
  waitlistModeSchema,
  waitlistSchema
} from "./waitlist-domain";
const id = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-10-14T12:00:00Z";
const entry = {
  id,
  session_id: id,
  player_id: id,
  status: "waitlisted",
  joined_at: timestamp,
  waitlist_sequence: "9007199254740993",
  confirmed_at: null,
  checked_in_at: null,
  checked_in_by: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  created_at: timestamp,
  updated_at: timestamp,
  category_eligible: true,
  player: {
    first_name: "Sofía",
    last_name: null,
    avatar_url: null,
    playing_category: 6
  }
};
const waitlist = {
  session_id: id,
  session_version: timestamp,
  enabled: true,
  promotion_mode: "manual",
  capacity: 4,
  waitlist_capacity: null,
  confirmed_count: 3,
  blocked_reason: null,
  entries: [entry]
};
describe("organizer waitlist contracts", () => {
  it("preserves server queue order without losing bigint precision", () => {
    expect(waitlistSchema.parse(waitlist).entries[0].waitlist_sequence).toBe(
      "9007199254740993"
    );
  });
  it("rejects confirmed players in the waiting queue", () => {
    expect(
      waitlistSchema.safeParse({
        ...waitlist,
        entries: [{ ...entry, status: "confirmed", confirmed_at: timestamp }]
      }).success
    ).toBe(false);
  });
  it("requires a version and rejects injected actor/status fields", () => {
    expect(
      waitlistActionSchema.safeParse({ registration_id: id, action: "promote" })
        .success
    ).toBe(false);
    expect(
      waitlistActionSchema.safeParse({
        registration_id: id,
        action: "remove",
        expected_version: timestamp,
        cancelled_by: id
      }).success
    ).toBe(false);
  });
  it("limits promotion settings to supported modes and explicit session versions", () => {
    expect(
      waitlistModeSchema.safeParse({
        session_id: id,
        mode: "random",
        expected_version: timestamp
      }).success
    ).toBe(false);
    expect(
      waitlistModeSchema.parse({
        session_id: id,
        mode: "automatic",
        expected_version: timestamp
      }).mode
    ).toBe("automatic");
  });
});
