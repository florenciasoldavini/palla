export type AppLanguage = "es" | "en";

export function languageFromLocale(locale: string): AppLanguage {
  return locale.toLowerCase().split(/[-_]/)[0] === "es" ? "es" : "en";
}
