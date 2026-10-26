import { describe, expect, it } from "vitest";
import {
  advancedFiltersSchema,
  advancedRpcFilters,
  defaultAdvancedFilters,
  advancedFilterCount
} from "./advanced-filters";
import { defaultFilters, hasFilters } from "./domain";
describe("Discovery advanced filters", () => {
  it("keeps blank bounds unbounded and preserves zero for free sessions", () => {
    expect(advancedRpcFilters(defaultAdvancedFilters).p_min_price).toBeNull();
    expect(
      advancedRpcFilters({ ...defaultAdvancedFilters, maxPrice: "0" })
        .p_max_price
    ).toBe(0);
    expect(
      advancedRpcFilters({
        ...defaultAdvancedFilters,
        minPrice: "12000,50",
        maxPrice: "15000.99"
      })
    ).toMatchObject({
      p_min_price: 1200050,
      p_max_price: 1500099,
      p_currency: "ARS"
    });
  });
  it.each(["-1", "1.234", "1e5", "NaN", "1,000.00", "21474836.48"])(
    "rejects unsafe price %s",
    (value) => {
      expect(
        advancedFiltersSchema.safeParse({
          ...defaultAdvancedFilters,
          minPrice: value
        }).success
      ).toBe(false);
    }
  );
  it("rejects reversed bounds and accepts inclusive equal bounds", () => {
    expect(
      advancedFiltersSchema.safeParse({
        ...defaultAdvancedFilters,
        minPrice: "10",
        maxPrice: "9"
      }).success
    ).toBe(false);
    expect(
      advancedFiltersSchema.safeParse({
        ...defaultAdvancedFilters,
        minPrice: "10",
        maxPrice: "10"
      }).success
    ).toBe(true);
  });
  it("detects advanced filters for flat results and resetting", () => {
    expect(hasFilters(defaultFilters)).toBe(false);
    expect(hasFilters({ ...defaultFilters, maxPrice: "0" })).toBe(true);
    expect(
      advancedFilterCount({
        ...defaultAdvancedFilters,
        coverage: "covered",
        gender: "women_only",
        minPrice: "10",
        maxPrice: "20",
        sessionAttributes: ["new_balls"],
        venueAttributes: ["showers"]
      })
    ).toBe(5);
    expect(advancedFilterCount(defaultAdvancedFilters)).toBe(0);
  });
});
