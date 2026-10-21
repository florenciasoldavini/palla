import { z } from "zod";
import { entityIdSchema, timestampSchema } from "@/types/domain-schema";
import { attendeeSchema } from "./domain";
export const waitlistEntrySchema = attendeeSchema
  .safeExtend({
    category_eligible: z.boolean()
  })
  .refine(
    (row) => row.status === "waitlisted",
    "Waitlist entries must be waiting"
  );
export const waitlistSchema = z.strictObject({
  session_id: entityIdSchema,
  session_version: timestampSchema,
  enabled: z.boolean(),
  promotion_mode: z.enum(["manual", "automatic"]),
  capacity: z.number().int().positive(),
  waitlist_capacity: z.number().int().positive().nullable(),
  confirmed_count: z.number().int().nonnegative(),
  blocked_reason: z
    .enum(["session_unavailable", "disabled", "not_open", "deadline", "full"])
    .nullable(),
  entries: z.array(waitlistEntrySchema)
});
export const waitlistActionSchema = z.strictObject({
  registration_id: entityIdSchema,
  action: z.enum(["promote", "remove"]),
  expected_version: timestampSchema
});
export const waitlistModeSchema = z.strictObject({
  session_id: entityIdSchema,
  mode: z.enum(["manual", "automatic"]),
  expected_version: timestampSchema
});
export type Waitlist = z.infer<typeof waitlistSchema>;
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;
export type WaitlistAction = z.infer<typeof waitlistActionSchema>;
export type WaitlistMode = z.infer<typeof waitlistModeSchema>;
