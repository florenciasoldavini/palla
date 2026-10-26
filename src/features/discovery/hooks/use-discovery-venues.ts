import { useMemo } from "react";
import { storedVenueCoordinates } from "@/features/venues/coordinates";
import type { DiscoverySession, VenuePoint } from "../domain";
/** Discovery coordinates come from the same database response as its sessions. */
export function useDiscoveryVenues(sessions: DiscoverySession[]) {
  return useMemo(() => {
    const venues = [
      ...new Map(sessions.map((s) => [s.venue.id, s.venue])).values()
    ];
    const points: VenuePoint[] = venues.flatMap((v) => {
      const point = storedVenueCoordinates(v);
      return point && Math.abs(point.latitude) <= 85
        ? [
            {
              ...point,
              id: v.id,
              name: v.name,
              sessions: sessions.filter((s) => s.venue.id === v.id)
            }
          ]
        : [];
    });
    return { points, unresolved: venues.length - points.length };
  }, [sessions]);
}
