import { queryClient } from "@/lib/query-client";
import { z } from "zod";
import {
  addressSuggestionsSchema,
  addressSearchOwner,
  requestAddress
} from "../repositories/address-search.repository";
export async function searchAddresses(input: string, token: string) {
  return addressSuggestionsSchema.parse(
    await requestAddress({ action: "search", input, token })
  ).suggestions;
}
export const googleAddressSchema = z.object({
  address: z.string().min(1).max(300),
  placeId: z.string().min(1).max(512),
  reference: z.uuid(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
});
export type GoogleAddress = z.infer<typeof googleAddressSchema>;
const placeKey = (owner: string, id: string, address: string) => [
  "google-address-location",
  owner,
  id,
  address
];
export async function resolveAddress(placeId: string, token?: string) {
  const owner = await addressSearchOwner();
  const value = googleAddressSchema.parse(
    await requestAddress({ action: "details", placeId, token })
  );
  queryClient.setQueryData(placeKey(owner, placeId, value.address), value);
  return value;
}
export async function googleAddressForPublication(
  address: string,
  placeId?: string
) {
  const owner = await addressSearchOwner();
  if (placeId)
    return queryClient.fetchQuery({
      queryKey: placeKey(owner, placeId, address),
      queryFn: async () =>
        googleAddressSchema.parse(
          await requestAddress({ action: "details", placeId, input: address })
        ),
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: false
    });
  return googleAddressSchema.parse(
    await requestAddress({ action: "geocode", input: address })
  );
}
export function addressSearchError(error: unknown) {
  if (error instanceof Error && error.message === "monthly_limit")
    return "Address search has reached its monthly limit. Please enter the full street address.";
  if (error instanceof Error && error.message === "not_configured")
    return "Address search isn’t available yet. You can enter the full street address.";
  if (error instanceof Error && error.message === "rate_limit")
    return "Address search is busy. Wait a minute or enter the address.";
  return "We couldn’t search addresses. Try again or enter the full address.";
}
