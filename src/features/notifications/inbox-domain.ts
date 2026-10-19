import { z } from "zod";
import { isReviewWindowClosed } from "@/features/reviews/domain";
export type NotificationMode = "player" | "organizer";
export const notificationKinds = [
  "chat_messages",
  "review_reminders",
  "new_reviews"
] as const;
export type NotificationKind = (typeof notificationKinds)[number];
export const notificationCopy: Record<
  NotificationKind,
  { title: string; description: string; group: string }
> = {
  chat_messages: {
    title: "Chat messages",
    description: "Push notifications for new messages across all chats.",
    group: "Messages"
  },
  review_reminders: {
    title: "Reminders to review sessions",
    description: "A reminder to share your experience after a session.",
    group: "Reviews"
  },
  new_reviews: {
    title: "Reviews of your sessions",
    description:
      "When a player publishes a new review of a session you hosted.",
    group: "Reviews"
  }
};
export const settingSchema = z.object({
  key: z.string(),
  audience: z.enum(["shared", "player", "organizer"]),
  push_enabled: z.boolean()
});
export type NotificationSetting = z.infer<typeof settingSchema>;
export const inboxItemSchema = z.object({
  id: z.uuid(),
  notification_type: z.enum(["review_reminders", "new_reviews"]),
  registration_id: z.uuid(),
  review_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  read_at: z.iso.datetime({ offset: true }).nullable(),
  session_id: z.uuid(),
  session_title: z.string(),
  deadline: z.iso.datetime({ offset: true }),
  host_name: z.string(),
  reviewer_name: z.string(),
  review_status: z.enum(["published", "hidden", "removed"]).nullable(),
  can_review: z.boolean()
});
export type InboxItem = z.infer<typeof inboxItemSchema>;
export const notificationTargetSchema = z.object({
  id: z.uuid(),
  registration_id: z.uuid(),
  mode: z.enum(["player", "organizer"])
});
export const pushSubscriptionSchema = z.object({
  chat_messages: z.boolean(),
  review_reminders: z.boolean(),
  new_reviews: z.boolean()
});
export const reviewPushSchema = z.object({
  type: z.literal("review_notification"),
  notification_id: z.uuid(),
  recipient_id: z.uuid(),
  mode: z.enum(["player", "organizer"])
});
export function parseReviewPush(data: unknown) {
  const parsed = reviewPushSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export type PushSubscriptions = z.infer<typeof pushSubscriptionSchema>;

export function isExpiredReviewInvitation(item: InboxItem, now = Date.now()) {
  return (
    item.notification_type === "review_reminders" &&
    !item.review_id &&
    !item.review_status &&
    isReviewWindowClosed(item.deadline, now)
  );
}
