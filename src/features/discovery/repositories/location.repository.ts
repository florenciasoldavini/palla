import AsyncStorage from "@react-native-async-storage/async-storage";
const key = "palla.discovery.location.v1";
export async function readDiscoveryLocation() {
  const value = await AsyncStorage.getItem(key);
  return value && value.length <= 120 ? value : null;
}
export async function saveDiscoveryLocation(value: string) {
  await AsyncStorage.setItem(key, value);
}
