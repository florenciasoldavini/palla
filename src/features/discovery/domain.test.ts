import { describe, expect, it } from "vitest";
import {
  discoverySessionSchema,
  eligibleSession,
  inBounds,
  sections,
  sessionStatus,
  waitlistOpen
} from "./domain";
const now = Date.parse("2026-10-22T15:00:00Z");
function session(id: string, starts: string) {
  return discoverySessionSchema.parse({
    id,
    title: "Social padel",
    starts_at: starts,
    ends_at: "2026-10-25T23:00:00Z",
    timezone: "America/Argentina/Buenos_Aires",
    capacity: 4,
    confirmed_count: 2,
    waitlist_enabled: true,
    waitlist_capacity: 2,
    waitlisted_count: 0,
    allowed_categories: null,
    price_minor: 1200000,
    currency: "ARS",
    registration_opens_at: null,
    registration_closes_at: null,
    viewer_registration: null,
    viewer_is_host: false,
    venue: {
      id: "df100000-0000-4000-8000-000000000001",
      name: "Club",
      address: "Buenos Aires"
    }
  });
}
const a = session(
  "df300000-0000-4000-8000-000000000001",
  "2026-10-22T16:00:00Z"
);
describe("Discover eligibility and grouping", () => {
  it("excludes closed, unopened and already started sessions at the exact boundary", () => {
    expect(
      eligibleSession(
        { ...a, registration_closes_at: new Date(now).toISOString() },
        now
      )
    ).toBe(false);
    expect(
      eligibleSession(
        { ...a, registration_opens_at: new Date(now + 1).toISOString() },
        now
      )
    ).toBe(false);
    expect(
      eligibleSession({ ...a, starts_at: new Date(now).toISOString() }, now)
    ).toBe(false);
    expect(
      eligibleSession(
        { ...a, registration_opens_at: new Date(now).toISOString() },
        now
      )
    ).toBe(true);
  });
  it("sorts disjoint sections using each session's local date", () => {
    const b = session(
      "df300000-0000-4000-8000-000000000002",
      "2026-10-23T01:00:00Z"
    );
    const c = session(
      "df300000-0000-4000-8000-000000000003",
      "2026-10-23T15:00:00Z"
    );
    const result = sections([c, b, a], now);
    expect(result.soon.map((s) => s.id)).toEqual([a.id]);
    expect(result.today.map((s) => s.id)).toEqual([b.id]);
    expect(result.upcoming.map((s) => s.id)).toEqual([c.id]);
  });
  it("shows own registration before scarcity and enforces waitlist capacity", () => {
    const full = { ...a, confirmed_count: 4 };
    expect(waitlistOpen(full)).toBe(true);
    expect(waitlistOpen({ ...full, waitlisted_count: 2 })).toBe(false);
    expect(waitlistOpen({ ...full, waitlist_enabled: false })).toBe(false);
    expect(
      sessionStatus({ ...full, viewer_registration: "waitlisted" }, now)
    ).toBe("Waitlisted");
    expect(
      sessionStatus({ ...full, viewer_registration: "confirmed" }, now)
    ).toBe("Registered");
  });
  it("handles viewport bounds across the antimeridian", () => {
    const b = { west: 170, east: -170, north: 10, south: -10 };
    expect(inBounds({ longitude: -179, latitude: 0 }, b)).toBe(true);
    expect(inBounds({ longitude: 179, latitude: 0 }, b)).toBe(true);
    expect(inBounds({ longitude: 0, latitude: 0 }, b)).toBe(false);
  });
});
