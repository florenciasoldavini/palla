import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
import type { DiscoveryOrigin } from "../sorting";
export async function searchCities(query: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 10000);
  try {
    const { data, error } = await requireSupabase()
      .rpc("search_discovery_cities", { p_query: query })
      .abortSignal(controller.signal);
    if (error) throw error;
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function locateCity(origin: DiscoveryOrigin, signal: AbortSignal) {
  const { data, error } = await requireSupabase()
    .rpc("locate_discovery_city", {
      p_latitude: origin.latitude,
      p_longitude: origin.longitude
    })
    .abortSignal(signal);
  if (error) throw error;
  return data;
}
