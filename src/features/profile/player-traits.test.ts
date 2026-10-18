import { describe, expect, it } from "vitest";
import { profileDetailsSchema } from "./domain";
import { profileInfoSchema } from "./validation";
import {
  courtSideSchema,
  dominantHandSchema,
  playerCategoryLabel
} from "./player-traits";
describe("player identity traits", () => {
  it("only supports right and left hands and the three court positions", () => {
    expect(dominantHandSchema.options).toEqual(["right", "left"]);
    expect(dominantHandSchema.safeParse("both").success).toBe(false);
    expect(courtSideSchema.options).toEqual(["left", "right", "flexible"]);
  });
  it("defaults older profile records to unset without making up a preference", () => {
    const old = profileDetailsSchema.parse({
      first_name: "QA",
      last_name: null,
      avatar_url: null,
      playing_level: null
    });
    expect(old.dominant_hand).toBeNull();
    expect(old.preferred_court_side).toBeNull();
  });
  it("accepts an unset form and each supported selection", () => {
    const form = {
      firstName: "QA",
      lastName: "",
      phoneNumber: "",
      avatar: "",
      bio: "",
      categoryStatus: "unknown",
      playingCategory: null,
      dominantHand: null,
      preferredCourtSide: null
    };
    expect(profileInfoSchema.safeParse(form).success).toBe(true);
    expect(
      profileInfoSchema.safeParse({
        ...form,
        dominantHand: "left",
        preferredCourtSide: "flexible"
      }).success
    ).toBe(true);
    expect(
      profileInfoSchema.safeParse({ ...form, dominantHand: "both" }).success
    ).toBe(false);
  });
  it("keeps category status distinctions in the compact summary", () => {
    expect(playerCategoryLabel("known", 7)).toBe("7ma");
    expect(playerCategoryLabel("beginner", null)).toBe("Just starting");
    expect(playerCategoryLabel("unknown", null)).toBe("Category not set");
    expect(playerCategoryLabel("not_playing", null)).toBe("Not playing");
  });
});
