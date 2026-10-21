import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";
export async function getChatNotificationPreference(): Promise<unknown> {
  const { data, error } = await requireSupabase().rpc(
    "get_chat_notification_preference"
  );
  if (error) throw toRepositoryError(error);
  return data;
}
export async function setChatNotificationPreference(
  enabled: boolean
): Promise<unknown> {
  const { data, error } = await requireSupabase().rpc(
    "set_chat_notification_preference",
    { p_enabled: enabled }
  );
  if (error) throw toRepositoryError(error);
  return data;
}
