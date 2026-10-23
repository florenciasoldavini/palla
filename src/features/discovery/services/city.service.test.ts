import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  reverse: vi.fn(),
  gps: vi.fn()
}));
vi.mock("../repositories/city.repository", () => ({
  searchCities: mocks.search,
  locateCity: mocks.reverse
}));
vi.mock("./discovery-location.service", () => ({
  locateForDiscovery: mocks.gps
}));
import { findCities, detectDiscoveryCity } from "./city.service";
const city = {
  id: 3435910,
  name: "Buenos Aires",
  region: "Buenos Aires F.D.",
  country_code: "AR",
  country: "Argentina",
  latitude: -34.61315,
  longitude: -58.37723
};
describe("Discovery city search", () => {
  beforeEach(() => vi.resetAllMocks());
  it("does not send short searches and forwards cancellation for real searches", async () => {
    expect(await findCities(" S ")).toEqual([]);
    expect(mocks.search).not.toHaveBeenCalled();
    mocks.search.mockResolvedValue([city]);
    const signal = new AbortController().signal;
    expect(await findCities(" Buenos ", signal)).toEqual([city]);
    expect(mocks.search).toHaveBeenCalledWith("Buenos", signal);
  });
  it("rejects malformed provider coordinates instead of saving them", async () => {
    mocks.search.mockResolvedValue([{ ...city, latitude: 100 }]);
    await expect(findCities("Buenos")).rejects.toThrow();
  });
  it("resolves a real foreground fix to a confirmable city without storing GPS", async () => {
    const point = { latitude: -34.6, longitude: -58.4 };
    mocks.gps.mockResolvedValue(point);
    mocks.reverse.mockResolvedValue(city);
    await expect(detectDiscoveryCity()).resolves.toEqual(city);
    expect(mocks.reverse).toHaveBeenCalledWith(point, expect.any(AbortSignal));
  });
  it("preserves permission errors and skips reverse lookup", async () => {
    mocks.gps.mockRejectedValue(new Error("Location access is off."));
    await expect(detectDiscoveryCity()).rejects.toThrow(
      "Location access is off."
    );
    expect(mocks.reverse).not.toHaveBeenCalled();
  });
  it("uses city-specific recovery when the shared GPS acquisition times out", async () => {
    mocks.gps.mockRejectedValue(
      new Error(
        "Couldn’t find your location. Try again or choose another sort."
      )
    );
    await expect(detectDiscoveryCity()).rejects.toThrow(
      "Couldn’t detect your city. Search for it instead"
    );
    expect(mocks.reverse).not.toHaveBeenCalled();
  });
  it("offers manual search when GPS has no nearby catalog city", async () => {
    mocks.gps.mockResolvedValue({ latitude: 0, longitude: 0 });
    mocks.reverse.mockResolvedValue(null);
    await expect(detectDiscoveryCity()).rejects.toThrow(
      "Search for your city instead"
    );
  });
});
