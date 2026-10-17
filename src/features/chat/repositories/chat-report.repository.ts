import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
import type { ChatReportInput } from "../report-domain";
export async function writeChatReport(body: ChatReportInput) {
  const { data, error } = await requireSupabase().functions.invoke(
    "chat-report",
    { body }
  );
  if (error) {
    let code = "unavailable";
    const response = "context" in error ? error.context : undefined;
    if (response instanceof Response) {
      try {
        code = (await response.json()).error ?? code;
      } catch {
        /* Keep a recoverable network error. */
      }
    }
    throw new Error(code);
  }
  return data;
}
