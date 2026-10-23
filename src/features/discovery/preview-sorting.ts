import { radiusKilometers, type DiscoveryRadius } from "./radius";
import type { DiscoverySession } from "./domain";
import type { DiscoveryOrigin, DiscoverySort } from "./sorting";
/** Read-only QA fixtures only. Production always uses the ranked database RPC. */
export function rankPreviewSessions<T extends DiscoverySession>(
  sessions: T[],
  sort: DiscoverySort,
  origin: DiscoveryOrigin | null,
  radius: DiscoveryRadius = "any"
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const withDistance = sessions.map((s) => {
    const lat = s.venue.latitude,
      lng = s.venue.longitude;
    const distance =
      (sort === "nearest" || radius !== "any") &&
      origin &&
      lat != null &&
      lng != null
        ? 6371000 *
          Math.acos(
            Math.min(
              1,
              Math.max(
                -1,
                Math.sin(rad(origin.latitude)) * Math.sin(rad(lat)) +
                  Math.cos(rad(origin.latitude)) *
                    Math.cos(rad(lat)) *
                    Math.cos(rad(lng - origin.longitude))
              )
            )
          )
        : null;
    return { ...s, distance_m: distance };
  });
  const km = radiusKilometers(radius);
  return withDistance
    .filter(
      (s) => km === null || (s.distance_m !== null && s.distance_m <= km * 1000)
    )
    .sort(
      (a, b) =>
        (sort === "price"
          ? a.price_minor - b.price_minor
          : sort === "nearest"
            ? (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)
            : 0) ||
        Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
        a.id.localeCompare(b.id)
    );
}
