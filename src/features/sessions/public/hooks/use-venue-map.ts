import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { loadVenueMapLocation } from "../services/venue-map.service";

export function useVenueMap(address: string) {
  const { session } = useContext(AuthContext);
  return useQuery({
    queryKey: ["venue-map", session?.user.id ?? "anonymous", address.trim()],
    queryFn: ({ signal }) => loadVenueMapLocation(address, signal),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false
  });
}
