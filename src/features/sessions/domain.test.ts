import { describe, expect, it } from "vitest";
import {
  sessionInputSchema,
  sessionSchema,
  sessionSeriesInputSchema
} from "./domain";
import { venueInputSchema } from "@/features/venues/domain";
import {
  joinSessionInputSchema,
  registrationSchema
} from "@/features/registrations/domain";

const id = "00000000-0000-4000-8000-000000000001";
const content = {
  venue_id: id,
  title: "Tuesday social",
  description: null,
  court_label: null,
  capacity: 4,
  allowed_categories: [3, 4],
  strict_category_enforcement: false,
  participant_gender_policy: "all",
  visibility: "private",
  waitlist_enabled: false,
  waitlist_promotion_mode: "automatic",
  waitlist_capacity: null,
  price_minor: 10000,
  currency: "ARS",
  payment_instructions: null
};
const session = {
  ...content,
  starts_at: "2026-10-06T20:00:00-03:00",
  ends_at: "2026-10-06T21:30:00-03:00",
  registration_opens_at: null,
  registration_closes_at: "2026-10-06T22:00:00Z",
  cancellation_deadline_at: "2026-10-06T18:00:00-03:00"
};

describe("MVP domain boundaries", () => {
  it("compares session instants across timezone offsets", () => {
    expect(sessionInputSchema.safeParse(session).success).toBe(true);
    expect(
      sessionInputSchema.safeParse({
        ...session,
        ends_at: "2026-10-06T22:00:00Z"
      }).success
    ).toBe(false);
    expect(
      sessionInputSchema.safeParse({
        ...session,
        registration_closes_at: "2026-10-07T00:00:00Z"
      }).success
    ).toBe(false);
  });

  it("rejects partial or reversed level ranges and invalid capacity", () => {
    for (const patch of [
      { allowed_categories: [] },
      { allowed_categories: [5, 5] },
      { allowed_categories: [0, 9] },
      { capacity: 0 },
      { capacity: 2.5 }
    ]) {
      expect(
        sessionInputSchema.safeParse({ ...session, ...patch }).success
      ).toBe(false);
    }
    expect(
      sessionInputSchema.safeParse({
        ...session,
        allowed_categories: null
      }).success
    ).toBe(true);
  });

  it("requires stable series occurrence identity", () => {
    const record = {
      ...session,
      id,
      organizer_id: id,
      series_id: id,
      occurrence_date: "2026-10-06",
      status: "published",
      cancelled_at: null,
      cancellation_reason: null,
      created_at: session.starts_at,
      updated_at: session.starts_at
    };
    expect(sessionSchema.safeParse(record).success).toBe(true);
    expect(
      sessionSchema.safeParse({ ...record, occurrence_date: null }).success
    ).toBe(false);
    expect(
      sessionSchema.safeParse({ ...record, status: "cancelled" }).success
    ).toBe(false);
  });

  it("validates weekly schedule dates, times, and timezone", () => {
    const series = {
      ...content,
      timezone: "America/Argentina/Buenos_Aires",
      weekday: 2,
      local_start_time: "20:00",
      duration_minutes: 90,
      starts_on: "2026-10-06",
      ends_on: null,
      registration_opens_minutes_before: null,
      registration_closes_minutes_before: null,
      cancellation_notice_minutes: 120
    };
    expect(sessionSeriesInputSchema.safeParse(series).success).toBe(true);
    for (const patch of [
      { timezone: "Unknown/Place" },
      { weekday: 8 },
      { local_start_time: "25:00" },
      { ends_on: "2026-10-05" }
    ]) {
      expect(
        sessionSeriesInputSchema.safeParse({ ...series, ...patch }).success
      ).toBe(false);
    }
  });

  it("supports referenced and manually entered venues without requiring a full directory", () => {
    const venue = {
      google_place_id: "place-reference",
      name: null,
      address: null,
      arrival_instructions: null
    };
    expect(venueInputSchema.safeParse(venue).success).toBe(true);
    expect(
      venueInputSchema.safeParse({ ...venue, google_place_id: null }).success
    ).toBe(false);
    expect(
      venueInputSchema.safeParse({
        ...venue,
        google_place_id: null,
        name: "Club",
        address: "Address 123"
      }).success
    ).toBe(true);
  });

  it("does not accept client-selected player or registration status", () => {
    expect(joinSessionInputSchema.safeParse({ session_id: id }).success).toBe(
      true
    );
    expect(
      joinSessionInputSchema.safeParse({
        session_id: id,
        player_id: id,
        status: "confirmed"
      }).success
    ).toBe(false);
  });

  it("preserves large queue sequences and requires cancellation attribution", () => {
    const record = {
      id,
      session_id: id,
      player_id: id,
      status: "waitlisted",
      joined_at: session.starts_at,
      waitlist_sequence: "9007199254740993",
      confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      created_at: session.starts_at,
      updated_at: session.starts_at
    };
    expect(registrationSchema.parse(record).waitlist_sequence).toBe(
      "9007199254740993"
    );
    expect(
      registrationSchema.safeParse({
        ...record,
        status: "cancelled",
        cancelled_at: session.starts_at
      }).success
    ).toBe(false);
    expect(
      registrationSchema.safeParse({
        ...record,
        status: "cancelled",
        cancelled_at: session.starts_at,
        cancelled_by: id
      }).success
    ).toBe(true);
  });
});
