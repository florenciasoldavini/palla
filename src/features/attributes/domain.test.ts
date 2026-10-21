import { describe, expect, it, vi } from "vitest";
import {
  sessionAttributesSchema,
  venueAttributesSchema,
  normalizeSessionAttributes,
  toggleSessionAttribute,
  sessionAttributeCodes,
  venueAttributeCodes,
  orderedAttributes
} from "./domain";

import {
  sessionDraftSchema,
  initialSessionForm
} from "@/features/sessions/validation/session-form";
import { formFromSession } from "@/features/sessions/services/organizer-sessions.service";
import { sample } from "@/features/sessions/occurrence-preview-fixture";

vi.mock("@/features/session-covers/repositories/cover.repository", () => ({
  uploadCover: vi.fn(),
  removeUnusedCover: vi.fn()
}));
vi.mock(
  "@/features/sessions/repositories/organizer-sessions.repository",
  () => ({
    fetchOrganizerInventory: vi.fn(),
    saveSessionRecord: vi.fn(),
    deleteDraftRecord: vi.fn(),
    setSeriesStatusRecord: vi.fn()
  })
);

describe("session and venue attributes", () => {
  it("keeps the groups explicit and rejects duplicate or unrecognized codes", () => {
    expect(sessionAttributesSchema.safeParse(["showers"]).success).toBe(false);
    expect(venueAttributesSchema.safeParse(["new_balls"]).success).toBe(false);
    expect(
      sessionAttributesSchema.safeParse(["snacks", "snacks"]).success
    ).toBe(false);
    expect(
      venueAttributesSchema.safeParse(["free_parking", "paid_parking"]).success
    ).toBe(true);
  });
  it("normalizes new balls without a redundant provided-balls chip", () => {
    expect(
      normalizeSessionAttributes(["balls_provided", "new_balls", "snacks"])
    ).toEqual(["new_balls", "snacks"]);
    expect(toggleSessionAttribute(["new_balls"], "balls_provided")).toEqual([
      "balls_provided"
    ]);
    expect(toggleSessionAttribute(["balls_provided"], "new_balls")).toEqual([
      "new_balls"
    ]);
    expect(toggleSessionAttribute(["new_balls"], "new_balls")).toEqual([]);
  });
  it("keeps display order stable and every supported code has a label and icon", () => {
    expect(
      orderedAttributes(["showers", "snacks", "balls_provided", "new_balls"])
    ).toEqual(["new_balls", "snacks", "showers"]);
    expect(
      new Set([...sessionAttributeCodes, ...venueAttributeCodes]).size
    ).toBe(16);
  });
  it("retains optional selections in drafts, including incomplete new venues", () => {
    const parsed = sessionDraftSchema.parse({
      ...initialSessionForm(),
      sessionAttributes: ["coaching"],
      venueAttributes: ["water_dispenser"],
      venueAttributesEdited: true
    });
    expect(parsed.sessionAttributes).toEqual(["coaching"]);
    expect(parsed.venueAttributes).toEqual(["water_dispenser"]);
  });
  it("loads the actual occurrence selections instead of stale series draft defaults", () => {
    const form = formFromSession(
      { ...sample, attributes: ["drinks"] },
      undefined,
      {
        ...initialSessionForm(),
        sessionAttributes: ["coaching"],
        venueAttributesEdited: true
      }
    );
    expect(form.sessionAttributes).toEqual(["drinks"]);
    expect(form.venueAttributesEdited).toBe(false);
    expect(form.venueAttributes).toEqual([]);
  });
});
