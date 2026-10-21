import {
  entityIdSchema,
  recordTimestamps,
  timestampSchema
} from "@/types/domain-schema";
import { z } from "zod";

export const organizerDetailsSchema = z.strictObject({
  display_name: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(1000).nullable()
});

export const organizerSchema = organizerDetailsSchema.extend({
  profile_id: entityIdSchema,
  status: z.enum(["active", "suspended"]),
  approved_at: timestampSchema.nullable(),
  ...recordTimestamps
});

export type Organizer = z.infer<typeof organizerSchema>;
export type OrganizerDetailsInput = z.infer<typeof organizerDetailsSchema>;
