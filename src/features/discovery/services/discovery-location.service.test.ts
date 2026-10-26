import { afterEach, describe, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/location/current-location", () => ({
  readCurrentLocation: read
}));
import { locateForDiscovery } from "./discovery-location.service";
describe("Explicit discovery location fix", () => {
  afterEach(() => {
    vi.useRealTimers();
    read.mockReset();
  });
  it("accepts a valid point including zero coordinates", async () => {
    read.mockResolvedValue({ latitude: 0, longitude: 0 });
    await expect(locateForDiscovery()).resolves.toEqual({
      latitude: 0,
      longitude: 0
    });
  });
  it("rejects invalid native coordinates", async () => {
    read.mockResolvedValue({ latitude: 95, longitude: NaN });
    await expect(locateForDiscovery()).rejects.toThrow();
  });
  it("keeps permission failure actionable", async () => {
    read.mockRejectedValue(new Error("Location access is off."));
    await expect(locateForDiscovery()).rejects.toThrow(
      "Location access is off."
    );
  });
  it("bounds a stalled native fix and ignores its eventual result", async () => {
    vi.useFakeTimers();
    let finish!: (point: { latitude: number; longitude: number }) => void;
    read.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = expect(locateForDiscovery()).rejects.toThrow(
      "Couldn’t find your location"
    );
    await vi.advanceTimersByTimeAsync(20000);
    await pending;
    finish({ latitude: 1, longitude: 1 });
    expect(vi.getTimerCount()).toBe(0);
  });
});
