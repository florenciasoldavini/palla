import { z } from "zod";

export const sessionAttributeCodes = [
  "balls_provided",
  "new_balls",
  "spare_rackets",
  "coaching",
  "snacks",
  "drinks"
] as const;
export const venueAttributeCodes = [
  "free_parking",
  "paid_parking",
  "showers",
  "changing_rooms",
  "lockers",
  "water_dispenser",
  "accessible",
  "racket_rental",
  "shop",
  "cafe"
] as const;
export const sessionAttributeSchema = z.enum(sessionAttributeCodes);
export const venueAttributeSchema = z.enum(venueAttributeCodes);
export const sessionAttributesSchema = z
  .array(sessionAttributeSchema)
  .max(6)
  .refine((v) => new Set(v).size === v.length, "Choose each attribute once.");
export const venueAttributesSchema = z
  .array(venueAttributeSchema)
  .max(10)
  .refine((v) => new Set(v).size === v.length, "Choose each amenity once.");
export type SessionAttribute = z.infer<typeof sessionAttributeSchema>;
export type VenueAttribute = z.infer<typeof venueAttributeSchema>;
export type AttributeCode = SessionAttribute | VenueAttribute;
export function normalizeSessionAttributes(
  codes: SessionAttribute[]
): SessionAttribute[] {
  return sessionAttributeCodes.filter(
    (code) =>
      codes.includes(code) &&
      !(code === "balls_provided" && codes.includes("new_balls"))
  );
}
export function toggleSessionAttribute(
  codes: SessionAttribute[],
  code: SessionAttribute
): SessionAttribute[] {
  if (codes.includes(code)) return codes.filter((c) => c !== code);
  const next =
    code === "balls_provided" ? codes.filter((c) => c !== "new_balls") : codes;
  return normalizeSessionAttributes([...next, code]);
}

export function orderedAttributes(codes: AttributeCode[]) {
  return [...sessionAttributeCodes, ...venueAttributeCodes].filter(
    (code) =>
      codes.includes(code) &&
      !(code === "balls_provided" && codes.includes("new_balls"))
  );
}
