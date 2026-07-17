import {
  SPLASH_COMPLETION_HOLD_MS,
  SPLASH_FADE_DURATION_MS,
  SPLASH_SEQUENCE_DURATION_MS,
  SPLASH_TAGLINE_REVEAL_DELAY_MS,
  SPLASH_TAGLINE_REVEAL_DURATION_MS,
  canFinishSplash,
  getSplashFadeDuration
} from "@/components/splash/splash-state";
import { describe, expect, it } from "vitest";

describe("animated splash state", () => {
  it("waits for both the animation and app initialization", () => {
    expect(canFinishSplash({ appReady: false, sequenceComplete: true })).toBe(
      false
    );
    expect(canFinishSplash({ appReady: true, sequenceComplete: false })).toBe(
      false
    );
    expect(canFinishSplash({ appReady: true, sequenceComplete: true })).toBe(
      true
    );
  });

  it("removes the fade when reduced motion is enabled", () => {
    expect(getSplashFadeDuration(true)).toBe(0);
    expect(getSplashFadeDuration(false)).toBe(SPLASH_FADE_DURATION_MS);
  });

  it("keeps the completed tagline visible before fading out", () => {
    expect(SPLASH_SEQUENCE_DURATION_MS).toBe(
      SPLASH_TAGLINE_REVEAL_DELAY_MS +
        SPLASH_TAGLINE_REVEAL_DURATION_MS +
        SPLASH_COMPLETION_HOLD_MS
    );
    expect(SPLASH_COMPLETION_HOLD_MS).toBeGreaterThan(0);
  });
});
