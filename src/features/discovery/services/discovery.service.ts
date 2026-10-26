import { discoveryPageSchema, type DiscoveryCursor } from "../pagination";
import type { DiscoveryFilters } from "../domain";
import { fetchDiscovery } from "../repositories/discovery.repository";
export async function loadDiscovery(
  filters: DiscoveryFilters,
  signal?: AbortSignal,
  cursor: DiscoveryCursor | null = null
) {
  return discoveryPageSchema.parse(
    await fetchDiscovery(filters, signal, cursor)
  );
}
