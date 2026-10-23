import { type DiscoveryCursor } from "../pagination";
import { useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadDiscovery } from "../services/discovery.service";
import type { DiscoveryFilters } from "../domain";
export function useDiscovery(filters: DiscoveryFilters, enabled = true) {
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
    queryKey: ["discover-sessions", "paged", user?.id ?? "anonymous", filters],
    queryFn: ({ signal, pageParam }) =>
      loadDiscovery(filters, signal, pageParam),
    initialPageParam: null as DiscoveryCursor | null,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    placeholderData: filters.bounds ? keepPreviousData : undefined,
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 1
  });
  return { ...query, canLoadMore: enabled && active };
}
