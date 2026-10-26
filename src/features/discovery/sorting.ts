import { z } from "zod";
export const discoverySortSchema = z.enum(["soonest", "price", "nearest"]);
export type DiscoverySort = z.infer<typeof discoverySortSchema>;
export const discoveryOriginSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
});
export type DiscoveryOrigin = z.infer<typeof discoveryOriginSchema>;
export const discoverySortOptions: { value: DiscoverySort; label: string }[] = [
  { value: "soonest", label: "Soonest" },
  { value: "price", label: "Lowest price" },
  { value: "nearest", label: "Nearest to me" }
];
