import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";
export async function registerPushDevice(
  installation: string,
  token: string,
  platform: "ios" | "android",
  actor: string
) {
  const { error } = await requireSupabase().rpc("register_chat_push_device", {
    p_installation_id: installation,
    p_token: token,
    p_platform: platform,
    p_actor: actor
  });
  if (error) throw toRepositoryError(error);
}
export async function unregisterPushDevice(installation: string) {
  const { error } = await requireSupabase().rpc("unregister_chat_push_device", {
    p_installation_id: installation
  });
  if (error) throw toRepositoryError(error);
}
