import { discoveryPageSize, type DiscoveryCursor } from "../pagination";
import { radiusKilometers } from "../radius";
import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
import { advancedRpcFilters } from "../advanced-filters";
import type { DiscoveryFilters } from "../domain";
export async function fetchDiscovery(
  f: DiscoveryFilters,
  signal?: AbortSignal,
  cursor: DiscoveryCursor | null = null
) {
  const request = requireSupabase().rpc("discover_sessions_page", {
    p_after: cursor,
    p_limit: discoveryPageSize,
    ...advancedRpcFilters(f),
    p_bounds: f.bounds ?? null,
    p_city_id: f.city?.id ?? null,
    p_radius_km: radiusKilometers(f.radius),
    p_sort: f.sort,
    p_latitude: f.origin?.latitude ?? null,
    p_longitude: f.origin?.longitude ?? null,
    p_location: f.location,
    p_search: f.search,
    p_from: f.from || null,
    p_to: f.to || null,
    p_category: f.category === "all" ? null : Number(f.category),
    p_time: f.time,
    p_availability: f.availability
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  return data;
}
