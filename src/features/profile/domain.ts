import {
  categoryStatusSchema,
  playingCategorySchema
} from "./playing-category";
import {
  entityIdSchema,
  playingLevelSchema,
  recordTimestamps,
  timestampSchema
} from "@/types/domain-schema";
import { z } from "zod";

export const profileDetailsSchema = z.strictObject({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80).nullable(),
  avatar_url: z.url().nullable(),
  bio: z.string().trim().max(500).nullable().default(null),
  playing_level: playingLevelSchema.nullable(),
  playing_category: playingCategorySchema.nullable().default(null),
  category_status: categoryStatusSchema.default("unknown")
});

export const profileSchema = profileDetailsSchema
  .extend({
    id: entityIdSchema,
    first_name: profileDetailsSchema.shape.first_name.nullable(),
    phone_number: z.string().trim().max(40).nullable(),
    preferred_mode: z.enum(["player", "organizer"]),
    onboarding_completed_at: timestampSchema.nullable(),
    welcome_email_sent_at: timestampSchema.nullable(),
    ...recordTimestamps
  })
  .refine(
    (profile) =>
      profile.onboarding_completed_at === null || profile.first_name !== null,
    { path: ["first_name"], message: "Completed profiles require a first name" }
  );

export type Profile = z.infer<typeof profileSchema>;
export type ProfileDetailsInput = z.infer<typeof profileDetailsSchema>;
