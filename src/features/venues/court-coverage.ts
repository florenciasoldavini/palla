import { z } from "zod";
export const courtCoverageSchema = z.enum(["covered", "uncovered"]);
export type CourtCoverage = z.infer<typeof courtCoverageSchema>;
export const venueCourtCoverageSchema = z
  .array(courtCoverageSchema)
  .max(2)
  .refine((v) => new Set(v).size === v.length, "Choose each court type once.");
export const coverageOptions = [
  { value: "covered", label: "Covered" },
  { value: "uncovered", label: "Uncovered" }
] as const;
export function coverageLabel(value: CourtCoverage | null | undefined) {
  return value === "covered"
    ? "Covered"
    : value === "uncovered"
      ? "Uncovered"
      : "Not specified";
}
export function effectiveCourtCoverage(
  venue: CourtCoverage[],
  selected?: CourtCoverage | null
) {
  return selected ?? (venue.length === 1 ? venue[0] : null);
}
