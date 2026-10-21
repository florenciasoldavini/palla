import { describe, expect, it } from "vitest";
import { parseReviewPush, pushSubscriptionSchema } from "./inbox-domain";
const payload = {
  type: "registration_notification",
  notification_id: "bf300000-0000-4000-8000-000000000001",
  recipient_id: "bf300000-0000-4000-8000-000000000002",
  mode: "organizer"
};
describe("registration push validation", () => {
  it.each([
    "new_registrations",
    "player_cancellations",
    "waitlist_joins",
    "waitlist_departures"
  ])("accepts %s with its own preference", (notification_type) => {
    expect(
      parseReviewPush({ ...payload, notification_type })?.notification_type
    ).toBe(notification_type);
  });
  it("rejects incomplete, unknown, or player-mode activity payloads", () => {
    expect(parseReviewPush(payload)).toBeNull();
    expect(
      parseReviewPush({ ...payload, notification_type: "unknown" })
    ).toBeNull();
    expect(
      parseReviewPush({
        ...payload,
        notification_type: "new_registrations",
        mode: "player"
      })
    ).toBeNull();
  });
  it("defaults missing server subscription keys off during rollout", () => {
    const state = pushSubscriptionSchema.parse({
      chat_messages: true,
      review_reminders: true,
      new_reviews: true,
      session_announcements: true
    });
    expect(state.new_registrations).toBe(false);
    expect(state.player_cancellations).toBe(false);
  });
});

it("requires player mode for waitlist promotion pushes", () => {
  expect(
    parseReviewPush({ ...payload, notification_type: "waitlist_promotions" })
  ).toBeNull();
  expect(
    parseReviewPush({
      ...payload,
      notification_type: "waitlist_promotions",
      mode: "player"
    })
  ).not.toBeNull();
});
