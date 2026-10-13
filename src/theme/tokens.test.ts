import { describe, expect, it } from "vitest";
import { designTokens, gluestackThemeVars } from "./tokens";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe("light design system contrast", () => {
  it("keeps text readable across the light surfaces", () => {
    const { bg, text } = designTokens.colors.semantic;
    for (const foreground of [
      text.primary,
      text.secondary,
      text.muted,
      text.accent
    ]) {
      for (const background of [bg.canvas, bg.surface, bg.surfaceLow]) {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("preserves readable button labels in every enabled state", () => {
    for (const button of Object.values(designTokens.controls.buttons)) {
      for (const background of [button.bg, button.hover, button.pressed]) {
        expect(contrast(button.text, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("makes the focus indicator distinguishable and exposes only a light theme", () => {
    const { bg, border } = designTokens.colors.semantic;
    expect(contrast(border.accent, bg.surface)).toBeGreaterThanOrEqual(3);
    expect(Object.keys(gluestackThemeVars)).toEqual(["light"]);
  });
});
