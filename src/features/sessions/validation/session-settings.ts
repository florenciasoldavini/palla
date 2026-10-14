import { z } from "zod";
export const allowedCategoriesSchema = z
  .array(z.number().int().min(1).max(8))
  .min(1)
  .max(8)
  .refine(
    (values) => new Set(values).size === values.length,
    "Select each category only once."
  )
  .nullable();
export const sessionSettingsShape = {
  strict_category_enforcement: z.boolean(),
  participant_gender_policy: z.enum(["all", "women_only", "men_only"]),
  visibility: z.enum(["public", "private"]),
  allowed_categories: allowedCategoriesSchema,
  waitlist_enabled: z.boolean(),
  waitlist_promotion_mode: z.enum(["automatic", "manual"]),
  waitlist_capacity: z.number().int().positive().max(32767).nullable()
};
const offset = z.number().int().min(0).max(527040).nullable();
export const sessionOffsetShape = {
  registration_opens_minutes_before: offset,
  registration_closes_minutes_before: offset,
  cancellation_notice_minutes: offset
};
export const sessionCreationSettingsSchema = z
  .strictObject({ ...sessionSettingsShape, ...sessionOffsetShape })
  .superRefine((s, ctx) => {
    if (
      s.registration_opens_minutes_before !== null &&
      s.registration_opens_minutes_before <=
        (s.registration_closes_minutes_before ?? 0)
    )
      ctx.addIssue({
        code: "custom",
        path: ["registration_opens_minutes_before"],
        message: "Registration must open before it closes."
      });
  });
export type SessionCreationSettings = z.infer<
  typeof sessionCreationSettingsSchema
>;
export const defaultSessionSettings = (): SessionCreationSettings => ({
  strict_category_enforcement: false,
  participant_gender_policy: "all",
  visibility: "public",
  allowed_categories: null,
  waitlist_enabled: false,
  waitlist_promotion_mode: "automatic",
  waitlist_capacity: null,
  registration_opens_minutes_before: null,
  registration_closes_minutes_before: null,
  cancellation_notice_minutes: null
});
