import AsyncStorage from "@react-native-async-storage/async-storage";
export interface DurableStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
// Compatibility adapter; native platforms resolve the SQLite implementation.
export const durableStore: DurableStore = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key)
};
