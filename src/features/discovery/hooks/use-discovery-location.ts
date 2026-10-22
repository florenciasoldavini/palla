import { useEffect, useState } from "react";
import {
  readDiscoveryLocation,
  saveDiscoveryLocation
} from "../repositories/location.repository";
export function useDiscoveryLocation() {
  const [location, setLocation] = useState("Buenos Aires");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void readDiscoveryLocation()
      .then((value) => {
        if (active && value) setLocation(value);
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
    location,
    ready,
    changeLocation: (value: string) => {
      setLocation(value);
      void saveDiscoveryLocation(value).catch(() => {});
    }
  };
}
