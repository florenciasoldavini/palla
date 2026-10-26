import { storedVenueCoordinates } from "../coordinates";
import { fetchVenueLocation } from "../repositories/venue-location.repository";
import { googleAddressForPublication } from "./address-search.service";
export async function coordinatesForPublication(
  venueId: string,
  address: string,
  placeId?: string
) {
  try {
    if (venueId) {
      const venue = await fetchVenueLocation(venueId);
      if (storedVenueCoordinates(venue)) return null;
      address = venue.address ?? "";
      placeId = venue.google_address_place_id ?? undefined;
    }
    address = address.trim();
    if (address.length < 3) return null;
    const result = await googleAddressForPublication(address, placeId);
    // A manually entered address may be formatted differently by Google. The
    // server verifies its street/number and stores the user's original address.
    return { reference: result.reference };
  } catch {
    return null;
  } // Location enrichment must not prevent publishing.
}
