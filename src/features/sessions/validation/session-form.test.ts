import { describe, expect, it, vi } from "vitest";
import { defaultSessionSettings } from "./session-settings";
import {
  initialSessionForm,
  sessionFormSchema,
  sessionDraftSchema,
  occurrenceCount,
  sessionStart
} from "./session-form";
const form = {
  ...initialSessionForm(),
  title: "Social padel",
  venueName: "Club",
  venueAddress: "Address 123",
  date: "2026-11-03",
  lastDate: "2026-12-01",
  courtConfirmed: true
};
describe("Organizer session input", () => {
  it("defaults to tomorrow in Buenos Aires after UTC midnight", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-14T00:30:00Z"));
      expect(initialSessionForm().date).toBe("2026-10-14");
    } finally {
      vi.useRealTimers();
    }
  });
  it("saves incomplete drafts but requires location and title to publish", () => {
    expect(sessionDraftSchema.safeParse(initialSessionForm()).success).toBe(
      true
    );
    expect(sessionFormSchema.safeParse(initialSessionForm()).success).toBe(
      false
    );
    expect(sessionFormSchema.safeParse(form).success).toBe(true);
  });
  it("limits weekly creation and includes the first date", () => {
    expect(occurrenceCount({ ...form, repeat: "weekly" })).toBe(5);
    expect(occurrenceCount(form)).toBe(1);
    for (const lastDate of ["2026-11-02", "2027-11-03"])
      expect(
        sessionFormSchema.safeParse({ ...form, repeat: "weekly", lastDate })
          .success
      ).toBe(false);
  });
  it("uses Argentine integer categories and inclusive ascending numeric bounds", () => {
    expect(
      sessionFormSchema.safeParse({
        ...form,
        categoryMode: "range",
        categoryMin: "6",
        categoryMax: "7"
      }).success
    ).toBe(true);
    for (const bounds of [
      ["7", "6"],
      ["1", "9"],
      ["2.5", "4"]
    ])
      expect(
        sessionFormSchema.safeParse({
          ...form,
          categoryMode: "range",
          categoryMin: bounds[0],
          categoryMax: bounds[1]
        }).success
      ).toBe(false);
  });
  it("rejects fractional capacity, invalid deadlines, midnight crossing and unrepresentable prices", () => {
    for (const patch of [
      { capacity: "0" },
      { capacity: "4.5" },
      { registrationHours: "-1" },
      { cancellationHours: "721" },
      { endTime: "18:00" },
      { price: "12.001" },
      { price: "21474836.48" }
    ])
      expect(sessionFormSchema.safeParse({ ...form, ...patch }).success).toBe(
        false
      );
  });
  it("uses canonical settings rather than hidden legacy deadline limits when editing", () => {
    const input = {
      ...form,
      cancellationHours: "744",
      registrationHours: "8760",
      settings: {
        ...defaultSessionSettings(),
        cancellation_notice_minutes: 44640
      }
    };
    expect(sessionFormSchema.safeParse(input).success).toBe(true);
    expect(
      sessionFormSchema.safeParse({
        ...input,
        settings: { ...input.settings, cancellation_notice_minutes: 527041 }
      }).success
    ).toBe(false);
  });
  it("interprets club schedules as Buenos Aires instants regardless of device timezone", () => {
    expect(sessionStart(form).toISOString()).toBe("2026-11-03T22:00:00.000Z");
  });
});
