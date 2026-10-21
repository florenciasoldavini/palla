import { z } from "zod";
import { cancelRegistrationInputSchema } from "../domain";
import { cancelRegistrationRecord } from "../repositories/cancel-registration.repository";
const resultSchema = z.object({
  status: z.literal("cancelled"),
  confirmed_count: z.number().int().nonnegative()
});
export async function cancelRegistration(sessionId: string) {
  const input = cancelRegistrationInputSchema.parse({
    session_id: sessionId,
    cancellation_reason: null
  });
  return resultSchema.parse(await cancelRegistrationRecord(input.session_id));
}
export function cancelRegistrationError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("CANCEL_DEADLINE"))
    return "The cancellation deadline has passed. Your registration is still confirmed.";
  if (message.includes("CANCEL_UNAVAILABLE"))
    return "Registration can only be cancelled before the session starts.";
  if (message.includes("CANCEL_NOT_REGISTERED"))
    return "There is no confirmed registration to cancel. Refresh the session and try again.";
  if (message.includes("CANCEL_SIGN_IN_REQUIRED"))
    return "Sign in again to cancel your registration.";
  return "We couldn’t confirm the cancellation. Check your connection and try again.";
}
