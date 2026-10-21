import { describe, expect, it } from "vitest";
import {
  attendeeSchema,
  attendanceInputSchema,
  registrationSchema
} from "./domain";
const id = "60000000-0000-4000-8000-000000000001";
const timestamp = "2026-10-14T18:00:00Z";
const registration = {
  id,
  session_id: id,
  player_id: id,
  status: "confirmed",
  joined_at: timestamp,
  confirmed_at: timestamp,
  waitlist_sequence: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  created_at: timestamp,
  updated_at: timestamp
};
describe("organizer attendance contracts", () => {
  it("supports legacy unchecked entries and complete arrival marks", () => {
    expect(registrationSchema.parse(registration).checked_in_at).toBeNull();
    expect(
      registrationSchema.parse({
        ...registration,
        checked_in_at: timestamp,
        checked_in_by: id
      }).checked_in_by
    ).toBe(id);
  });
  it("rejects partial or non-confirmed arrival marks", () => {
    expect(
      registrationSchema.safeParse({
        ...registration,
        checked_in_at: timestamp
      }).success
    ).toBe(false);
    expect(
      registrationSchema.safeParse({
        ...registration,
        status: "waitlisted",
        confirmed_at: null,
        waitlist_sequence: "9007199254740993",
        checked_in_at: timestamp,
        checked_in_by: id
      }).success
    ).toBe(false);
  });
  it("preserves bigint queue order as text in roster responses", () => {
    const entry = {
      ...registration,
      waitlist_sequence: "9007199254740993",
      player: {
        first_name: "QA",
        last_name: null,
        avatar_url: null,
        playing_category: 6
      }
    };
    expect(attendeeSchema.parse(entry).waitlist_sequence).toBe(
      "9007199254740993"
    );
    expect(
      attendeeSchema.safeParse({
        ...entry,
        waitlist_sequence: 9007199254740993
      }).success
    ).toBe(false);
  });
  it("requires a version and excludes caller-supplied attendance actors", () => {
    const input = {
      registration_id: id,
      arrived: true,
      expected_version: timestamp
    };
    expect(attendanceInputSchema.safeParse(input).success).toBe(true);
    expect(
      attendanceInputSchema.safeParse({ ...input, checked_in_by: id }).success
    ).toBe(false);
    expect(
      attendanceInputSchema.safeParse({ registration_id: id, arrived: true })
        .success
    ).toBe(false);
  });
});
