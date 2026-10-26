import AsyncStorage from "@react-native-async-storage/async-storage";
import { cityLabel, discoveryCitySchema, type DiscoveryCity } from "../cities";
const key = "palla.discovery.city.v2";
const legacyKey = "palla.discovery.location.v1";
export async function readDiscoveryLocation() {
  const saved = await AsyncStorage.getItem(key);
  if (saved) {
    try {
      const result = discoveryCitySchema.safeParse(JSON.parse(saved));
      if (result.success)
        return { city: result.data, location: cityLabel(result.data) };
    } catch {
      /* Fall back to a previous text location if local data is corrupt. */
    }
  }
  const value = await AsyncStorage.getItem(legacyKey);
  return {
    city: null,
    location: value && value.length <= 120 ? value : "Buenos Aires"
  };
}
export async function saveDiscoveryLocation(value: DiscoveryCity) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify(discoveryCitySchema.parse(value))
  );
}
