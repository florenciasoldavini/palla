import { describe, expect, it } from "vitest";
import {
  categoriesLabel,
  publicSessionSchema,
  publicSessionState
} from "./domain";
import { publicSessionPreview as s } from "./preview-fixture";
const now = Date.parse("2026-10-23T15:00:00-03:00");
describe("public occurrence availability", () => {
  it("uses cancellation and completion before capacity", () => {
    expect(publicSessionState({ ...s, status: "cancelled" }, now)).toBe(
      "cancelled"
    );
    expect(publicSessionState({ ...s, status: "completed" }, now)).toBe(
      "completed"
    );
    expect(publicSessionState(s, Date.parse(s.ends_at))).toBe("completed");
  });
  it("closes at the exact cutoff and start", () => {
    expect(publicSessionState(s, Date.parse(s.registration_closes_at!))).toBe(
      "closed"
    );
    expect(
      publicSessionState(
        { ...s, registration_closes_at: null },
        Date.parse(s.starts_at)
      )
    ).toBe("started");
  });
  it("does not advertise joining before opening or after cutoff", () => {
    expect(
      publicSessionState(
        {
          ...s,
          confirmed_count: 4,
          registration_opens_at: "2026-10-23T16:00:00-03:00"
        },
        now
      )
    ).toBe("not_open");
    expect(
      publicSessionState(
        { ...s, confirmed_count: 4 },
        Date.parse(s.registration_closes_at!)
      )
    ).toBe("closed");
  });
  it("distinguishes available and full", () => {
    expect(publicSessionState(s, now)).toBe("available");
    expect(publicSessionState({ ...s, confirmed_count: 4 }, now)).toBe("full");
  });
  it("preserves non-contiguous categories", () => {
    expect(categoriesLabel([7, 6])).toBe("6ta–7ma");
    expect(categoriesLabel([4, 6])).toBe("4ta, 6ta");
    expect(categoriesLabel(null)).toBe("All levels");
  });
  it("rejects impossible categories and negative occupancy", () => {
    expect(
      publicSessionSchema.safeParse({ ...s, confirmed_count: -1 }).success
    ).toBe(false);
    expect(
      publicSessionSchema.safeParse({ ...s, allowed_categories: [9] }).success
    ).toBe(false);
  });
});
