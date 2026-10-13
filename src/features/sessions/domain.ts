import {
  entityIdSchema,
  hasValidLevelRange,
  levelRangeShape,
  moneyShape,
  recordTimestamps,
  timestampSchema,
  timezoneSchema
} from "@/types/domain-schema";
import { z } from "zod";

export const sessionContentShape = {
  venue_id: entityIdSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable(),
  court_label: z.string().trim().max(80).nullable(),
  capacity: z.number().int().min(1).max(32_767),
  ...levelRangeShape,
  ...moneyShape
};

const sessionInputShape = {
  ...sessionContentShape,
  starts_at: timestampSchema,
  ends_at: timestampSchema,
  registration_closes_at: timestampSchema,
  cancellation_deadline_at: timestampSchema
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
    if (Date.parse(value[key]) > start) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: "Deadline must not follow session start"
      });
    }
  }
  if (!hasValidLevelRange(value)) {
    context.addIssue({
      code: "custom",
      path: ["level_max"],
      message: "Provide both level bounds in ascending order, or neither"
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
    cancelled_at: timestampSchema.nullable(),
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
  cancellation_notice_minutes: z.number().int().min(0).max(2_147_483_647)
};

function hasValidSeries(value: {
  starts_on: string;
  ends_on: string | null;
  level_min: number | null;
  level_max: number | null;
}) {
  return (
    (value.ends_on === null || value.ends_on >= value.starts_on) &&
    hasValidLevelRange(value)
  );
}

export const sessionSeriesInputSchema = z
  .strictObject(seriesInputShape)
  .refine(hasValidSeries, {
    message: "Check the series dates and playing level range"
  });

export const sessionSeriesSchema = z
  .strictObject({
    ...seriesInputShape,
    id: entityIdSchema,
    organizer_id: entityIdSchema,
    status: z.enum(["active", "paused", "ended"]),
    ...recordTimestamps
  })
  .refine(hasValidSeries, {
    message: "Check the series dates and playing level range"
  });

export type PadelSession = z.infer<typeof sessionSchema>;
export type SessionInput = z.infer<typeof sessionInputSchema>;
export type SessionSeries = z.infer<typeof sessionSeriesSchema>;
export type SessionSeriesInput = z.infer<typeof sessionSeriesInputSchema>;
