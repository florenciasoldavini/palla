import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import drafts from "./drafts.json";

describe("bundled legal drafts", () => {
  for (const language of ["es", "en"] as const) {
    for (const document of ["terms", "privacy"] as const) {
      it(`keeps the complete ${language} ${document} aligned with its reviewed source`, () => {
        const source = readFileSync(
          new URL(
            `../../../docs/legal/${document}.${language}.md`,
            import.meta.url
          ),
          "utf8"
        );
        expect(drafts[language][document]).toBe(source);
      });
    }
  }
});
