import { describe, expect, it, vi } from "vitest";
import { fetchVenueMapLocation } from "../repositories/venue-map.repository";
import {
  loadVenueMapLocation,
  selectVenueMapLocation
} from "./venue-map.service";
vi.mock("../repositories/venue-map.repository", () => ({
  fetchVenueMapLocation: vi.fn()
}));
const point = (
  properties: Record<string, string>,
  coordinates = [-58.42, -34.58]
) => ({ geometry: { type: "Point", coordinates }, properties });

describe("venue map locations", () => {
  it("selects the neighborhood instead of an unrelated POI within it", () => {
    expect(
      selectVenueMapLocation(
        {
          features: [
            point({ osm_key: "aeroway", type: "house" }, [-58.414, -34.559]),
            point({ osm_key: "place", type: "district" })
          ]
        },
        "Palermo, Buenos Aires"
      )
    ).toEqual({ longitude: -58.42, latitude: -34.58 });
  });
  it("prefers a matching house number over a street or city center", () => {
    expect(
      selectVenueMapLocation(
        {
          features: [
            point({ osm_key: "place" }),
            point({ osm_key: "building", housenumber: "1234" }, [-58.4, -34.6])
          ]
        },
        "Calle 1234, Buenos Aires"
      )
    ).toEqual({ longitude: -58.4, latitude: -34.6 });
  });
  it("does not invent coordinates for unresolved, invalid or POI-only results", () => {
    expect(selectVenueMapLocation({ features: [] }, "Unknown")).toBeNull();
    expect(
      selectVenueMapLocation(
        { features: [point({ osm_key: "place" }, [999, 999])] },
        "Address"
      )
    ).toBeNull();
    expect(
      selectVenueMapLocation(
        { features: [point({ osm_key: "tourism", type: "house" })] },
        "Address"
      )
    ).toBeNull();
  });
  it("does not call the provider for missing addresses", async () => {
    expect(await loadVenueMapLocation(" ")).toBeNull();
    expect(fetchVenueMapLocation).not.toHaveBeenCalled();
  });
  it("passes cancellation through the repository", async () => {
    vi.mocked(fetchVenueMapLocation).mockResolvedValue({
      features: [point({ osm_key: "place" })]
    });
    const signal = new AbortController().signal;
    await loadVenueMapLocation("  Palermo  ", signal);
    expect(fetchVenueMapLocation).toHaveBeenCalledWith("Palermo", signal);
  });
});
