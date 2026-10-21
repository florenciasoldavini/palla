import { describe, expect, it } from "vitest";
import { reviewSessionDate, reviewSessionTime } from "./format";

describe("review session timing", () => {
  const context = {
    starts_at: "2026-10-20T01:00:00Z",
    ends_at: "2026-10-20T02:30:00Z",
    timezone: "America/Argentina/Buenos_Aires"
  };
  it("keeps the session's local day and time when UTC crosses midnight", () => {
    expect(reviewSessionDate(context)).toBe(
      new Date(context.starts_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        timeZone: context.timezone
      })
    );
    expect(reviewSessionDate(context)).toContain("19");
    expect(reviewSessionTime(context)).toBe("22:00–23:30");
  });
});
