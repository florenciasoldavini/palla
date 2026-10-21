import { describe, expect, it, vi } from "vitest";
import { fetchPublicSession } from "../repositories/public-session.repository";
import {
  loadPublicSession,
  publicSessionLink,
  venueDirectionsUrl
} from "./public-session.service";
vi.mock("../repositories/public-session.repository", () => ({
  fetchPublicSession: vi.fn()
}));

const id = "11111111-1111-4111-8111-111111111111";
describe("public session links", () => {
  it("shares exactly one occurrence on the configured origin", () => {
    expect(publicSessionLink(id, "https://palla-pink.vercel.app/nested/")).toBe(
      `https://palla-pink.vercel.app/session?id=${id}`
    );
  });
  it("never shares a development localhost address", () => {
    expect(publicSessionLink(id, "http://localhost:8081")).toBe(
      `https://palla-pink.vercel.app/session?id=${id}`
    );
  });
  it("rejects unsafe base protocols and invalid IDs", () => {
    expect(() => publicSessionLink(id, "javascript:alert(1)")).toThrow();
    expect(() => publicSessionLink("/private")).toThrow();
  });
  it("does not request malformed public IDs", async () => {
    expect(await loadPublicSession("bad-id")).toBeNull();
    expect(fetchPublicSession).not.toHaveBeenCalled();
  });
  it("does not invent directions for a missing location", () => {
    expect(
      venueDirectionsUrl({ name: null, address: null, google_place_id: null })
    ).toBeNull();
  });
  it("encodes venue names, addresses and place IDs", () => {
    const url = venueDirectionsUrl({
      name: "Club A & B",
      address: "Calle 1 #2",
      google_place_id: "a/b"
    });
    expect(url).toContain("Club%20A%20%26%20B");
    expect(url).toContain("query_place_id=a%2Fb");
  });
});
