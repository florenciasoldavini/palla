import { describe, expect, it } from "vitest";
import {
  boundsForRegion,
  clusterNativePoints,
  regionForBounds,
  zoomForRegion
} from "./native-map-geometry";
const region = {
  latitude: 0,
  longitude: 179.99,
  latitudeDelta: 1,
  longitudeDelta: 1
};
const points = [
  { id: "a", name: "A", latitude: 0, longitude: 179.99, count: 2 },
  { id: "b", name: "B", latitude: 0, longitude: -179.99, count: 3 }
];
describe("Google map camera geometry", () => {
  it("preserves bounds crossing the date line", () => {
    const bounds = { west: 179, east: -179, south: -1, north: 1 };
    expect(boundsForRegion(regionForBounds(bounds))).toEqual(bounds);
  });
  it("groups adjacent venues across the date line and sums sessions", () => {
    const groups = clusterNativePoints(points, region, 400, 800);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(5);
    expect(Math.abs(groups[0].longitude)).toBeCloseTo(180);
  });
  it("is independent of result order while pages arrive", () => {
    expect(
      clusterNativePoints([...points].reverse(), region, 400, 800)
    ).toEqual(clusterNativePoints(points, region, 400, 800));
  });
  it("fits the initial camera to the available map space", () => {
    const broad = zoomForRegion(region, 400, 600);
    const close = zoomForRegion(
      { ...region, latitudeDelta: 0.25, longitudeDelta: 0.25 },
      400,
      600
    );
    expect(Number.isFinite(broad)).toBe(true);
    expect(close - broad).toBeCloseTo(2, 2);
    expect(zoomForRegion(region, 200, 300)).toBeCloseTo(broad - 1, 2);
  });
  it("keeps the selected venue independently tappable", () => {
    expect(clusterNativePoints(points, region, 400, 800, "a")).toHaveLength(2);
  });
  it("separates nearby venues when zoomed in", () => {
    expect(
      clusterNativePoints(
        points,
        { ...region, longitudeDelta: 0.0005 },
        400,
        800
      )
    ).toHaveLength(2);
  });
});
