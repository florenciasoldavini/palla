import { z } from "zod";
import { fetchVenueMapLocation } from "../repositories/venue-map.repository";

const featureSchema = z.object({
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-85).max(85)
    ])
  }),
  properties: z.object({
    osm_key: z.string().optional(),
    type: z.string().optional(),
    housenumber: z.string().optional()
  })
});

export function selectVenueMapLocation(raw: unknown, address: string) {
  const data = z.object({ features: z.array(z.unknown()).max(20) }).parse(raw);
  const features = data.features.flatMap((value) => {
    const result = featureSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });
  // A neighborhood query must not select an unrelated POI in that neighborhood.
  const houseNumber = address
    .match(/\b\d+[a-z]?\b/gi)
    ?.at(-1)
    ?.toLowerCase();
  const selected =
    (houseNumber
      ? features.find(
          (f) => f.properties.housenumber?.toLowerCase() === houseNumber
        )
      : undefined) ??
    features.find(
      (f) =>
        f.properties.osm_key === "highway" || f.properties.type === "street"
    ) ??
    features.find((f) => f.properties.osm_key === "place");
  if (!selected) return null;
  const [longitude, latitude] = selected.geometry.coordinates;
  return { longitude, latitude };
}

export async function loadVenueMapLocation(
  address: string,
  signal?: AbortSignal
) {
  const query = address.trim();
  if (query.length < 3 || query.length > 300) return null;
  return selectVenueMapLocation(
    await fetchVenueMapLocation(query, signal),
    query
  );
}
