import { describe, expect, it } from "vitest";
import { languageFromLocale } from "./system-language";

describe("legal language resolution", () => {
  it.each(["es", "es-AR", "es-ES", "es_US", "ES-ar"])(
    "recognizes Spanish locale %s",
    (locale) => expect(languageFromLocale(locale)).toBe("es")
  );
  it.each(["en", "en-GB", "en-US", "pt-BR", "fr-FR", ""])(
    "uses English for locale %s",
    (locale) => expect(languageFromLocale(locale)).toBe("en")
  );
});
