import { supabase } from "@/lib/supabase";

export async function fetchPublicSession(id: string, signal?: AbortSignal) {
  if (!supabase) throw new Error("Session access is unavailable.");
  let request = supabase.rpc("get_public_session_detail", { p_session_id: id });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
