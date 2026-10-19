import { z } from "zod";
import {
  reviewContextSchema,
  reviewInputSchema,
  reportInputSchema,
  type ReviewInput,
  type ReportInput
} from "../domain";
import {
  fetchReviewContext,
  submitReviewRecord,
  removeReviewRecord,
  reportReviewRecord
} from "../repositories/reviews.repository";
export async function loadReviewContext(id: string) {
  return reviewContextSchema.parse(
    await fetchReviewContext(z.uuid().parse(id))
  );
}
export async function submitReview(
  id: string,
  input: ReviewInput,
  expected: string | null
) {
  const value = reviewInputSchema.parse(input);
  return reviewContextSchema.parse(
    await submitReviewRecord(
      z.uuid().parse(id),
      value.rating,
      value.comment,
      expected
    )
  );
}
export async function removeReview(id: string) {
  await removeReviewRecord(z.uuid().parse(id));
}
export async function reportReview(id: string, input: ReportInput) {
  const value = reportInputSchema.parse(input);
  await reportReviewRecord(z.uuid().parse(id), value.reason, value.details);
}
