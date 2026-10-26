import { z } from "zod";
import { discoveryCitySchema } from "../cities";
import { searchCities, locateCity } from "../repositories/city.repository";
import { locateForDiscovery } from "./discovery-location.service";
export async function findCities(query: string, signal?: AbortSignal) {
  const text = query.trim();
  if (text.length < 2) return [];
  return z
    .array(discoveryCitySchema)
    .max(8)
    .parse(await searchCities(text, signal));
}
export async function detectDiscoveryCity() {
  const origin = await locateForDiscovery().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Location access is off")) {
      throw new Error(
        "Location access is off. Search for your city instead, or enable location in your phone’s settings."
      );
    }
    if (message.startsWith("Turn on your phone’s location services")) {
      throw new Error(
        "Location services are off. Search for your city instead, or turn them on in your phone’s settings."
      );
    }
    throw new Error(
      "Couldn’t detect your city. Search for it instead, or try again."
    );
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let city: unknown;
  try {
    city = await locateCity(origin, controller.signal);
  } catch {
    throw new Error(
      "Couldn’t detect your city. Search for it instead, or try again."
    );
  } finally {
    clearTimeout(timer);
  }
  if (!city)
    throw new Error(
      "We couldn’t find a nearby city. Search for your city instead."
    );
  return discoveryCitySchema.parse(city);
}
