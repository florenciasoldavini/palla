import { z } from "zod";
import { registrationSchema } from "../domain";
import {
  waitlistSchema,
  waitlistActionSchema,
  waitlistModeSchema,
  type WaitlistAction,
  type WaitlistMode
} from "../waitlist-domain";
import {
  fetchWaitlist,
  writeWaitlistAction,
  writeWaitlistMode
} from "../repositories/waitlist.repository";
export async function loadWaitlist(sessionId: string) {
  return waitlistSchema.parse(await fetchWaitlist(z.uuid().parse(sessionId)));
}
export async function manageWaitlist(input: WaitlistAction) {
  return registrationSchema.parse(
    await writeWaitlistAction(waitlistActionSchema.parse(input))
  );
}
export async function setWaitlistMode(input: WaitlistMode) {
  return waitlistSchema.parse(
    await writeWaitlistMode(waitlistModeSchema.parse(input))
  );
}
export const waitlistBlockMessages = {
  session_unavailable:
    "Waitlist changes are available for published sessions only.",
  disabled:
    "Waitlist is disabled. Enable it in session settings to promote players.",
  not_open:
    "Registration hasn’t opened yet. Promotion will be available when it opens.",
  deadline:
    "The registration deadline has passed. Players can no longer be promoted.",
  full: "The session is full. Promotion will be available when a place opens."
} as const;
