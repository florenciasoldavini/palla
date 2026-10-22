import { useEffect, useRef, useState } from "react";
import { locateForDiscovery } from "../services/discovery-location.service";
import type { DiscoveryFilters } from "../domain";
import type { DiscoverySort } from "../sorting";
export function useDiscoverySort(
  filters: DiscoveryFilters,
  onChange: (filters: DiscoveryFilters) => void
) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);
  useEffect(
    () => () => {
      request.current++;
    },
    []
  );
  async function select(sort: DiscoverySort) {
    const version = ++request.current;
    setError("");
    if (sort !== "nearest") {
      setLocating(false);
      onChange({ ...latest.current, sort, origin: null });
      return;
    }
    setLocating(true);
    try {
      const origin = await locateForDiscovery();
      if (request.current === version)
        onChange({ ...latest.current, sort, origin });
    } catch (e) {
      if (request.current === version)
        setError(
          e instanceof Error
            ? e.message
            : "Couldn’t find your location. Try again."
        );
    } finally {
      if (request.current === version) setLocating(false);
    }
  }
  return { select, locating, error };
}
