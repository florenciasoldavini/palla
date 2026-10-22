import { useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadVenueMapLocation } from "@/features/sessions/public/services/venue-map.service";
import { AuthContext } from "@/features/auth/auth-provider";
import type { DiscoverySession, VenuePoint } from "../domain";
export function useDiscoveryVenues(
  sessions: DiscoverySession[],
  enabled: boolean
) {
  const client = useQueryClient();
  const { user } = useContext(AuthContext);
  const venues = useMemo(
    () => [...new Map(sessions.map((s) => [s.venue.id, s.venue])).values()],
    [sessions]
  );
  const query = useQuery({
    queryKey: [
      "discovery-venue-locations",
      venues.map((v) => [v.id, v.address]).sort()
    ],
    enabled,
    queryFn: async ({ signal }) => {
      const locations: Record<
        string,
        { longitude: number; latitude: number } | null
      > = {};
      // Bound provider requests instead of firing one per session in parallel.
      const queue = [...venues];
      await Promise.all(
        [0, 1].map(async () => {
          while (queue.length && !signal.aborted) {
            const v = queue.shift()!;
            try {
              locations[v.id] = v.address
                ? await client.fetchQuery({
                    queryKey: [
                      "venue-map",
                      user?.id ?? "anonymous",
                      v.address.trim()
                    ],
                    queryFn: ({ signal: lookupSignal }) =>
                      loadVenueMapLocation(v.address!, lookupSignal),
                    staleTime: 86400000,
                    gcTime: 86400000,
                    retry: false
                  })
                : null;
            } catch {
              if (signal.aborted) throw new Error("Map lookup cancelled");
              locations[v.id] = null;
            }
          }
        })
      );
      return locations;
    },
    staleTime: 86400000,
    retry: false
  });
  const points: VenuePoint[] = useMemo(
    () =>
      venues.flatMap((v) => {
        const point = query.data?.[v.id];
        return point
          ? [
              {
                ...point,
                id: v.id,
                name: v.name,
                sessions: sessions.filter((s) => s.venue.id === v.id)
              }
            ]
          : [];
      }),
    [query.data, sessions, venues]
  );
  return { ...query, points, unresolved: venues.length - points.length };
}
