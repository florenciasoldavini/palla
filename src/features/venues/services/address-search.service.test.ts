import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import {
  addressSearchOwner,
  requestAddress
} from "../repositories/address-search.repository";
import {
  googleAddressForPublication,
  resolveAddress
} from "./address-search.service";
vi.mock("../repositories/address-search.repository", async () => {
  const { z } = await import("zod");
  return {
    addressSearchOwner: vi.fn(),
    requestAddress: vi.fn(),
    addressSuggestionsSchema: z.object({
      suggestions: z.array(z.object({ id: z.string(), label: z.string() }))
    })
  };
});
const location = {
  address: "Santa Fe 4000, Buenos Aires",
  placeId: "google-place",
  latitude: -34.58,
  longitude: -58.42,
  reference: "10000000-0000-4000-8000-000000000001"
};
beforeEach(() => {
  vi.resetAllMocks();
  queryClient.clear();
  vi.mocked(addressSearchOwner).mockResolvedValue("host-a");
});
afterEach(() => queryClient.clear());
it("reuses the selected Google location at publication without a second paid lookup", async () => {
  vi.mocked(requestAddress).mockResolvedValue(location);
  await resolveAddress("google-place", "autocomplete-token");
  expect(
    await googleAddressForPublication(location.address, "google-place")
  ).toEqual(location);
  expect(requestAddress).toHaveBeenCalledTimes(1);
});
it("never reuses another host's private location reference", async () => {
  vi.mocked(requestAddress).mockResolvedValueOnce(location);
  await resolveAddress("google-place", "autocomplete-token");
  vi.mocked(addressSearchOwner).mockResolvedValue("host-b");
  const second = {
    ...location,
    reference: "10000000-0000-4000-8000-000000000002"
  };
  vi.mocked(requestAddress).mockResolvedValueOnce(second);
  expect(
    await googleAddressForPublication(location.address, "google-place")
  ).toEqual(second);
  expect(requestAddress).toHaveBeenCalledTimes(2);
});
it("rejects malformed Google coordinates before caching a selected address", async () => {
  vi.mocked(requestAddress).mockResolvedValue({ ...location, latitude: 91 });
  await expect(resolveAddress("google-place")).rejects.toThrow();
  expect(
    queryClient.getQueryData([
      "google-address-location",
      "host-a",
      "google-place",
      location.address
    ])
  ).toBeUndefined();
});
