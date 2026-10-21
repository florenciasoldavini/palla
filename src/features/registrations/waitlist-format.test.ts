import { describe, expect, it } from "vitest";
import { waitlistJoinedLabel } from "./waitlist-format";
const now = Date.parse("2026-10-14T18:00:00Z");
describe("waitlist registration age", () => {
  it("shows elapsed minutes, hours and days from the registration timestamp", () => {
    expect(waitlistJoinedLabel("2026-10-14T17:30:00Z", now)).toBe(
      "Joined 30m ago"
    );
    expect(waitlistJoinedLabel("2026-10-14T16:00:00Z", now)).toBe(
      "Joined 2h ago"
    );
    expect(waitlistJoinedLabel("2026-10-12T18:00:00Z", now)).toBe(
      "Joined 2d ago"
    );
  });
  it("handles a newly joined player or a small device clock difference", () => {
    expect(waitlistJoinedLabel("2026-10-14T17:59:40Z", now)).toBe(
      "Joined just now"
    );
    expect(waitlistJoinedLabel("2026-10-14T18:01:00Z", now)).toBe(
      "Joined just now"
    );
  });
});
