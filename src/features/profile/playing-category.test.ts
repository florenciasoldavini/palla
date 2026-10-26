import { describe, expect, it } from "vitest";
import { onboardingSchema } from "@/features/onboarding/validation";

const base = { firstName: "Flor", lastName: "", mode: "player" };
describe("Argentine playing categories", () => {
  it("requires an explicit answer without assigning an unknown player a category", () => {
    expect(
      onboardingSchema.safeParse({
        ...base,
        categoryStatus: null,
        playingCategory: null
      }).success
    ).toBe(false);
    expect(
      onboardingSchema.parse({
        ...base,
        categoryStatus: "unknown",
        playingCategory: null
      }).playingCategory
    ).toBeNull();
  });
  it("accepts all eight integer categories and rejects fractional or missing ones", () => {
    for (let n = 1; n <= 8; n++)
      expect(
        onboardingSchema.safeParse({
          ...base,
          categoryStatus: "known",
          playingCategory: n
        }).success
      ).toBe(true);
    for (const n of [0, 9, 4.5, null])
      expect(
        onboardingSchema.safeParse({
          ...base,
          categoryStatus: "known",
          playingCategory: n
        }).success
      ).toBe(false);
  });
  it("keeps beginners separate and clears categories for non-category answers", () => {
    expect(
      onboardingSchema.safeParse({
        ...base,
        categoryStatus: "beginner",
        playingCategory: null
      }).success
    ).toBe(true);
    expect(
      onboardingSchema.safeParse({
        ...base,
        categoryStatus: "unknown",
        playingCategory: 6
      }).success
    ).toBe(false);
  });
  it("allows non-playing organizers without granting a player that answer", () => {
    expect(
      onboardingSchema.safeParse({
        ...base,
        mode: "organizer",
        categoryStatus: "not_playing",
        playingCategory: null
      }).success
    ).toBe(true);
    expect(
      onboardingSchema.safeParse({
        ...base,
        categoryStatus: "not_playing",
        playingCategory: null
      }).success
    ).toBe(false);
  });
});
