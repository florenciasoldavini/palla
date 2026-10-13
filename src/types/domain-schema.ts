import { z } from "zod";

export const entityIdSchema = z.uuid();
export const timestampSchema = z.iso.datetime({ offset: true });
export const recordTimestamps = {
  created_at: timestampSchema,
  updated_at: timestampSchema
};

export const timezoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return value.length > 0;
    } catch {
      return false;
    }
  }, "Use a supported IANA timezone");

// Provisional self-reported scale; confirm with local players before launch.
export const playingLevelSchema = z.number().min(1).max(7).multipleOf(0.5);
export const levelRangeShape = {
  level_min: playingLevelSchema.nullable(),
  level_max: playingLevelSchema.nullable()
};

export function hasValidLevelRange(value: {
  level_min: number | null;
  level_max: number | null;
}) {
  return (
    (value.level_min === null && value.level_max === null) ||
    (value.level_min !== null &&
      value.level_max !== null &&
      value.level_min <= value.level_max)
  );
}

export const moneyShape = {
  price_minor: z.number().int().min(0).max(2_147_483_647),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code"),
  payment_instructions: z.string().trim().max(1000).nullable()
};
