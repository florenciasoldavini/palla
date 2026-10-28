import { durableStore } from "@/infrastructure/local-storage/durable-store";
import type { AppLanguage } from "./system-language";

export type LanguagePreference = "system" | AppLanguage;
const key = "palla.language.v1";
export async function readLanguagePreference(): Promise<LanguagePreference> {
  const saved = await durableStore.get(key);
  return saved === "es" || saved === "en" ? saved : "system";
}
export function writeLanguagePreference(value: LanguagePreference) {
  return value === "system"
    ? durableStore.remove(key)
    : durableStore.set(key, value);
}
