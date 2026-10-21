import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
export async function joinSessionRecord(sessionId: string) {
  const { data, error } = await requireSupabase().rpc("join_session", {
    p_session_id: sessionId
  });
  if (error) throw error;
  return data;
}
