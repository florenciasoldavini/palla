import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { randomUUID } from "expo-crypto";
import { searchAddresses } from "../services/address-search.service";
export function useAddressSearch(input: string, active: boolean) {
  const [token, setToken] = useState(randomUUID);
  const [search, setSearch] = useState("");
  useEffect(() => {
    setSearch("");
    const timer = setTimeout(() => setSearch(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);
  const query = useQuery({
    queryKey: ["address-search", token, search],
    queryFn: () => searchAddresses(search, token),
    enabled: active && search.length >= 3 && search === input.trim(),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });
  return {
    ...query,
    token,
    resetToken: () => setToken(randomUUID()),
    searching:
      active &&
      input.trim().length >= 3 &&
      (query.isFetching || search !== input.trim())
  };
}
