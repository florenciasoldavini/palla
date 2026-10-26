import { z } from "zod";
export const venueCoordinatesShape = {
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional()
};
export function storedVenueCoordinates(venue: {
  latitude?: number | null;
  longitude?: number | null;
}) {
  const parsed = z.object(venueCoordinatesShape).safeParse(venue);
  if (
    !parsed.success ||
    parsed.data.latitude == null ||
    parsed.data.longitude == null
  )
    return null;
  return { latitude: parsed.data.latitude, longitude: parsed.data.longitude };
}
