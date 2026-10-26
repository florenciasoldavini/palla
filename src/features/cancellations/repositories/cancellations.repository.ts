import { supabase } from "@/lib/supabase";
import type { CancelOccurrence } from "../domain";
function client() {
  if (!supabase) throw new Error("Session access is unavailable.");
  return supabase;
}
export async function fetchCancellation(id: string, single: boolean) {
  const { data, error } = await client().rpc(
    single ? "get_session_cancellation" : "get_session_cancellation_context",
    single ? { p_id: id } : { p_session: id }
  );
  if (error) throw error;
  return data as unknown;
}
export async function cancelOccurrenceRecord(input: CancelOccurrence) {
  const { data, error } = await client().rpc("cancel_session_occurrences", {
    p_session: input.session_id,
    // Multi-date cancellation deliberately has no UI or application input.
    p_scope: "one",
    p_reason_code: input.reason_code,
    p_message: input.message,
    p_expected_version: input.expected_version,
    p_request: input.request_id,
    p_expected_count: input.expected_count
  });
  if (error) throw error;
  return data as unknown;
}
