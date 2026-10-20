import {
  entityIdSchema,
  moneyShape,
  recordTimestamps,
  timestampSchema,
  timezoneSchema
} from "@/types/domain-schema";
import { z } from "zod";
import { sessionDraftSchema } from "@/features/sessions/validation/session-form";

import {
  sessionSettingsShape,
  sessionOffsetShape
} from "./validation/session-settings";

export const sessionContentShape = {
  venue_id: entityIdSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable(),
  court_label: z.string().trim().max(80).nullable(),
  capacity: z.number().int().min(1).max(32_767),
  ...sessionSettingsShape,
  ...moneyShape
};

const sessionInputShape = {
  ...sessionContentShape,
  starts_at: timestampSchema,
  ends_at: timestampSchema,
  registration_opens_at: timestampSchema.nullable(),
  registration_closes_at: timestampSchema.nullable(),
  cancellation_deadline_at: timestampSchema.nullable()
};

function validateSessionTimes(
  value: z.infer<z.ZodObject<typeof sessionInputShape>>,
  context: z.RefinementCtx
) {
  const start = Date.parse(value.starts_at);
  if (Date.parse(value.ends_at) <= start) {
    context.addIssue({
      code: "custom",
      path: ["ends_at"],
      message: "End must follow start"
    });
  }
  for (const key of [
    "registration_closes_at",
    "cancellation_deadline_at"
  ] as const) {
    if (value[key] !== null && Date.parse(value[key]) > start) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: "Deadline must not follow session start"
      });
    }
  }
  if (
    value.registration_opens_at !== null &&
    Date.parse(value.registration_opens_at) >=
      Date.parse(value.registration_closes_at ?? value.starts_at)
  ) {
    context.addIssue({
      code: "custom",
      path: ["registration_opens_at"],
      message: "Registration must open before it closes"
    });
  }
}

export const sessionInputSchema = z
  .strictObject(sessionInputShape)
  .superRefine(validateSessionTimes);

export const sessionSchema = z
  .strictObject({
    ...sessionInputShape,
    id: entityIdSchema,
    organizer_id: entityIdSchema,
    series_id: entityIdSchema.nullable(),
    occurrence_date: z.iso.date().nullable(),
    status: z.enum(["draft", "published", "cancelled", "completed"]),
    completed_at: timestampSchema.nullable().default(null),
    cancelled_at: timestampSchema.nullable(),
    cancellation_reason_code: z
      .enum([
        "weather",
        "venue_issue",
        "host_emergency",
        "insufficient_players",
        "other"
      ])
      .nullable()
      .default(null),
    cancellation_reason: z.string().trim().max(1000).nullable(),
    ...recordTimestamps
  })
  .superRefine(validateSessionTimes)
  .refine(
    (value) => (value.series_id === null) === (value.occurrence_date === null),
    {
      path: ["occurrence_date"],
      message:
        "Series ID and original occurrence date must be provided together"
    }
  )
  .refine(
    (value) => (value.status === "cancelled") === (value.cancelled_at !== null),
    {
      path: ["cancelled_at"],
      message: "Cancellation timestamp must match session status"
    }
  );

const seriesInputShape = {
  ...sessionContentShape,
  timezone: timezoneSchema,
  weekday: z.number().int().min(1).max(7),
  local_start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm"),
  duration_minutes: z.number().int().min(1).max(32_767),
  starts_on: z.iso.date(),
  ends_on: z.iso.date().nullable(),
  ...sessionOffsetShape
};

export const sessionSeriesInputSchema = z
  .strictObject(seriesInputShape)
  .refine(
    (value) =>
      (value.ends_on === null || value.ends_on >= value.starts_on) &&
      (value.registration_opens_minutes_before === null ||
        value.registration_opens_minutes_before >
          (value.registration_closes_minutes_before ?? 0)),
    {
      message: "Check the series dates and registration timing"
    }
  );

// Drafts retain partial input; published series have a normalized template.
export const sessionSeriesSchema = z
  .object({
    id: entityIdSchema,
    organizer_id: entityIdSchema,
    draft_input: sessionDraftSchema,
    ...sessionSettingsShape,
    ...sessionOffsetShape,
    status: z.enum(["draft", "active", "paused", "ended"]),
    venue_id: entityIdSchema.nullable(),
    title: sessionContentShape.title.nullable(),
    description: sessionContentShape.description,
    court_label: sessionContentShape.court_label,
    capacity: sessionContentShape.capacity.nullable(),
    recurrence: z.enum(["once", "weekly"]).nullable(),
    timezone: timezoneSchema,
    weekday: z.number().int().min(1).max(7).nullable(),
    local_start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
      .nullable(),
    duration_minutes: z.number().int().min(1).max(1439).nullable(),
    starts_on: z.iso.date().nullable(),
    ends_on: z.iso.date().nullable(),
    ...recordTimestamps
  })
  .superRefine((s, ctx) => {
    if (
      s.status !== "draft" &&
      [
        s.venue_id,
        s.title,
        s.capacity,
        s.recurrence,
        s.weekday,
        s.local_start_time,
        s.duration_minutes,
        s.starts_on,
        s.ends_on
      ].some((v) => v === null)
    )
      ctx.addIssue({
        code: "custom",
        message: "Published series require a complete template"
      });
    if (
      s.starts_on &&
      s.ends_on &&
      (s.ends_on < s.starts_on ||
        Date.parse(s.ends_on) - Date.parse(s.starts_on) > 357 * 86400000)
    )
      ctx.addIssue({
        code: "custom",
        path: ["ends_on"],
        message: "Choose a series end within 52 weeks"
      });
    if (
      s.recurrence === "once" &&
      (s.status === "paused" || s.ends_on !== s.starts_on)
    )
      ctx.addIssue({
        code: "custom",
        message: "One-off series cannot be paused or span dates"
      });
    if (
      s.registration_opens_minutes_before !== null &&
      s.registration_opens_minutes_before <=
        (s.registration_closes_minutes_before ?? 0)
    )
      ctx.addIssue({
        code: "custom",
        message: "Registration must open before it closes"
      });
  });

export type PadelSession = z.infer<typeof sessionSchema>;
export type SessionInput = z.infer<typeof sessionInputSchema>;
export type SessionSeries = z.infer<typeof sessionSeriesSchema>;
export type SessionSeriesInput = z.infer<typeof sessionSeriesInputSchema>;
