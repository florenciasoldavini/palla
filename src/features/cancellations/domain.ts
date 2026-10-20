import { z } from "zod";
export const cancellationReasonCodes = [
  "weather",
  "venue_issue",
  "host_emergency",
  "insufficient_players",
  "other"
] as const;
export const cancellationReasons = {
  weather: "Weather / rain / unsafe court",
  venue_issue: "Court maintenance or venue issue",
  host_emergency: "Host emergency / illness",
  insufficient_players: "Not enough players",
  other: "Other reason"
} satisfies Record<(typeof cancellationReasonCodes)[number], string>;
export const cancellationInputSchema = z.object({
  reason_code: z.enum(cancellationReasonCodes, {
    error: "Choose a cancellation reason."
  }),
  message: z.string().trim().max(1000, "Use up to 1,000 characters.")
});
export type CancellationInput = z.infer<typeof cancellationInputSchema>;
export const cancellationContextSchema = z.object({
  session_id: z.uuid(),
  session_title: z.string(),
  organizer_id: z.uuid(),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }),
  timezone: z.string(),
  venue_name: z.string(),
  host_name: z.string(),
  host_avatar_url: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  can_cancel: z.boolean(),
  confirmed_count: z.number().int().nonnegative(),
  waitlisted_count: z.number().int().nonnegative(),
  recipients: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      image_url: z.string().nullable()
    })
  ),
  cancellation_id: z.uuid().nullable(),
  cancelled_at: z.iso.datetime({ offset: true }).nullable(),
  reason_code: z.enum(cancellationReasonCodes).nullable(),
  message: z.string().nullable(),
  recipient_status: z.enum(["confirmed", "waitlisted"]).nullable()
});
export type CancellationContext = z.infer<typeof cancellationContextSchema>;
export const cancelOccurrenceSchema = cancellationInputSchema.extend({
  session_id: z.uuid(),
  expected_version: z.iso.datetime({ offset: true }),
  request_id: z.uuid(),
  expected_count: z.number().int().nonnegative()
});
export type CancelOccurrence = z.infer<typeof cancelOccurrenceSchema>;
export const recipientCount = (context: CancellationContext) =>
  context.confirmed_count + context.waitlisted_count;
export function cancellationErrorMessage(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("recipient count changed"))
    return "The player count changed. Check the updated count and try again.";
  if (message.includes("Session changed"))
    return "This session changed. Check the updated details and try again.";
  if (message.includes("no longer be changed"))
    return "This session has started or was already cancelled. Reload the session.";
  return "Check your connection and try again. Your message has been kept.";
}
