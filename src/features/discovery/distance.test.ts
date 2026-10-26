import { describe, expect, it } from "vitest";
import { discoveryDistanceLabel } from "./distance";

describe("discovery distance labels", () => {
  it.each([
    [0, "<100 m away"],
    [99, "<100 m away"],
    [100, "100 m away"],
    [849, "800 m away"],
    [950, "1 km away"],
    [2400, "2.4 km away"],
    [25000, "25 km away"]
  ])("formats %s meters without implying exact precision", (meters, label) => {
    expect(discoveryDistanceLabel(meters)).toBe(label);
  });
  it.each([null, undefined, NaN, Infinity, -1])(
    "hides missing or invalid distance %s",
    (meters) => {
      expect(discoveryDistanceLabel(meters)).toBeNull();
    }
  );
});
