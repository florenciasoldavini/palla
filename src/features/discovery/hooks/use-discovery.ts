import { discoveryQueryPolicy, type DiscoveryMode } from "../query-policy";
import { type DiscoveryCursor } from "../pagination";
import { useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadDiscovery } from "../services/discovery.service";
import type { DiscoveryFilters } from "../domain";
export function useDiscovery(
  filters: DiscoveryFilters,
  enabled = true,
  mode: DiscoveryMode = "list"
) {
  const { user } = useContext(AuthContext);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setActive(state === "active")
    );
    return () => subscription.remove();
  }, []);
  const query = useInfiniteQuery({
    enabled: enabled && active,
    queryKey: [
      "discover-sessions",
      "paged",
      mode,
      user?.id ?? "anonymous",
      filters
    ],
    queryFn: ({ signal, pageParam }) =>
      loadDiscovery(filters, signal, pageParam),
    initialPageParam: null as DiscoveryCursor | null,
    ...discoveryQueryPolicy(mode),
    placeholderData: filters.bounds ? keepPreviousData : undefined,
    staleTime: 15000,

    retry: 1
  });
  return { ...query, canLoadMore: enabled && active && mode === "list" };
}
