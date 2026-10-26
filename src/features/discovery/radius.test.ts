import { describe, expect, it } from "vitest";
import { radiusKilometers, discoveryRadiusSchema } from "./radius";
import { defaultFilters, hasFilters } from "./domain";
import { rankPreviewSessions } from "./preview-sorting";
import type { DiscoverySession } from "./domain";
describe("Discovery radius", () => {
  it("has an explicit unlimited default and bounded choices", () => {
    expect(radiusKilometers("any")).toBeNull();
    expect(
      ["5", "10", "25"].map((v) =>
        radiusKilometers(discoveryRadiusSchema.parse(v))
      )
    ).toEqual([5, 10, 25]);
    expect(discoveryRadiusSchema.safeParse("0").success).toBe(false);
    expect(discoveryRadiusSchema.safeParse("500").success).toBe(false);
    expect(hasFilters(defaultFilters)).toBe(false);
    expect(hasFilters({ ...defaultFilters, radius: "5" })).toBe(true);
  });
  it("QA fixtures exclude unknown/outside coordinates without changing chosen ordering", () => {
    const session = (
      id: string,
      km: number | null,
      price: number
    ): DiscoverySession => ({
      id,
      title: id,
      starts_at: "2027-01-01T12:00:00Z",
      ends_at: "2027-01-01T13:00:00Z",
      timezone: "UTC",
      capacity: 4,
      confirmed_count: 0,
      waitlist_enabled: false,
      waitlist_capacity: null,
      waitlisted_count: 0,
      allowed_categories: null,
      price_minor: price,
      currency: "ARS",
      registration_opens_at: null,
      registration_closes_at: null,
      viewer_registration: null,
      viewer_is_host: false,
      venue: {
        id,
        name: id,
        address: null,
        latitude: km === null ? null : 0,
        longitude: km === null ? null : ((km / 6371) * 180) / Math.PI
      }
    });
    const sessions = [
      session("a", 4, 200),
      session("b", 8, 100),
      session("c", 20, 50),
      session("d", null, 0)
    ];
    expect(
      rankPreviewSessions(
        sessions,
        "price",
        { latitude: 0, longitude: 0 },
        "5"
      ).map((s) => s.id)
    ).toEqual(["a"]);
    expect(
      rankPreviewSessions(
        sessions,
        "price",
        { latitude: 0, longitude: 0 },
        "10"
      ).map((s) => s.id)
    ).toEqual(["b", "a"]);
    expect(
      rankPreviewSessions(
        sessions,
        "nearest",
        { latitude: 0, longitude: 0 },
        "25"
      ).map((s) => s.id)
    ).toEqual(["a", "b", "c"]);
    expect(
      rankPreviewSessions(sessions, "price", null).map((s) => s.id)
    ).toEqual(["d", "c", "b", "a"]);
  });
});
