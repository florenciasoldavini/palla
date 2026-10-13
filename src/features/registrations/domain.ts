import {
  entityIdSchema,
  recordTimestamps,
  timestampSchema
} from "@/types/domain-schema";
import { z } from "zod";

// Actor, queue ordering, and status are determined by the server.
export const joinSessionInputSchema = z.strictObject({
  session_id: entityIdSchema
});
export const cancelRegistrationInputSchema = z.strictObject({
  session_id: entityIdSchema,
  cancellation_reason: z.string().trim().max(1000).nullable()
});

export const registrationSchema = z
  .strictObject({
    id: entityIdSchema,
    session_id: entityIdSchema,
    player_id: entityIdSchema,
    status: z.enum(["confirmed", "waitlisted", "cancelled"]),
    joined_at: timestampSchema,
    // Postgres bigint is represented as a string to avoid JS precision loss.
    waitlist_sequence: z
      .string()
      .regex(/^[1-9]\d*$/)
      .nullable(),
    confirmed_at: timestampSchema.nullable(),
    cancelled_at: timestampSchema.nullable(),
    cancelled_by: entityIdSchema.nullable(),
    cancellation_reason: z.string().trim().max(1000).nullable(),
    ...recordTimestamps
  })
  .superRefine((value, context) => {
    if (value.status === "confirmed" && value.confirmed_at === null) {
      context.addIssue({
        code: "custom",
        path: ["confirmed_at"],
        message: "Confirmed registrations require a confirmation time"
      });
    }
    if (
      value.status === "waitlisted" &&
      (value.waitlist_sequence === null || value.confirmed_at !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["waitlist_sequence"],
        message:
          "Waitlisted registrations require queue order and no confirmation time"
      });
    }
    if (
      (value.status === "cancelled") !== (value.cancelled_at !== null) ||
      (value.status === "cancelled") !== (value.cancelled_by !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["cancelled_at"],
        message:
          "Cancellation requires an actor and timestamp matching the status"
      });
    }
  });

export type Registration = z.infer<typeof registrationSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionInputSchema>;
export type CancelRegistrationInput = z.infer<
  typeof cancelRegistrationInputSchema
>;
