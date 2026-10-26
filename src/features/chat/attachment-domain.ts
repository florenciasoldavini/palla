import { z } from "zod";
import { entityIdSchema, timestampSchema } from "@/types/domain-schema";
export const attachmentSchema = z.strictObject({
  id: entityIdSchema,
  message_id: entityIdSchema,
  type: z.enum(["image", "document", "audio"]),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(4 * 1024 * 1024),
  file_name: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration_ms: z.number().int().positive().nullable(),
  created_at: timestampSchema
});
export type ChatAttachment = z.infer<typeof attachmentSchema>;
export const localPhotoSchema = z.object({
  id: entityIdSchema,
  uri: z.string().startsWith("file://"),
  width: z.number().int().positive().max(2048),
  height: z.number().int().positive().max(2048),
  size: z
    .number()
    .int()
    .positive()
    .max(4 * 1024 * 1024)
});
export type LocalPhoto = z.infer<typeof localPhotoSchema>;
