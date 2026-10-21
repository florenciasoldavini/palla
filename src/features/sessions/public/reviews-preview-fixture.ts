import type { PublicReviews } from "./reviews-domain";

// No-write native design preview; never used by production queries.
export const publicReviewsPreview: PublicReviews = {
  total: 18,
  average: 4.8,
  distribution: [15, 2, 1, 0, 0],
  next_cursor: null,
  items: Array.from({ length: 18 }, (_, index) => ({
    id: `be000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    rating: index < 15 ? 5 : index < 17 ? 4 : 3,
    reviewer_name: ["Marcos Rivera", "Elena Salgado", "David Kim"][index % 3],
    reviewer_avatar_url: null,
    comment:
      index === 2
        ? null
        : [
            "Good organization, plenty of playing time and a friendly group. We started right on time.",
            "Really enjoyed the matches. Easy to join in, and everyone got a good amount of time on court."
          ][index % 2],
    session_starts_at: "2026-10-16T19:00:00-03:00",
    timezone: "America/Argentina/Buenos_Aires",
    created_at: "2026-10-17T12:00:00Z"
  }))
};
export const emptyPublicReviews: PublicReviews = {
  total: 0,
  average: null,
  distribution: [0, 0, 0, 0, 0],
  items: [],
  next_cursor: null
};
