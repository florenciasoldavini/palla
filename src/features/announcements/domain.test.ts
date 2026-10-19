import { describe, expect, it } from "vitest";
import { announcementBodySchema, publishAnnouncementSchema } from "./domain";
import { parseReviewPush } from "@/features/notifications/inbox-domain";
describe("announcement validation", () => {
  it("trims whitespace and rejects empty or oversized messages", () => {
    expect(announcementBodySchema.parse("  Court 3\nToday  ")).toBe(
      "Court 3\nToday"
    );
    expect(announcementBodySchema.safeParse(" \n ").success).toBe(false);
    expect(announcementBodySchema.safeParse("a".repeat(1000)).success).toBe(
      true
    );
    expect(announcementBodySchema.safeParse("a".repeat(1001)).success).toBe(
      false
    );
  });
  it("requires a stable request ID and confirmed audience for sends", () => {
    expect(
      publishAnnouncementSchema.safeParse({ body: "Hello", expected_count: 0 })
        .success
    ).toBe(false);
  });
  it("accepts only typed push targets, never an arbitrary navigation URL", () => {
    const data = {
      type: "announcement_notification",
      notification_id: "aa000000-0000-4000-8000-000000000001",
      recipient_id: "aa000000-0000-4000-8000-000000000002",
      mode: "player"
    };
    expect(parseReviewPush(data)?.type).toBe("announcement_notification");
    expect(
      parseReviewPush({ ...data, notification_id: "https://example.com" })
    ).toBeNull();
  });
});
