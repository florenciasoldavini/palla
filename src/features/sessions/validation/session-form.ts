import { z } from "zod";
import { sessionCreationSettingsSchema } from "./session-settings";

import {
  sessionAttributesSchema,
  venueAttributesSchema
} from "@/features/attributes/domain";

export const sessionDraftSchema = z.object({
  settings: z
    .strictObject({
      ...sessionCreationSettingsSchema.shape,
      strict_category_enforcement: z.boolean().optional(),
      participant_gender_policy:
        sessionCreationSettingsSchema.shape.participant_gender_policy.optional()
    })
    .refine(
      (s) =>
        s.registration_opens_minutes_before === null ||
        s.registration_opens_minutes_before >
          (s.registration_closes_minutes_before ?? 0),
      "Registration must open before it closes."
    )
    .optional(),
  legacySettingsBaseline: z
    .object({
      categoryMode: z.enum(["all", "range"]),
      categoryMin: z.string(),
      categoryMax: z.string(),
      registrationHours: z.string(),
      cancellationHours: z.string()
    })
    .optional(),
  sessionAttributes: sessionAttributesSchema.optional(),
  venueAttributes: venueAttributesSchema.optional(),
  venueAttributesBaseline: venueAttributesSchema.optional(),
  venueAttributesEdited: z.boolean().optional(),
  title: z.string().max(120),
  venueId: z.string(),
  venueName: z.string().max(160),
  venueAddress: z.string().max(300),
  courtLabel: z.string().max(80),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  repeat: z.enum(["once", "weekly"]),
  lastDate: z.string(),
  categoryMode: z.enum(["all", "range"]),
  categoryMin: z.string(),
  categoryMax: z.string(),
  capacity: z.string(),
  price: z.string(),
  registrationHours: z.string(),
  cancellationHours: z.string(),
  description: z.string().max(2000),
  courtConfirmed: z.boolean()
});
export type SessionFormValues = z.infer<typeof sessionDraftSchema>;
const date = z.iso.date({ error: "Choose a valid date." });
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.");
const hours = z
  .string()
  .regex(/^\d+$/, "Enter a whole number of hours.")
  .refine((v) => +v <= 720, "Use up to 720 hours.");
export const sessionFormSchema = sessionDraftSchema
  .extend({
    title: z.string().trim().min(1, "Give your session a name.").max(120),
    venueId: z.union([z.literal(""), z.uuid()]),
    venueName: z.string().trim().min(1, "Enter the club name.").max(160),
    venueAddress: z.string().trim().min(1, "Enter the club address.").max(300),
    date,
    startTime: time,
    endTime: time,
    lastDate: date,
    capacity: z
      .string()
      .regex(/^\d+$/, "Enter a whole number.")
      .refine((v) => +v >= 1 && +v <= 32767, "Choose at least one place."),
    price: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount, for example 12000.")
      .refine((v) => +v * 100 <= 2147483647, "This amount is too large."),
    registrationHours: z.string(),
    cancellationHours: z.string()
  })
  .superRefine((v, ctx) => {
    const issue = (path: keyof SessionFormValues, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (v.endTime <= v.startTime)
      issue("endTime", "End time must be later on the same day.");
    if (
      v.repeat === "weekly" &&
      (v.lastDate < v.date ||
        (Date.parse(v.lastDate) - Date.parse(v.date)) / 86400000 > 357)
    )
      issue(
        "lastDate",
        "Choose an end date within 52 weeks of the first session."
      );
    if (!v.settings) {
      for (const key of ["registrationHours", "cancellationHours"] as const) {
        const result = hours.safeParse(v[key]);
        if (!result.success) issue(key, result.error.issues[0].message);
      }
    }
    if (v.categoryMode === "range" && !v.settings) {
      if (!/^[1-8]$/.test(v.categoryMin))
        issue("categoryMin", "Choose a category.");
      if (!/^[1-8]$/.test(v.categoryMax) || +v.categoryMin > +v.categoryMax)
        issue("categoryMax", "Choose the same or a higher category number.");
    }
  });
export function sessionStart(v: SessionFormValues) {
  return new Date(`${v.date}T${v.startTime}:00-03:00`);
}
export function occurrenceCount(v: SessionFormValues) {
  return v.repeat === "once"
    ? 1
    : Math.floor((Date.parse(v.lastDate) - Date.parse(v.date)) / 604800000) + 1;
}
export function initialSessionForm(): SessionFormValues {
  const tomorrow = new Date(Date.now() + 86400000 - 10800000)
    .toISOString()
    .slice(0, 10);
  return {
    sessionAttributes: [],
    venueAttributes: [],
    venueAttributesBaseline: [],
    venueAttributesEdited: false,
    title: "",
    venueId: "",
    venueName: "",
    venueAddress: "",
    courtLabel: "",
    date: tomorrow,
    startTime: "19:00",
    endTime: "20:30",
    repeat: "once",
    lastDate: tomorrow,
    categoryMode: "all",
    categoryMin: "6",
    categoryMax: "7",
    capacity: "8",
    price: "0",
    registrationHours: "2",
    cancellationHours: "24",
    description: "",
    courtConfirmed: false
  };
}
