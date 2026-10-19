import { z } from "zod";
import {
  announcementContextSchema,
  publishAnnouncementSchema,
  type PublishAnnouncement
} from "../domain";
import * as repo from "../repositories/announcements.repository";
export async function loadSessionAnnouncements(id: string) {
  return announcementContextSchema.parse(
    await repo.fetchSessionAnnouncements(z.uuid().parse(id))
  );
}
export async function loadAnnouncement(id: string) {
  return announcementContextSchema.parse(
    await repo.fetchAnnouncement(z.uuid().parse(id))
  );
}
export async function publishAnnouncement(input: PublishAnnouncement) {
  return announcementContextSchema.parse(
    await repo.publishAnnouncement(publishAnnouncementSchema.parse(input))
  );
}
export async function removeAnnouncement(id: string) {
  await repo.removeAnnouncement(z.uuid().parse(id));
}
