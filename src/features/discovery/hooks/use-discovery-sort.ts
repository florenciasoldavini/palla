import { useEffect, useRef, useState } from "react";
import { locateForDiscovery } from "../services/discovery-location.service";
import type { DiscoveryFilters } from "../domain";
import type { DiscoveryOrigin, DiscoverySort } from "../sorting";
import type { DiscoveryRadius } from "../radius";
/** Sorting and radius share one origin and one pending request across list/map. */
export function useDiscoverySort(
  filters: DiscoveryFilters,
  onChange: (filters: DiscoveryFilters) => void
) {
  const [pending, setPending] = useState<"sort" | "radius" | null>(null);
  const [error, setError] = useState("");
  const request = useRef(0);
  const fix = useRef<Promise<DiscoveryOrigin> | null>(null);
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
  function apply(update: (current: DiscoveryFilters) => DiscoveryFilters) {
    request.current++;
    setPending(null);
    setError("");
    onChange(update(latest.current));
  }
  async function withLocation(
    target: "sort" | "radius",
    update: (
      current: DiscoveryFilters,
      origin: DiscoveryOrigin
    ) => DiscoveryFilters
  ) {
    const version = ++request.current;
    setError("");
    setPending(target);
    const currentFix = fix.current ?? locateForDiscovery();
    fix.current = currentFix;
    try {
      const origin = await currentFix;
      if (request.current === version) onChange(update(latest.current, origin));
    } catch (e) {
      if (request.current === version)
        setError(
          e instanceof Error
            ? e.message
            : "Couldn’t find your location. Try again."
        );
    } finally {
      if (fix.current === currentFix) fix.current = null;
      if (request.current === version) setPending(null);
    }
  }
  async function select(sort: DiscoverySort) {
    if (sort !== "nearest") {
      apply((current) => ({
        ...current,
        sort,
        origin: current.radius !== "any" ? current.origin : null
      }));
      return;
    }
    await withLocation("sort", (current, origin) => ({
      ...current,
      sort,
      origin
    }));
  }
  async function selectRadius(radius: DiscoveryRadius) {
    if (radius === "any") {
      apply((current) => ({
        ...current,
        radius,
        origin: current.sort === "nearest" ? current.origin : null
      }));
    } else if (latest.current.radius !== "any" && latest.current.origin) {
      apply((current) => ({ ...current, radius }));
    } else {
      await withLocation("radius", (current, origin) => ({
        ...current,
        radius,
        origin
      }));
    }
  }
  function cancel() {
    request.current++;
    setPending(null);
    setError("");
  }
  return {
    select,
    selectRadius,
    cancel,
    pending,
    locating: pending !== null,
    error
  };
}
