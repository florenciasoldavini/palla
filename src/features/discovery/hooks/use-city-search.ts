import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { findCities } from "../services/city.service";
export function useCitySearch(value: string, enabled: boolean) {
  const network = useNetInfo();
  const offline =
    network.isConnected === false || network.isInternetReachable === false;
  const [query, setQuery] = useState(value.trim());
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);
  const result = useQuery({
    queryKey: ["discovery-cities", query],
    queryFn: ({ signal }) => findCities(query, signal),
    enabled: enabled && !offline && query.length >= 2 && query === value.trim(),
    staleTime: 86400000,
    retry: 1
  });
  return { ...result, offline, waiting: query !== value.trim() };
}
