import { describe, expect, it } from "vitest";
import {
  defaultSessionSettings,
  sessionCreationSettingsSchema
} from "./session-settings";
import { initialSessionForm } from "./session-form";
import { settingsFromForm } from "../services/session-settings.adapter";
import { sessionInputSchema } from "../domain";

describe("Session creation settings", () => {
  it("supports optional timing and independent public/private visibility", () => {
    const input = defaultSessionSettings();
    expect(sessionCreationSettingsSchema.parse(input)).toEqual(input);
    expect(
      sessionCreationSettingsSchema.parse({ ...input, visibility: "private" })
        .visibility
    ).toBe("private");
  });
  it("preserves non-contiguous categories and rejects invalid selections", () => {
    expect(
      sessionCreationSettingsSchema.parse({
        ...defaultSessionSettings(),
        allowed_categories: [5, 7]
      }).allowed_categories
    ).toEqual([5, 7]);
    for (const allowed_categories of [[], [5, 5], [0], [9], [6.5]])
      expect(
        sessionCreationSettingsSchema.safeParse({
          ...defaultSessionSettings(),
          allowed_categories
        }).success
      ).toBe(false);
  });
  it("opens registration before its effective close; validates queue settings", () => {
    const valid = {
      ...defaultSessionSettings(),
      registration_opens_minutes_before: 10080,
      registration_closes_minutes_before: 120,
      waitlist_enabled: true,
      waitlist_promotion_mode: "manual",
      waitlist_capacity: 8
    };
    expect(sessionCreationSettingsSchema.safeParse(valid).success).toBe(true);
    for (const patch of [
      { registration_opens_minutes_before: 120 },
      { registration_opens_minutes_before: -1 },
      { cancellation_notice_minutes: 527041 },
      { waitlist_capacity: 0 },
      { waitlist_capacity: 2.5 },
      { waitlist_promotion_mode: "invalid" }
    ])
      expect(
        sessionCreationSettingsSchema.safeParse({ ...valid, ...patch }).success
      ).toBe(false);
  });
  it("keeps the current creation form compatible without adding new UI", () => {
    expect(
      settingsFromForm({
        ...initialSessionForm(),
        categoryMode: "range",
        categoryMin: "5",
        categoryMax: "7"
      })
    ).toMatchObject({
      allowed_categories: [5, 6, 7],
      strict_category_enforcement: false,
      participant_gender_policy: "all",
      visibility: "private",
      registration_closes_minutes_before: 120,
      cancellation_notice_minutes: 1440
    });
  });
  it("preserves canonical settings on unrelated legacy edits, but honors explicit category/deadline edits", () => {
    const baseline = {
      categoryMode: "range" as const,
      categoryMin: "5",
      categoryMax: "7",
      registrationHours: "0",
      cancellationHours: "0"
    };
    const form = {
      ...initialSessionForm(),
      ...baseline,
      settings: { ...defaultSessionSettings(), allowed_categories: [5, 7] },
      legacySettingsBaseline: baseline
    };
    expect(settingsFromForm({ ...form, title: "New title" })).toMatchObject({
      allowed_categories: [5, 7],
      registration_closes_minutes_before: null,
      cancellation_notice_minutes: null
    });
    expect(
      settingsFromForm({ ...form, categoryMax: "6", registrationHours: "3" })
    ).toMatchObject({
      allowed_categories: [5, 6],
      registration_closes_minutes_before: 180
    });
  });
  it("requires opening before the effective session-start close when deadlines are null", () => {
    const input = {
      ...defaultSessionSettings(),
      venue_id: "00000000-0000-4000-8000-000000000001",
      title: "Social",
      description: null,
      court_label: null,
      capacity: 4,
      price_minor: 0,
      currency: "ARS",
      payment_instructions: null,
      starts_at: "2026-11-03T19:00:00-03:00",
      ends_at: "2026-11-03T20:30:00-03:00",
      registration_opens_at: null,
      registration_closes_at: null,
      cancellation_deadline_at: null
    };
    const {
      registration_opens_minutes_before: _o,
      registration_closes_minutes_before: _c,
      cancellation_notice_minutes: _n,
      ...record
    } = input;
    expect(sessionInputSchema.safeParse(record).success).toBe(true);
    expect(
      sessionInputSchema.safeParse({
        ...record,
        registration_opens_at: record.starts_at
      }).success
    ).toBe(false);
  });
});
