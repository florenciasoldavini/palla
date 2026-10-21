import { describe, expect, it } from "vitest";
import { reviewInputSchema, reportInputSchema } from "./domain";
import { parseReviewPush, settingSchema } from "../notifications/inbox-domain";
describe("review input and notification boundaries", () => {
  it("requires one whole star rating, keeps comments optional and bounded", () => {
    for (const rating of [0, 6, 1.5, NaN])
      expect(reviewInputSchema.safeParse({ rating, comment: "" }).success).toBe(
        false
      );
    expect(
      reviewInputSchema.parse({ rating: 4, comment: "  Nice session  " })
    ).toEqual({ rating: 4, comment: "Nice session" });
    expect(
      reviewInputSchema.safeParse({ rating: 1, comment: "x".repeat(2001) })
        .success
    ).toBe(false);
    expect(
      reviewInputSchema.safeParse({ rating: 5, comment: "" }).success
    ).toBe(true);
  });
  it("accepts only supported report reasons and does not require a comment", () => {
    expect(
      reportInputSchema.safeParse({ reason: "other", details: "" }).success
    ).toBe(true);
    expect(
      reportInputSchema.safeParse({ reason: "bad_rating", details: "" }).success
    ).toBe(false);
  });
  it("rejects arbitrary push routes and malformed destinations", () => {
    expect(
      parseReviewPush({
        type: "review_notification",
        notification_id: "https://evil.test",
        recipient_id: "x",
        mode: "player"
      })
    ).toBeNull();
    expect(parseReviewPush({ type: "chat_message" })).toBeNull();
  });
  it("accepts future catalog keys while requiring a valid audience/default value", () => {
    expect(
      settingSchema.safeParse({
        key: "future_feature",
        audience: "player",
        push_enabled: false
      }).success
    ).toBe(true);
    expect(
      settingSchema.safeParse({
        key: "future_feature",
        audience: "everyone",
        push_enabled: true
      }).success
    ).toBe(false);
  });
});
