import { useEffect, useState } from "react";
import { cityLabel, type DiscoveryCity } from "../cities";
import {
  readDiscoveryLocation,
  saveDiscoveryLocation
} from "../repositories/location.repository";
export function useDiscoveryLocation() {
  const [selection, setSelection] = useState<{
    location: string;
    city: DiscoveryCity | null;
  }>({ location: "Buenos Aires", city: null });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void readDiscoveryLocation()
      .then((value) => {
        if (active) setSelection(value);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return {
    ...selection,
    ready,
    changeLocation: async (city: DiscoveryCity) => {
      await saveDiscoveryLocation(city);
      setSelection({ city, location: cityLabel(city) });
    }
  };
}
