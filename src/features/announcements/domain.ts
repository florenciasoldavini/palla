import { z } from "zod";
const timestamp = z.iso.datetime({ offset: true });
export const announcementBodySchema = z
  .string()
  .trim()
  .min(1, "Write your announcement.")
  .max(1000, "Use up to 1,000 characters.");
export const announcementInputSchema = z.object({
  body: announcementBodySchema
});
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export const announcementSchema = z.object({
  id: z.uuid(),
  body: z.string().nullable(),
  created_at: timestamp,
  removed_at: timestamp.nullable(),
  recipient_count: z.number().int().nonnegative().nullable()
});
export type Announcement = z.infer<typeof announcementSchema>;
export const announcementContextSchema = z.object({
  session_id: z.uuid(),
  session_title: z.string(),
  organizer_id: z.uuid(),
  starts_at: timestamp,
  ends_at: timestamp,
  timezone: z.string(),
  host_name: z.string(),
  host_avatar_url: z.url().nullable(),
  can_send: z.boolean(),
  recipient_count: z.number().int().nonnegative(),
  announcements: z.array(announcementSchema)
});
export type AnnouncementContext = z.infer<typeof announcementContextSchema>;
export const publishAnnouncementSchema = z.object({
  session_id: z.uuid(),
  body: announcementBodySchema,
  request_id: z.uuid(),
  expected_count: z.number().int().positive()
});
export type PublishAnnouncement = z.infer<typeof publishAnnouncementSchema>;
