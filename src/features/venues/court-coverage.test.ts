import { describe, expect, it } from "vitest";
import {
  venueCourtCoverageSchema,
  effectiveCourtCoverage,
  coverageLabel
} from "./court-coverage";
import {
  sessionFormSchema,
  sessionDraftSchema,
  initialSessionForm
} from "@/features/sessions/validation/session-form";
const base = {
  ...initialSessionForm(),
  title: "Coverage test",
  venueName: "Club",
  venueAddress: "Address 123",
  date: "2026-12-01",
  lastDate: "2026-12-01",
  courtConfirmed: true
};
describe("court roof coverage", () => {
  it("supports either or both venue choices and keeps unknown separate from uncovered", () => {
    for (const value of [
      [],
      ["covered"],
      ["uncovered"],
      ["covered", "uncovered"]
    ])
      expect(venueCourtCoverageSchema.safeParse(value).success).toBe(true);
    for (const value of [["indoor"], ["covered", "covered"], [null]])
      expect(venueCourtCoverageSchema.safeParse(value).success).toBe(false);
    expect(coverageLabel(null)).toBe("Not specified");
    expect(coverageLabel("uncovered")).toBe("Uncovered");
  });
  it("automatically uses a single type but requires a choice for mixed venues on publish", () => {
    expect(effectiveCourtCoverage(["covered"])).toBe("covered");
    expect(
      sessionFormSchema.safeParse({ ...base, venueCourtCoverage: ["covered"] })
        .success
    ).toBe(true);
    expect(
      sessionFormSchema.safeParse({
        ...base,
        venueCourtCoverage: ["covered", "uncovered"]
      }).success
    ).toBe(false);
    expect(
      sessionDraftSchema.safeParse({
        ...base,
        venueCourtCoverage: ["covered", "uncovered"]
      }).success
    ).toBe(true);
    expect(
      sessionFormSchema.safeParse({
        ...base,
        venueCourtCoverage: ["covered", "uncovered"],
        courtCoverage: "uncovered"
      }).success
    ).toBe(true);
  });
  it("rejects conflicting choices and supports an explicit session court for unknown venues", () => {
    expect(
      sessionFormSchema.safeParse({
        ...base,
        venueCourtCoverage: ["covered"],
        courtCoverage: "uncovered"
      }).success
    ).toBe(false);
    expect(
      sessionFormSchema.safeParse({
        ...base,
        venueCourtCoverage: [],
        courtCoverage: "covered"
      }).success
    ).toBe(true);
    expect(sessionFormSchema.safeParse(base).success).toBe(true);
  });
});
