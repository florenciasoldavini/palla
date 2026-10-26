import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVenueLocation } from "../repositories/venue-location.repository";
import { googleAddressForPublication } from "./address-search.service";
import { coordinatesForPublication } from "./venue-location.service";
import { storedVenueCoordinates } from "../coordinates";
vi.mock("../repositories/venue-location.repository", () => ({
  fetchVenueLocation: vi.fn()
}));
vi.mock("./address-search.service", () => ({
  googleAddressForPublication: vi.fn()
}));
const address = "Avenida Santa Fe 4000, Buenos Aires";
const reference = "10000000-0000-4000-8000-000000000001";
beforeEach(() => vi.resetAllMocks());
describe("Google venue coordinates", () => {
  it("requires a finite pair and accepts zero", () => {
    expect(storedVenueCoordinates({ latitude: 0, longitude: 0 })).toEqual({
      latitude: 0,
      longitude: 0
    });
    for (const value of [
      {},
      { latitude: 1 },
      { latitude: NaN, longitude: 0 },
      { latitude: 91, longitude: 0 }
    ])
      expect(storedVenueCoordinates(value)).toBeNull();
  });
  it("reuses saved coordinates without a paid lookup", async () => {
    vi.mocked(fetchVenueLocation).mockResolvedValue({
      address,
      google_address_place_id: "google-place",
      latitude: -34.58,
      longitude: -58.42
    });
    expect(await coordinatesForPublication("venue", address)).toBeNull();
    expect(googleAddressForPublication).not.toHaveBeenCalled();
  });
  it("publishes only a server-verified reference, never raw client coordinates", async () => {
    vi.mocked(googleAddressForPublication).mockResolvedValue({
      address,
      placeId: "google-place",
      reference,
      latitude: -34.58,
      longitude: -58.42
    });
    expect(
      await coordinatesForPublication("", address, "google-place")
    ).toEqual({ reference });
    expect(googleAddressForPublication).toHaveBeenCalledWith(
      address,
      "google-place"
    );
  });
  it("uses the stored venue address and place ID instead of edited form text", async () => {
    vi.mocked(fetchVenueLocation).mockResolvedValue({
      address,
      google_address_place_id: "stored-place",
      latitude: null,
      longitude: null
    });
    vi.mocked(googleAddressForPublication).mockResolvedValue({
      address,
      placeId: "stored-place",
      reference,
      latitude: 0,
      longitude: 0
    });
    expect(
      await coordinatesForPublication("venue", "Wrong address", "wrong-id")
    ).toEqual({ reference });
    expect(googleAddressForPublication).toHaveBeenCalledWith(
      address,
      "stored-place"
    );
  });
  it("does not block publishing on a lookup failure or incomplete address", async () => {
    vi.mocked(googleAddressForPublication).mockRejectedValue(
      new Error("Timeout")
    );
    expect(await coordinatesForPublication("", address)).toBeNull();
    expect(await coordinatesForPublication("", " ")).toBeNull();
  });
});
