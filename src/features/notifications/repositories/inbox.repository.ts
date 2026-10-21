import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";
async function rpc(
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw toRepositoryError(error);
  return data;
}
export const fetchInbox = (
  mode: string,
  unread: boolean,
  before?: { created_at: string; id: string }
) =>
  rpc("get_notification_inbox", {
    p_mode: mode,
    p_unread: unread,
    p_before: before?.created_at ?? null,
    p_before_id: before?.id ?? null
  });
export const fetchUnreadCount = (mode: string) =>
  rpc("get_unread_notification_count", { p_mode: mode });
export const markInboxRead = (mode: string, id: string | null) =>
  rpc("mark_notifications_read", { p_mode: mode, p_id: id });
export const fetchNotificationTarget = (id: string) =>
  rpc("get_notification_target", { p_id: id });
export const fetchSettings = (mode: string) =>
  rpc("get_notification_settings", { p_mode: mode });
export const updateSetting = (key: string, enabled: boolean) =>
  rpc("set_notification_preference", { p_type: key, p_enabled: enabled });
export const fetchPushSubscriptionState = () =>
  rpc("get_push_subscription_state");
