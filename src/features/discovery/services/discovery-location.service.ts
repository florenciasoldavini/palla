import { readCurrentLocation } from "@/infrastructure/location/current-location";
import { discoveryOriginSchema } from "../sorting";
export async function locateForDiscovery() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const point = await Promise.race([
      readCurrentLocation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Couldn’t find your location. Try again or choose another sort."
              )
            ),
          20000
        );
      })
    ]);
    return discoveryOriginSchema.parse(point);
  } finally {
    clearTimeout(timeout);
  }
}
