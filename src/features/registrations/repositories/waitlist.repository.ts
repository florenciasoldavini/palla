import { supabase } from "@/lib/supabase";
import type { WaitlistAction, WaitlistMode } from "../waitlist-domain";
function client() {
  if (!supabase) throw new Error("Waitlist access is unavailable.");
  return supabase;
}
export async function fetchWaitlist(sessionId: string) {
  const { data, error } = await client().rpc("get_organizer_waitlist", {
    p_session_id: sessionId
  });
  if (error) throw error;
  return data;
}
export async function writeWaitlistAction(input: WaitlistAction) {
  const { data, error } = await client().rpc("manage_organizer_waitlist", {
    p_registration_id: input.registration_id,
    p_action: input.action,
    p_expected_version: input.expected_version
  });
  if (error) throw error;
  return data;
}
export async function writeWaitlistMode(input: WaitlistMode) {
  const { data, error } = await client().rpc("set_organizer_waitlist_mode", {
    p_session_id: input.session_id,
    p_mode: input.mode,
    p_expected_version: input.expected_version
  });
  if (error) throw error;
  return data;
}
