import { describe, expect, it } from "vitest";
import { sessionSeriesSchema } from "../domain";
import { initialSessionForm, sessionDraftSchema } from "./session-form";
import {
  defaultSessionSettings,
  sessionCreationSettingsSchema
} from "./session-settings";
const id = "00000000-0000-4000-8000-000000000001";
const series = {
  id,
  organizer_id: id,
  draft_input: initialSessionForm(),
  ...defaultSessionSettings(),
  status: "active",
  venue_id: id,
  title: "Saturday padel",
  description: null,
  court_label: null,
  capacity: 4,
  recurrence: "weekly",
  timezone: "America/Argentina/Buenos_Aires",
  weekday: 6,
  local_start_time: "18:00:00",
  duration_minutes: 90,
  starts_on: "2026-10-24",
  ends_on: "2026-11-14",
  created_at: "2026-10-14T12:00:00Z",
  updated_at: "2026-10-14T12:00:00Z"
};
describe("Normalized series contracts", () => {
  it("accepts active, paused and ended recurring templates", () => {
    for (const status of ["active", "paused", "ended"])
      expect(sessionSeriesSchema.safeParse({ ...series, status }).success).toBe(
        true
      );
    expect(
      sessionSeriesSchema.safeParse({ ...series, status: "published" }).success
    ).toBe(false);
  });
  it("requires a complete published template but allows incomplete drafts", () => {
    expect(
      sessionSeriesSchema.safeParse({ ...series, venue_id: null }).success
    ).toBe(false);
    expect(
      sessionSeriesSchema.safeParse({
        ...series,
        status: "draft",
        venue_id: null
      }).success
    ).toBe(true);
  });
  it("rejects paused one-offs and reversed dates", () => {
    expect(
      sessionSeriesSchema.safeParse({
        ...series,
        status: "paused",
        recurrence: "once",
        ends_on: series.starts_on
      }).success
    ).toBe(false);
    expect(
      sessionSeriesSchema.safeParse({ ...series, ends_on: "2026-10-23" })
        .success
    ).toBe(false);
  });
  it("validates the three gender policies and preserves legacy drafts", () => {
    for (const participant_gender_policy of ["all", "women_only", "men_only"])
      expect(
        sessionCreationSettingsSchema.safeParse({
          ...defaultSessionSettings(),
          participant_gender_policy
        }).success
      ).toBe(true);
    expect(
      sessionCreationSettingsSchema.safeParse({
        ...defaultSessionSettings(),
        participant_gender_policy: "mixed"
      }).success
    ).toBe(false);
    const { participant_gender_policy: _gender, ...legacy } =
      defaultSessionSettings();
    expect(
      sessionDraftSchema.safeParse({
        ...initialSessionForm(),
        settings: legacy
      }).success
    ).toBe(true);
  });
});
