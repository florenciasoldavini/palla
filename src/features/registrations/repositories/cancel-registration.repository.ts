import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
export async function cancelRegistrationRecord(sessionId: string) {
  const { data, error } = await requireSupabase().rpc(
    "cancel_session_registration",
    { p_session_id: sessionId }
  );
  if (error) throw error;
  return data;
}
