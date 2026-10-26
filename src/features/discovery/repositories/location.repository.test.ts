import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage
}));
import {
  readDiscoveryLocation,
  saveDiscoveryLocation
} from "./location.repository";
const city = {
  id: 3435910,
  name: "Buenos Aires",
  region: "Buenos Aires F.D.",
  country_code: "AR",
  country: "Argentina",
  latitude: -34.61315,
  longitude: -58.37723
};
describe("Saved discovery city", () => {
  beforeEach(() => vi.resetAllMocks());
  it("round trips a selected city as structured local data", async () => {
    await saveDiscoveryLocation(city);
    expect(storage.setItem).toHaveBeenCalledWith(
      "palla.discovery.city.v2",
      JSON.stringify(city)
    );
    storage.getItem.mockResolvedValueOnce(JSON.stringify(city));
    expect(await readDiscoveryLocation()).toEqual({
      city,
      location: "Buenos Aires, AR"
    });
  });
  it("preserves the previous free-text location until a city is selected", async () => {
    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("Palermo");
    expect(await readDiscoveryLocation()).toEqual({
      city: null,
      location: "Palermo"
    });
  });
  it("recovers from corrupt or invalid local records", async () => {
    for (const value of [
      "invalid json",
      JSON.stringify({ ...city, longitude: 999 })
    ]) {
      storage.getItem.mockResolvedValueOnce(value).mockResolvedValueOnce(null);
      expect(await readDiscoveryLocation()).toEqual({
        city: null,
        location: "Buenos Aires"
      });
    }
  });
  it("surfaces a failed save so the picker can offer retry", async () => {
    storage.setItem.mockRejectedValue(new Error("disk unavailable"));
    await expect(saveDiscoveryLocation(city)).rejects.toThrow(
      "disk unavailable"
    );
  });
});
