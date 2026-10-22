import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchVenueLocation,
  lookupAddressCoordinates
} from "../repositories/venue-location.repository";
import {
  coordinatesForPublication,
  selectPersistentVenueCoordinates
} from "./venue-location.service";
import { storedVenueCoordinates } from "../coordinates";
vi.mock("../repositories/venue-location.repository", () => ({
  fetchVenueLocation: vi.fn(),
  lookupAddressCoordinates: vi.fn()
}));
const address = "Avenida Santa Fe 4000, Buenos Aires";
const feature = (
  properties: Record<string, string>,
  coordinates = [-58.42, -34.58]
) => ({ geometry: { type: "Point", coordinates }, properties });
const exact = {
  features: [feature({ street: "Avenida Santa Fe", housenumber: "4000" })]
};
beforeEach(() => vi.resetAllMocks());
describe("persistent venue coordinates", () => {
  it("requires both finite coordinates and accepts zero", () => {
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
  it("persists a matching street and building, not an unrelated number or street centroid", () => {
    expect(selectPersistentVenueCoordinates(exact, address)).toEqual({
      latitude: -34.58,
      longitude: -58.42,
      address
    });
    for (const raw of [
      { features: [] },
      {
        features: [feature({ street: "Another street", housenumber: "4000" })]
      },
      {
        features: [feature({ street: "Avenida Santa Fe", housenumber: "4001" })]
      },
      { features: [feature({ street: "Avenida Santa Fe", type: "street" })] },
      {
        features: [
          feature({ street: "Avenida Santa Fe", housenumber: "4000" }, [
            999,
            NaN
          ])
        ]
      }
    ])
      expect(selectPersistentVenueCoordinates(raw, address)).toBeNull();
  });
  it("accepts common address abbreviations and rejects another city", () => {
    const raw = {
      features: [
        feature({
          street: "Avenida Santa Fe",
          housenumber: "4000",
          city: "Ciudad Autónoma de Buenos Aires"
        })
      ]
    };
    expect(
      selectPersistentVenueCoordinates(raw, "Av. Santa Fe 4000, CABA")
    ).not.toBeNull();
    expect(
      selectPersistentVenueCoordinates(
        {
          features: [
            feature({
              street: "Avenida Santa Fe",
              housenumber: "4000",
              city: "Rosario"
            })
          ]
        },
        address
      )
    ).toBeNull();
  });
  it("does not geocode an existing venue with stored coordinates", async () => {
    vi.mocked(fetchVenueLocation).mockResolvedValue({
      address,
      latitude: -34.58,
      longitude: -58.42
    });
    expect(await coordinatesForPublication("venue", address)).toBeNull();
    expect(lookupAddressCoordinates).not.toHaveBeenCalled();
  });
  it("uses the saved venue address, rather than editable form text", async () => {
    vi.mocked(fetchVenueLocation).mockResolvedValue({
      address,
      latitude: null,
      longitude: null
    });
    vi.mocked(lookupAddressCoordinates).mockResolvedValue(exact);
    expect(
      await coordinatesForPublication("venue", "Wrong address")
    ).toMatchObject({ address });
    expect(lookupAddressCoordinates).toHaveBeenCalledWith(address);
  });
  it("does not block publishing on provider errors or an incomplete address", async () => {
    vi.mocked(lookupAddressCoordinates).mockRejectedValue(new Error("Timeout"));
    expect(await coordinatesForPublication("", address)).toBeNull();
    expect(await coordinatesForPublication("", " ")).toBeNull();
  });
});
