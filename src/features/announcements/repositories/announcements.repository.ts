import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";
import type { PublishAnnouncement } from "../domain";
async function rpc(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw toRepositoryError(error);
  return data;
}
export const fetchSessionAnnouncements = (id: string) =>
  rpc("get_session_announcements", { p_session: id });
export const fetchAnnouncement = (id: string) =>
  rpc("get_session_announcement", { p_id: id });
export const removeAnnouncement = (id: string) =>
  rpc("remove_session_announcement", { p_id: id });
export async function publishAnnouncement(
  input: PublishAnnouncement
): Promise<unknown> {
  const { data, error } = await requireSupabase().functions.invoke(
    "session-announcements",
    { body: input }
  );
  if (error) {
    // Edge errors keep the server's actionable validation message, never raw internal details.
    const response = (error as { context?: Response }).context;
    const detail =
      response instanceof Response
        ? await response.json().catch(() => null)
        : null;
    throw new Error(
      typeof detail?.error === "string"
        ? detail.error
        : "Couldn’t send announcement. Check your connection and try again."
    );
  }
  return data;
}
