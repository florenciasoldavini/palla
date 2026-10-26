import { z } from "zod";

export const publicReviewSchema = z.object({
  id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  session_starts_at: z.iso.datetime({ offset: true }),
  timezone: z.string(),
  reviewer_name: z.string(),
  reviewer_avatar_url: z.string().nullable()
});
export const reviewCursorSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid()
});
export const publicReviewsSchema = z
  .object({
    total: z.number().int().nonnegative(),
    average: z.number().min(1).max(5).nullable(),
    distribution: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative()
    ]),
    items: z.array(publicReviewSchema).max(20),
    next_cursor: reviewCursorSchema.nullable()
  })
  .refine(
    (data) =>
      data.distribution.reduce((a, b) => a + b, 0) === data.total &&
      (data.total === 0) === (data.average === null),
    "Invalid review summary"
  );
export type PublicReview = z.infer<typeof publicReviewSchema>;
export type PublicReviews = z.infer<typeof publicReviewsSchema>;
export type ReviewCursor = z.infer<typeof reviewCursorSchema>;
