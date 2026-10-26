import { z } from "zod";
import {
  inboxItemSchema,
  notificationKinds,
  notificationTargetSchema,
  settingSchema,
  pushSubscriptionSchema,
  type NotificationMode
} from "../inbox-domain";
import * as repo from "../repositories/inbox.repository";
export async function loadInbox(
  mode: NotificationMode,
  unread: boolean,
  before?: { created_at: string; id: string }
) {
  return z
    .array(inboxItemSchema)
    .parse(await repo.fetchInbox(mode, unread, before));
}
export async function loadUnreadCount(mode: NotificationMode) {
  return z
    .number()
    .int()
    .nonnegative()
    .parse(await repo.fetchUnreadCount(mode));
}
export async function markNotificationsRead(
  mode: NotificationMode,
  id: string | null
) {
  if (id) z.uuid().parse(id);
  await repo.markInboxRead(mode, id);
}
export async function loadNotificationTarget(id: string) {
  return notificationTargetSchema.parse(
    await repo.fetchNotificationTarget(z.uuid().parse(id))
  );
}
export async function loadNotificationSettings(mode: NotificationMode) {
  return z
    .array(settingSchema)
    .parse(await repo.fetchSettings(mode))
    .filter((row) => notificationKinds.some((key) => key === row.key));
}
export async function saveNotificationSetting(key: string, enabled: boolean) {
  z.enum(notificationKinds).parse(key);
  return z
    .boolean()
    .parse(await repo.updateSetting(key, z.boolean().parse(enabled)));
}
export async function loadPushSubscriptions() {
  return pushSubscriptionSchema.parse(await repo.fetchPushSubscriptionState());
}
