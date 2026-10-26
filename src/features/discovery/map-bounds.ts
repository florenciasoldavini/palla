import { z } from "zod";
import type { Bounds } from "./domain";
export const mapBoundsSchema = z
  .object({
    west: z.number().finite().min(-180).max(180),
    east: z.number().finite().min(-180).max(180),
    south: z.number().finite().min(-90).max(90),
    north: z.number().finite().min(-90).max(90)
  })
  .refine((b) => b.south < b.north && b.west !== b.east);
export function normalizeMapBounds(value: Bounds): Bounds {
  return mapBoundsSchema.parse(
    Object.fromEntries(
      Object.entries(value).map(([key, n]) => [
        key,
        Math.round(n * 100000) / 100000
      ])
    )
  );
}
export function sameMapBounds(a: Bounds | null | undefined, b: Bounds) {
  return (
    a?.west === b.west &&
    a.east === b.east &&
    a.south === b.south &&
    a.north === b.north
  );
}
