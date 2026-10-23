import { expect, it } from "vitest";
import { clusterMapPointsScript } from "./cluster-map-points";
import { runInNewContext } from "node:vm";
import type { DiscoveryMapPoint } from "./discovery-map.types";
const clusterMapPoints = runInNewContext(
  clusterMapPointsScript + ";clusterMapPoints"
) as (
  points: DiscoveryMapPoint[],
  project: (p: DiscoveryMapPoint) => { x: number; y: number },
  radius: number,
  selectedId: string | null
) => { points: DiscoveryMapPoint[]; x: number; y: number; count: number }[];
const points = [
  { id: "a", name: "A", count: 2, latitude: 0, longitude: 0 },
  { id: "b", name: "B", count: 3, latitude: 0, longitude: 0.001 },
  { id: "c", name: "C", count: 1, latitude: 1, longitude: 1 }
];
const project = (p: (typeof points)[number]) => ({
  x: p.longitude * 10000,
  y: p.latitude * 10000
});
it("groups nearby venues with total session counts and stable ordering", () => {
  const result = clusterMapPoints(points, project, 64, null);
  expect(result.map((g) => g.points.map((p) => p.id))).toEqual([
    ["a", "b"],
    ["c"]
  ]);
  expect(result[0]).toMatchObject({ count: 5, x: 5, y: 0 });
  expect(clusterMapPoints([...points].reverse(), project, 64, null)).toEqual(
    result
  );
});
it("separates pins when zoomed in and keeps the selected venue visible", () => {
  expect(clusterMapPoints(points, project, 0, null)).toHaveLength(3);
  expect(clusterMapPoints(points, project, 64, "b")).toHaveLength(3);
  expect(clusterMapPoints([], project, 64, null)).toEqual([]);
});
