import { z } from "zod";
import {
  sessionAttributesSchema,
  venueAttributesSchema
} from "@/features/attributes/domain";

const price = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d{1,8}([.,]\d{1,2})?$/.test(v),
    "Enter 0 or a positive amount with up to 2 decimals."
  )
  .transform((v) =>
    v === "" ? null : Math.round(Number(v.replace(",", ".")) * 100)
  )
  .refine((v) => v === null || v <= 2147483647, "Amount is too large.");
export const advancedFiltersSchema = z
  .object({
    minPrice: price,
    maxPrice: price,
    coverage: z.enum(["any", "covered", "uncovered"]),
    gender: z.enum(["any", "all", "women_only", "men_only"]),
    sessionAttributes: sessionAttributesSchema,
    venueAttributes: venueAttributesSchema
  })
  .refine(
    (v) =>
      v.minPrice === null || v.maxPrice === null || v.minPrice <= v.maxPrice,
    {
      message: "Maximum price must be at least the minimum.",
      path: ["maxPrice"]
    }
  );
export type AdvancedFilters = z.input<typeof advancedFiltersSchema>;
export const defaultAdvancedFilters: AdvancedFilters = {
  minPrice: "",
  maxPrice: "",
  coverage: "any",
  gender: "any",
  sessionAttributes: [],
  venueAttributes: []
};
export function advancedFilterCount(f: AdvancedFilters) {
  return (
    Number(Boolean(f.minPrice || f.maxPrice)) +
    Number(f.coverage !== "any") +
    Number(f.gender !== "any") +
    f.sessionAttributes.length +
    f.venueAttributes.length
  );
}
export function advancedRpcFilters(f: AdvancedFilters) {
  const parsed = advancedFiltersSchema.parse(f);
  return {
    p_min_price: parsed.minPrice,
    p_max_price: parsed.maxPrice,
    p_currency: "ARS",
    p_coverage: parsed.coverage,
    p_gender: parsed.gender,
    p_session_attributes: parsed.sessionAttributes,
    p_venue_attributes: parsed.venueAttributes
  };
}
