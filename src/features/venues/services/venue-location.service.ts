import { z } from "zod";
import { storedVenueCoordinates } from "../coordinates";
import {
  fetchVenueLocation,
  lookupAddressCoordinates
} from "../repositories/venue-location.repository";
const normalized = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\bav\b/g, "avenida")
    .replace(/\bcaba\b/g, "buenos aires")
    .replace(/\bciudad autonoma de\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
// Persist only a matching street + house number, never a street or city centroid.
export function selectPersistentVenueCoordinates(
  raw: unknown,
  address: string
) {
  const result = z
    .object({ features: z.array(z.unknown()).max(20) })
    .safeParse(raw);
  if (!result.success) return null;
  const query = normalized(address);
  const numbers: string[] = query.match(/\b\d+[a-z]?\b/g) ?? [];
  if (!numbers.length) return null;
  const feature = z.object({
    geometry: z.object({
      type: z.literal("Point"),
      coordinates: z.tuple([
        z.number().finite().min(-180).max(180),
        z.number().finite().min(-85).max(85)
      ])
    }),
    properties: z.object({
      housenumber: z.string(),
      street: z.string().min(3),
      city: z.string().optional()
    })
  });
  for (const value of result.data.features) {
    const parsed = feature.safeParse(value);
    if (!parsed.success) continue;
    const { geometry, properties } = parsed.data;
    const street = normalized(properties.street);
    if (
      numbers.includes(normalized(properties.housenumber)) &&
      query.includes(street) &&
      (!properties.city || query.includes(normalized(properties.city)))
    )
      return {
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
        address: address.trim()
      };
  }
  return null;
}
export async function coordinatesForPublication(
  venueId: string,
  address: string
) {
  try {
    if (venueId) {
      const venue = await fetchVenueLocation(venueId);
      if (storedVenueCoordinates(venue)) return null;
      address = venue.address ?? "";
    }
    address = address.trim();
    if (address.length < 3) return null;
    return selectPersistentVenueCoordinates(
      await lookupAddressCoordinates(address),
      address
    );
  } catch {
    return null;
  } // Map enrichment must not prevent publishing a valid session.
}
