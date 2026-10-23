import { z } from "zod";
export const discoveryCitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  region: z.string().max(200),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  country: z.string().min(1).max(200),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
});
export type DiscoveryCity = z.infer<typeof discoveryCitySchema>;
export function cityLabel(city: DiscoveryCity) {
  return `${city.name}, ${city.country_code}`;
}
export function cityContext(city: DiscoveryCity) {
  return [city.region, city.country].filter(Boolean).join(" · ");
}
