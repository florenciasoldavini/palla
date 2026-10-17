import { onboardingSchema } from "@/features/onboarding/validation";
import { profileSchema } from "@/features/profile/domain";
import { describe, expect, it } from "vitest";

describe("onboarding", () => {
  it("lets organizers finish without a playing-category answer", () => {
    expect(
      onboardingSchema.parse({
        firstName: "Alex",
        lastName: "",
        mode: "organizer",
        categoryStatus: null,
        playingCategory: null
      }).categoryStatus
    ).toBeNull();
    expect(
      onboardingSchema.safeParse({
        firstName: "Alex",
        lastName: "",
        mode: "player",
        categoryStatus: null,
        playingCategory: null
      }).success
    ).toBe(false);
  });
  it("requires a real first name and explicit starting mode", () => {
    expect(
      onboardingSchema.safeParse({
        firstName: "  ",
        lastName: "",
        mode: "player",
        categoryStatus: "unknown",
        playingCategory: null
      }).success
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({
        firstName: "Flor",
        lastName: "",
        mode: "admin",
        categoryStatus: "unknown",
        playingCategory: null
      }).success
    ).toBe(false);
  });
  it("allows both modes and an optional last name", () => {
    for (const mode of ["player", "organizer"]) {
      expect(
        onboardingSchema.parse({
          firstName: " Flor ",
          lastName: "",
          mode,
          categoryStatus: "unknown",
          playingCategory: null
        })
      ).toEqual({
        firstName: "Flor",
        lastName: "",
        mode,
        categoryStatus: "unknown",
        playingCategory: null
      });
    }
  });
  it("rejects completed profiles without a first name", () => {
    expect(
      profileSchema.safeParse({
        id: "a9eaa286-357a-4e77-bf65-8686766eeab7",
        first_name: null,
        last_name: null,
        avatar_url: null,
        playing_level: null,
        phone_number: null,
        preferred_mode: "player",
        categoryStatus: "unknown",
        playingCategory: null,
        onboarding_completed_at: "2026-10-13T16:00:00Z",
        welcome_email_sent_at: null,
        created_at: "2026-10-13T16:00:00Z",
        updated_at: "2026-10-13T16:00:00Z"
      }).success
    ).toBe(false);
  });
});
