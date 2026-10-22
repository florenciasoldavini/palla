import { z } from "zod";
import { discoverySessionSchema, type DiscoveryFilters } from "../domain";
import { fetchDiscovery } from "../repositories/discovery.repository";
export async function loadDiscovery(
  filters: DiscoveryFilters,
  signal?: AbortSignal
) {
  return z
    .object({
      sessions: z.array(discoverySessionSchema).max(500),
      has_more: z.boolean()
    })
    .parse(await fetchDiscovery(filters, signal));
}
