import type { DiscoveryPage } from "./pagination";
export type DiscoveryMode = "list" | "map";
export function discoveryQueryPolicy(mode: DiscoveryMode) {
  return {
    getNextPageParam: (page: DiscoveryPage) =>
      mode === "map" ? undefined : (page.next_cursor ?? undefined),
    refetchInterval: mode === "map" ? (false as const) : 30_000,
    // Panning creates many keys; release inactive map areas promptly.
    gcTime: mode === "map" ? 60_000 : 5 * 60_000
  };
}
