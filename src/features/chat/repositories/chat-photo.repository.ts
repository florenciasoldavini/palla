import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
import { OutboxSendError } from "../offline-errors";
export async function photoRequest(
  body: Record<string, unknown>,
  actor?: string,
  signal?: AbortSignal
) {
  const client = requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();
  if (!session || (actor && session.user.id !== actor) || signal?.aborted)
    throw new OutboxSendError(true);
  const { data, error } = await client.functions.invoke("chat-photo", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
    signal
  });
  if (error) {
    const response = "context" in error ? error.context : undefined;
    const status = response instanceof Response ? response.status : 0;
    throw new OutboxSendError(
      status === 0 ||
        status === 401 ||
        status === 408 ||
        status === 429 ||
        status >= 500
    );
  }
  return data;
}
