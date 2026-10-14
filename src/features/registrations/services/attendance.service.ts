import { z } from "zod";
import {
  attendeeSchema,
  attendanceInputSchema,
  registrationSchema,
  type AttendanceInput
} from "../domain";
import {
  fetchRoster,
  writeAttendance
} from "../repositories/attendance.repository";
export async function loadOrganizerRoster(sessionId: string) {
  return z
    .array(attendeeSchema)
    .parse(await fetchRoster(z.uuid().parse(sessionId)));
}
export async function setAttendance(input: AttendanceInput) {
  return registrationSchema.parse(
    await writeAttendance(attendanceInputSchema.parse(input))
  );
}
