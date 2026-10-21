import { z } from "zod";

export const categoryStatusSchema = z.enum([
  "known",
  "beginner",
  "unknown",
  "not_playing"
]);
export type CategoryStatus = z.infer<typeof categoryStatusSchema>;
export const playingCategorySchema = z.number().int().min(1).max(8);
export const categoryShape = {
  categoryStatus: categoryStatusSchema.nullable(),
  playingCategory: playingCategorySchema.nullable()
};
export function categoryIsConsistent(value: {
  categoryStatus: CategoryStatus | null;
  playingCategory: number | null;
}) {
  return value.categoryStatus === "known"
    ? value.playingCategory !== null
    : value.playingCategory === null;
}
export const categoryLabels: Record<number, string> = {
  8: "8va",
  7: "7ma",
  6: "6ta",
  5: "5ta",
  4: "4ta",
  3: "3ra",
  2: "2da",
  1: "1ra"
};
