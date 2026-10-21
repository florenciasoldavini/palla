import { z } from "zod";
import { categoryLabels, type CategoryStatus } from "./playing-category";

export const dominantHandSchema = z.enum(["right", "left"]);
export const courtSideSchema = z.enum(["left", "right", "flexible"]);
export type DominantHand = z.infer<typeof dominantHandSchema>;
export type CourtSide = z.infer<typeof courtSideSchema>;
export const handLabels: Record<DominantHand, string> = {
  right: "Right-handed",
  left: "Left-handed"
};
export const sideLabels: Record<CourtSide, string> = {
  left: "Left Court",
  right: "Right Court",
  flexible: "Flexible"
};
export const sideDetails: Record<CourtSide, string> = {
  left: "Revés",
  right: "Drive",
  flexible: "Both sides"
};
export function playerCategoryLabel(
  status: CategoryStatus | null,
  category: number | null
) {
  return status === "known" && category
    ? categoryLabels[category]
    : status === "beginner"
      ? "Just starting"
      : status === "not_playing"
        ? "Not playing"
        : "Category not set";
}
