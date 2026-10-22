import {
  courtCoverageSchema,
  venueCourtCoverageSchema
} from "@/features/venues/court-coverage";
import { venueCoordinatesShape } from "@/features/venues/coordinates";
import {
  sessionAttributesSchema,
  venueAttributesSchema
} from "@/features/attributes/domain";
import { z } from "zod";
import { timestampSchema, timezoneSchema } from "@/types/domain-schema";
import { allowedCategoriesSchema } from "../validation/session-settings";

export const publicPlayerSchema = z.object({
  name: z.string(),
  avatar_url: z.string().nullable(),
  category: z.number().int().min(1).max(8).nullable()
});
export const publicSessionSchema = z.object({
  court_coverage: courtCoverageSchema.nullable().optional(),
  has_cover_image: z.boolean().default(false),
  attributes: sessionAttributesSchema.default([]),
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  court_label: z.string().nullable(),
  starts_at: timestampSchema,
  ends_at: timestampSchema,
  timezone: timezoneSchema,
  status: z.enum(["published", "cancelled", "completed"]),
  visibility: z.enum(["public", "private"]),
  capacity: z.number().int().positive(),
  waitlist_enabled: z.boolean().default(false),
  waitlist_capacity: z.number().int().nonnegative().nullable().default(null),
  waitlisted_count: z.number().int().nonnegative().default(0),
  confirmed_count: z.number().int().nonnegative(),
  allowed_categories: allowedCategoriesSchema,
  participant_gender_policy: z.enum(["all", "men_only", "women_only"]),
  price_minor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  registration_opens_at: timestampSchema.nullable(),
  registration_closes_at: timestampSchema.nullable(),
  cancellation_deadline_at: timestampSchema.nullable(),
  payment_instructions: z.string().nullable(),
  weekly: z.boolean(),
  venue: z.object({
    ...venueCoordinatesShape,
    court_coverage: venueCourtCoverageSchema.optional(),
    attributes: venueAttributesSchema.default([]),
    name: z.string().nullable(),
    address: z.string().nullable(),
    google_place_id: z.string().nullable(),
    arrival_instructions: z.string().nullable()
  }),
  host: z.object({ name: z.string(), avatar_url: z.string().nullable() }),
  players: z.array(publicPlayerSchema).max(12),
  viewer_registration: z.enum(["confirmed", "waitlisted"]).nullable(),
  viewer_is_host: z.boolean()
});
export type PublicSession = z.infer<typeof publicSessionSchema>;
export type PublicPlayer = z.infer<typeof publicPlayerSchema>;

export function publicSessionState(s: PublicSession, now = Date.now()) {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "completed" || Date.parse(s.ends_at) <= now)
    return "completed";
  if (Date.parse(s.starts_at) <= now) return "started";
  if (s.registration_closes_at && Date.parse(s.registration_closes_at) <= now)
    return "closed";
  if (s.registration_opens_at && Date.parse(s.registration_opens_at) > now)
    return "not_open";
  return s.confirmed_count >= s.capacity ? "full" : "available";
}
export function categoryLabel(n: number) {
  return ["", "1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va"][n];
}
export function categoriesLabel(categories: number[] | null) {
  if (!categories) return "All levels";
  const sorted = [...categories].sort((a, b) => a - b);
  const consecutive = sorted.every((n, i) => !i || n === sorted[i - 1] + 1);
  return sorted.length > 1 && consecutive
    ? `${categoryLabel(sorted[0])}–${categoryLabel(sorted[sorted.length - 1])}`
    : sorted.map(categoryLabel).join(", ");
}

export function canCancelRegistration(s: PublicSession, now = Date.now()) {
  return (
    s.viewer_registration === "confirmed" &&
    !s.viewer_is_host &&
    s.status === "published" &&
    Date.parse(s.starts_at) > now &&
    (s.cancellation_deadline_at === null ||
      Date.parse(s.cancellation_deadline_at) > now)
  );
}

export function canJoinWaitlist(s: PublicSession, now = Date.now()) {
  return (
    publicSessionState(s, now) === "full" &&
    s.waitlist_enabled &&
    (s.waitlist_capacity === null || s.waitlisted_count < s.waitlist_capacity)
  );
}
export function canLeaveWaitlist(s: PublicSession, now = Date.now()) {
  return (
    s.viewer_registration === "waitlisted" &&
    !s.viewer_is_host &&
    s.status === "published" &&
    Date.parse(s.starts_at) > now
  );
}
