import { useEffect, useRef, useState } from "react";
import { locateForDiscovery } from "../services/discovery-location.service";
import type { DiscoveryOrigin } from "../sorting";
export function useMapLocation(onLocated: () => void) {
  const request = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<
    DiscoveryOrigin & { requestId: number }
  >();
  useEffect(
    () => () => {
      request.current++;
    },
    []
  );
  function cancel() {
    request.current++;
    setPending(false);
    setError("");
    setTarget(undefined);
  }
  async function locate() {
    const version = ++request.current;
    setPending(true);
    setError("");
    try {
      const origin = await locateForDiscovery();
      if (version !== request.current) return;
      onLocated();
      setTarget({ ...origin, requestId: version });
    } catch (e) {
      if (version === request.current)
        setError(
          e instanceof Error
            ? e.message.replace("choose another sort", "search manually")
            : "Couldn’t find your location. Try again."
        );
    } finally {
      if (version === request.current) setPending(false);
    }
  }
  return { target, pending, error, locate, cancel };
}
