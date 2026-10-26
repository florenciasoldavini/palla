import { expect, it } from "vitest";
import {
  mapBoundsSchema,
  normalizeMapBounds,
  sameMapBounds
} from "./map-bounds";
it("accepts crossing the antimeridian but rejects invalid and degenerate bounds", () => {
  expect(
    mapBoundsSchema.safeParse({ west: 170, east: -170, south: -20, north: 20 })
      .success
  ).toBe(true);
  for (const b of [
    { west: 0, east: 0, south: 0, north: 1 },
    { west: 0, east: 1, south: 10, north: 0 },
    { west: NaN, east: 1, south: 0, north: 1 },
    { west: -181, east: 1, south: 0, north: 1 }
  ])
    expect(mapBoundsSchema.safeParse(b).success).toBe(false);
});
it("deduplicates sub-meter camera jitter without merging different areas", () => {
  const b = { west: -58.5, east: -58.3, south: -34.7, north: -34.5 };
  expect(
    sameMapBounds(b, normalizeMapBounds({ ...b, west: -58.50000001 }))
  ).toBe(true);
  expect(sameMapBounds(b, { ...b, east: -58.2 })).toBe(false);
});
