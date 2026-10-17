import { supabase } from "@/lib/supabase";
import type { AttendanceInput } from "../domain";
function client() {
  if (!supabase) throw new Error("Attendance access is unavailable.");
  return supabase;
}
export async function fetchRoster(sessionId: string) {
  const { data, error } = await client().rpc("get_organizer_roster", {
    p_session_id: sessionId
  });
  if (error) throw error;
  return data;
}
export async function writeAttendance(input: AttendanceInput) {
  const { data, error } = await client().rpc("set_registration_attendance", {
    p_registration_id: input.registration_id,
    p_arrived: input.arrived,
    p_expected_version: input.expected_version
  });
  if (error) throw error;
  return data;
}
