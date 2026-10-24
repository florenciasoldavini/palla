import type { MapBounds, DiscoveryMapPoint } from "./discovery-map.types";
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
export function longitude(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}
export function boundsForRegion(r: MapRegion): MapBounds {
  const world = r.longitudeDelta >= 360;
  return {
    west: world ? -180 : longitude(r.longitude - r.longitudeDelta / 2),
    east: world ? 180 : longitude(r.longitude + r.longitudeDelta / 2),
    south: Math.max(-90, r.latitude - r.latitudeDelta / 2),
    north: Math.min(90, r.latitude + r.latitudeDelta / 2)
  };
}
export function regionForBounds(b: MapBounds): MapRegion {
  const width = b.east > b.west ? b.east - b.west : 360 + b.east - b.west;
  return {
    latitude: (b.north + b.south) / 2,
    longitude: longitude(b.west + width / 2),
    latitudeDelta: b.north - b.south,
    longitudeDelta: width
  };
}
const mercator = (lat: number) =>
  Math.log(
    Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360)
  );
export function zoomForRegion(
  region: MapRegion,
  width: number,
  height: number
) {
  const x = Math.max(1e-9, region.longitudeDelta / 360);
  const y = Math.max(
    1e-9,
    (mercator(region.latitude + region.latitudeDelta / 2) -
      mercator(region.latitude - region.latitudeDelta / 2)) /
      (2 * Math.PI)
  );
  return Math.max(
    0,
    Math.min(
      18,
      Math.log2(Math.max(1, width) / (256 * x)),
      Math.log2(Math.max(1, height) / (256 * y))
    )
  );
}
export function clusterNativePoints(
  points: DiscoveryMapPoint[],
  region: MapRegion,
  width: number,
  height: number,
  selectedId?: string
) {
  const groups: {
    points: DiscoveryMapPoint[];
    x: number;
    y: number;
    count: number;
  }[] = [];
  const north = mercator(region.latitude + region.latitudeDelta / 2),
    south = mercator(region.latitude - region.latitudeDelta / 2);
  const radius =
    region.longitudeDelta / Math.max(1, width) <= 360 / (256 * 2 ** 18)
      ? 0
      : 64;
  for (const point of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    const x =
      (longitude(point.longitude - region.longitude) / region.longitudeDelta +
        0.5) *
      width;
    const y = ((north - mercator(point.latitude)) / (north - south)) * height;
    const group =
      point.id === selectedId
        ? undefined
        : groups.find(
            (g) =>
              g.points[0].id !== selectedId &&
              Math.hypot(g.x - x, g.y - y) < radius
          );
    if (group) {
      const n = group.points.length;
      group.x = (group.x * n + x) / (n + 1);
      group.y = (group.y * n + y) / (n + 1);
      group.points.push(point);
      group.count += point.count;
    } else groups.push({ points: [point], x, y, count: point.count });
  }
  return groups.map((g) => ({
    ...g,
    latitude: g.points.reduce((n, p) => n + p.latitude, 0) / g.points.length,
    longitude: longitude(
      g.points[0].longitude +
        g.points.reduce(
          (n, p) => n + longitude(p.longitude - g.points[0].longitude),
          0
        ) /
          g.points.length
    )
  }));
}
