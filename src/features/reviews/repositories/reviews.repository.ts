import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw toRepositoryError(error);
  return data as unknown;
}
export const fetchReviewContext = (registration: string) =>
  rpc("get_review_context", { p_registration: registration });
export const submitReviewRecord = (
  registration: string,
  rating: number,
  comment: string,
  expected: string | null
) =>
  rpc("submit_session_review", {
    p_registration: registration,
    p_rating: rating,
    p_comment: comment,
    p_expected_updated_at: expected
  });
export const removeReviewRecord = (id: string) =>
  rpc("remove_session_review", { p_review: id });
export const reportReviewRecord = (
  id: string,
  reason: string,
  details: string
) =>
  rpc("report_session_review", {
    p_review: id,
    p_reason: reason,
    p_details: details
  });
