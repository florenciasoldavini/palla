import { describe, expect, it, vi } from "vitest";
import { coverPathSchema, effectiveCover } from "./domain";
import {
  matchesVenue,
  resolveGooglePhoto
} from "../../../supabase/functions/session-cover/google-photo";
const venue = {
  name: "Club Padel Palermo",
  address: "Example Street 123, Buenos Aires",
  google_place_id: null
};
const photo = {
  displayName: { text: venue.name },
  formattedAddress: venue.address,
  photos: [
    {
      name: "places/club/photos/photo",
      authorAttributions: [
        { displayName: "Photographer", uri: "https://maps.google.com/profile" }
      ],
      googleMapsUri: "https://maps.google.com/photo"
    }
  ]
};
describe("session covers", () => {
  it("uses an occurrence override before its inherited series cover", () => {
    expect(effectiveCover("one.jpg", "series.jpg")).toBe("one.jpg");
    expect(effectiveCover(null, "series.jpg")).toBe("series.jpg");
    expect(effectiveCover(null, null)).toBeNull();
  });
  it("rejects URLs and path traversal as storage keys", () => {
    expect(
      coverPathSchema.safeParse("https://example.com/image.jpg").success
    ).toBe(false);
    expect(coverPathSchema.safeParse("../another-user/image.jpg").success).toBe(
      false
    );
  });
  it("requires the venue name and address, including its street number", () => {
    expect(matchesVenue(venue, photo)).toBe(true);
    expect(
      matchesVenue(venue, {
        ...photo,
        formattedAddress: "Example Street 999, Buenos Aires"
      })
    ).toBe(false);
    expect(
      matchesVenue(venue, { ...photo, displayName: { text: "Other club" } })
    ).toBe(false);
  });
  it("returns fresh photo URI and author/source credits without exposing the API key", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ places: [photo] }))
      .mockResolvedValueOnce(
        Response.json({ photoUri: "https://lh3.googleusercontent.com/photo" })
      );
    const result = await resolveGooglePhoto(venue, "server-secret", fetcher);
    expect(result?.source).toBe("google");
    expect(result?.authors[0].name).toBe("Photographer");
    expect(result?.googleMapsUrl).toBe("https://maps.google.com/photo");
    expect(JSON.stringify(result)).not.toContain("server-secret");
  });
  it("searches by venue when its saved Google place ID is no longer valid", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ places: [photo] }))
      .mockResolvedValueOnce(
        Response.json({ photoUri: "https://lh3.googleusercontent.com/photo" })
      );
    expect(
      (
        await resolveGooglePhoto(
          { ...venue, google_place_id: "stale-id" },
          "key",
          fetcher
        )
      )?.source
    ).toBe("google");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("does not pick a photo when more than one branch matches", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ places: [photo, photo] }));
    expect(await resolveGooglePhoto(venue, "key", fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects non-Google or insecure photo URLs", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ places: [photo] }))
      .mockResolvedValueOnce(
        Response.json({ photoUri: "http://untrusted.example/photo" })
      );
    expect(await resolveGooglePhoto(venue, "key", fetcher)).toBeNull();
  });
});
