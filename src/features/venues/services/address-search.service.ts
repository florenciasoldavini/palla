import { z } from "zod";
import {
  addressSuggestionsSchema,
  requestAddress
} from "../repositories/address-search.repository";
export async function searchAddresses(input: string, token: string) {
  return addressSuggestionsSchema.parse(
    await requestAddress({ action: "search", input, token })
  ).suggestions;
}
export async function resolveAddress(placeId: string, token: string) {
  return z
    .object({ address: z.string().min(1).max(300) })
    .parse(await requestAddress({ action: "details", placeId, token })).address;
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
