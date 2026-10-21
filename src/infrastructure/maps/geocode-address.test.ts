import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "./geocode-address";

afterEach(() => vi.unstubAllGlobals());
describe("map address provider", () => {
  it("sends only the address query and no account credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await geocodeAddress("A & B #2")).toEqual({ features: [] });
    const [input, options] = fetchMock.mock.calls[0];
    const url = new URL(input);
    expect(url.searchParams.get("q")).toBe("A & B #2");
    expect(options.headers).toEqual({ Accept: "application/json" });
  });
  it("propagates cancellation to a pending request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(new Error("cancelled"))
            );
          })
      )
    );
    const controller = new AbortController();
    const pending = geocodeAddress("Address", controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow("cancelled");
  });
  it("surfaces provider rejection without silently using guessed coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    );
    await expect(geocodeAddress("Address")).rejects.toThrow(
      "Map location unavailable"
    );
  });
});
