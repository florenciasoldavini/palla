import { describe, expect, it } from "vitest";
import { chatSearchPageSchema, splitSearchText } from "./search-domain";
describe("conversation search", () => {
  it("matches literal punctuation, mixed case and repeated text", () => {
    expect(splitSearchText("Court [2] then COURT [2]", "court [2]")).toEqual([
      { text: "Court [2]", match: true },
      { text: " then ", match: false },
      { text: "COURT [2]", match: true }
    ]);
    expect(
      splitSearchText("100% ready 🎾", "%").filter((p) => p.match)
    ).toEqual([{ text: "%", match: true }]);
  });
  it("preserves text and Unicode without matches or a query", () => {
    for (const term of ["", "missing", "🎾", "É"]) {
      const parts = splitSearchText("Café 🎾", term);
      expect(parts.map((p) => p.text).join("")).toBe("Café 🎾");
    }
    expect(splitSearchText("Café 🎾", "É").find((p) => p.match)?.text).toBe(
      "é"
    );
  });
  it("rejects inconsistent empty search pages", () => {
    expect(
      chatSearchPageSchema.safeParse({
        total: 0,
        index: null,
        selected_id: null,
        messages: []
      }).success
    ).toBe(true);
    expect(
      chatSearchPageSchema.safeParse({
        total: 1,
        index: 0,
        selected_id: null,
        messages: []
      }).success
    ).toBe(false);
  });
});
