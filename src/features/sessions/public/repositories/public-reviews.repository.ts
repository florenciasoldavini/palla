import { supabase } from "@/lib/supabase";
import type { ReviewCursor } from "../reviews-domain";

export async function fetchPublicReviews(
  id: string,
  limit: number,
  cursor: ReviewCursor | null,
  signal?: AbortSignal
) {
  if (!supabase) throw new Error("Review access is unavailable.");
  let request = supabase.rpc("get_public_session_reviews", {
    p_session_id: id,
    p_limit: limit,
    p_before_created_at: cursor?.created_at ?? undefined,
    p_before_id: cursor?.id ?? undefined
  });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
