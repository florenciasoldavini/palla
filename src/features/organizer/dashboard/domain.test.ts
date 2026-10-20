import { describe, expect, it } from "vitest";
import {
  bookingChange,
  bookingChartGeometry,
  dashboardPeriodSchema
} from "./domain";

describe("dashboard calculations", () => {
  it("does not invent percentage growth from an empty comparison", () => {
    expect(bookingChange(84, 68)).toBe(24);
    expect(bookingChange(0, 10)).toBe(-100);
    expect(bookingChange(84, 0)).toBeNull();
    expect(bookingChange(0, 0)).toBeNull();
  });
  it("keeps empty and single-day charts finite", () => {
    for (const points of [[], [{ day: 1, current: 0, previous: 0 }]]) {
      const chart = bookingChartGeometry(points, 240, 1.5);
      expect(chart.ceiling).toBeGreaterThan(0);
      expect(chart.current).not.toMatch(/NaN|Infinity/);
      expect(chart.previous).not.toMatch(/NaN|Infinity/);
    }
  });
  it("uses one shared scale for the comparison, including a larger previous period", () => {
    const points = [
      { day: 1, current: 2, previous: 100 },
      { day: 2, current: 4, previous: 120 }
    ];
    const chart = bookingChartGeometry(points, 300);
    expect(chart.ceiling).toBe(120);
    expect(chart.y(120)).toBe(chart.top);
    expect(chart.x(1)).toBeLessThan(300);
  });
  it("rejects unsupported periods at the service boundary", () => {
    expect(dashboardPeriodSchema.safeParse("all_time").success).toBe(false);
  });
});
