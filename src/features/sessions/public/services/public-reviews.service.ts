import { z } from "zod";
import {
  publicReviewsSchema,
  reviewCursorSchema,
  type ReviewCursor
} from "../reviews-domain";
import { fetchPublicReviews } from "../repositories/public-reviews.repository";

export async function loadPublicReviews(
  id: string,
  limit = 20,
  cursor: ReviewCursor | null = null,
  signal?: AbortSignal
) {
  if (!z.uuid().safeParse(id).success) return null;
  z.number().int().min(1).max(20).parse(limit);
  reviewCursorSchema.nullable().parse(cursor);
  return publicReviewsSchema
    .nullable()
    .parse(await fetchPublicReviews(id, limit, cursor, signal));
}
