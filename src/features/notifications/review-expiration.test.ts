import { describe, expect, it } from "vitest";
import { isExpiredReviewInvitation, type InboxItem } from "./inbox-domain";
import { isReviewWindowClosed } from "@/features/reviews/domain";

const deadline = "2026-10-19T16:00:00Z";
const boundary = Date.parse(deadline);
const invitation: InboxItem = {
  id: "a9000000-0000-4000-8000-000000000001",
  registration_id: "a9000000-0000-4000-8000-000000000002",
  session_id: "a9000000-0000-4000-8000-000000000003",
  notification_type: "review_reminders",
  review_id: null,
  review_status: null,
  created_at: "2026-10-05T17:00:00Z",
  read_at: null,
  deadline,
  session_title: "Social padel",
  host_name: "Alex Rivera",
  reviewer_name: "Elena García",
  can_review: true
};

describe("expired review invitation routing", () => {
  it("switches to an explanation at the exact deadline even with a stale eligibility flag", () => {
    expect(isExpiredReviewInvitation(invitation, boundary - 1)).toBe(false);
    expect(isExpiredReviewInvitation(invitation, boundary)).toBe(true);
    expect(isReviewWindowClosed(deadline, boundary + 1)).toBe(true);
  });
  it("keeps authored reviews available for reading/removal after the editing deadline", () => {
    for (const review_status of ["published", "hidden", "removed"] as const) {
      expect(
        isExpiredReviewInvitation({ ...invitation, review_status }, boundary)
      ).toBe(false);
    }
    expect(
      isExpiredReviewInvitation(
        { ...invitation, review_id: invitation.id },
        boundary
      )
    ).toBe(false);
  });
  it("preserves received reviews and does not confuse other ineligibility with expiration", () => {
    expect(
      isExpiredReviewInvitation(
        { ...invitation, notification_type: "new_reviews" },
        boundary
      )
    ).toBe(false);
    expect(
      isExpiredReviewInvitation(
        { ...invitation, can_review: false },
        boundary - 1
      )
    ).toBe(false);
  });
});
