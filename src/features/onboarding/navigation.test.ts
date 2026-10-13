import { getUserHomePath } from "@/features/onboarding/navigation";
import { describe, expect, it } from "vitest";

describe("starting mode and organizer capability", () => {
  it("opens the organizer home only for an active database capability", () => {
    expect(
      getUserHomePath({
        preferred_mode: "organizer",
        organizer_status: "active"
      })
    ).toBe("/dashboard");
    for (const organizer_status of [null, "suspended"] as const) {
      expect(
        getUserHomePath({ preferred_mode: "organizer", organizer_status })
      ).toBe("/discover");
    }
  });
  it("lets active organizers choose player mode", () => {
    expect(
      getUserHomePath({ preferred_mode: "player", organizer_status: "active" })
    ).toBe("/discover");
  });
});
