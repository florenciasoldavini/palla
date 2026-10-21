import { z } from "zod";
import { joinSessionInputSchema } from "../domain";
import { joinSessionRecord } from "../repositories/join.repository";
const resultSchema = z.object({
  registration_id: z.uuid(),
  status: z.enum(["confirmed", "waitlisted"]),
  waitlisted_count: z.number().int().nonnegative().optional(),
  confirmed_count: z.number().int().nonnegative()
});
export async function joinSession(sessionId: string) {
  const input = joinSessionInputSchema.parse({ session_id: sessionId });
  return resultSchema.parse(await joinSessionRecord(input.session_id));
}
export function joinErrorMessage(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  const reasons: Record<string, string> = {
    JOIN_SIGN_IN_REQUIRED: "Sign in to join this session.",
    JOIN_PROFILE_REQUIRED: "Complete your profile before joining a session.",
    JOIN_UNAVAILABLE: "This session is no longer available to join.",
    JOIN_HOST: "You’re already hosting this session.",
    JOIN_REMOVED:
      "The host cancelled your place. Contact them before joining again.",
    JOIN_CLOSED: "Registration for this session has closed.",
    JOIN_NOT_OPEN: "Registration for this session hasn’t opened yet.",
    JOIN_CATEGORY:
      "Your playing category doesn’t match this session’s required categories. Check your profile and the session’s player level.",
    JOIN_WAITLIST_FULL:
      "The waitlist is now full. Refresh the session to check availability.",
    JOIN_FULL: "The last place was just taken. This session is now full."
  };
  return (
    Object.entries(reasons).find(([code]) => message.includes(code))?.[1] ??
    "We couldn’t confirm your place. Check your connection and try again; retrying won’t reserve twice."
  );
}
