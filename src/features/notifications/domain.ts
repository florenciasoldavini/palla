import { entityIdSchema, timestampSchema } from "@/types/domain-schema";
import { z } from "zod";

export const notificationPayloadSchema = z.discriminatedUnion("event_type", [
  z.strictObject({
    event_type: z.literal("welcome"),
    recipient_name: z.string().trim().min(1).max(80)
  }),
  z.strictObject({
    event_type: z.enum([
      "registration_confirmed",
      "registration_cancelled",
      "waitlist_promoted",
      "session_cancelled",
      "session_reminder"
    ]),
    session_id: entityIdSchema,
    session_title: z.string().trim().min(1).max(120),
    starts_at: timestampSchema,
    reason: z.string().trim().max(1000).nullable()
  })
]);

// Backend record contract only; never expose worker diagnostics to clients.
export const notificationOutboxSchema = z
  .strictObject({
    id: entityIdSchema,
    recipient_id: entityIdSchema,
    registration_id: entityIdSchema.nullable(),
    payload: notificationPayloadSchema,
    deduplication_key: z.string().min(1).max(300),
    status: z.enum(["pending", "processing", "sent", "failed"]),
    attempt_count: z.number().int().nonnegative(),
    available_at: timestampSchema,
    locked_until: timestampSchema.nullable(),
    sent_at: timestampSchema.nullable(),
    provider_message_id: z.string().nullable(),
    last_error: z.string().nullable(),
    created_at: timestampSchema
  })
  .refine((value) => (value.status === "sent") === (value.sent_at !== null), {
    path: ["sent_at"],
    message: "Delivery timestamp must match sent status"
  })
  .refine(
    (value) =>
      (value.status === "processing") === (value.locked_until !== null),
    {
      path: ["locked_until"],
      message: "Only processing records hold a worker lease"
    }
  );

export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;
export type NotificationOutboxRecord = z.infer<typeof notificationOutboxSchema>;
