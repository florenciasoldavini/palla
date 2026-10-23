import { useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
  return useQuery({
    enabled: enabled && active,
    queryKey: ["discover-sessions", user?.id ?? "anonymous", filters],
    queryFn: ({ signal }) => loadDiscovery(filters, signal),
    placeholderData: filters.bounds ? keepPreviousData : undefined,
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 1
  });
}
