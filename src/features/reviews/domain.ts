import { z } from "zod";
export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating.").max(5),
  comment: z
    .string()
    .trim()
    .max(2000, "Keep your review within 2,000 characters.")
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export const reviewSchema = z.object({
  id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  status: z.enum(["published", "hidden", "removed"]),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true })
});
export const reviewContextSchema = z.object({
  registration_id: z.uuid(),
  session_id: z.uuid(),
  session_title: z.string(),
  starts_at: z.iso.datetime({ offset: true }),
  timezone: z.string(),
  ends_at: z.iso.datetime({ offset: true }),
  deadline: z.iso.datetime({ offset: true }),
  host_name: z.string(),
  reviewer_name: z.string(),
  is_author: z.boolean(),
  eligible: z.boolean(),
  reported: z.boolean(),
  review: reviewSchema.nullable()
});
export type ReviewContext = z.infer<typeof reviewContextSchema>;
export const reportReasons = {
  harassment: "Harassment or offensive content",
  personal_information: "Personal information",
  spam: "Spam or promotion",
  manipulation: "Fake or manipulated review",
  other: "Other"
} as const;
export const reportInputSchema = z.object({
  reason: z.enum([
    "harassment",
    "personal_information",
    "spam",
    "manipulation",
    "other"
  ]),
  details: z.string().trim().max(2000, "Keep details within 2,000 characters.")
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export function isReviewWindowClosed(deadline: string, now = Date.now()) {
  return Date.parse(deadline) <= now;
}
