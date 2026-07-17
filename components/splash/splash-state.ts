export const SPLASH_TAGLINE_REVEAL_DELAY_MS = 3200;
export const SPLASH_TAGLINE_REVEAL_DURATION_MS = 1000;
export const SPLASH_COMPLETION_HOLD_MS = 600;
export const SPLASH_SEQUENCE_DURATION_MS =
  SPLASH_TAGLINE_REVEAL_DELAY_MS +
  SPLASH_TAGLINE_REVEAL_DURATION_MS +
  SPLASH_COMPLETION_HOLD_MS;
export const SPLASH_FADE_DURATION_MS = 400;

export function canFinishSplash({
  appReady,
  sequenceComplete
}: {
  appReady: boolean;
  sequenceComplete: boolean;
}) {
  return appReady && sequenceComplete;
}

export function getSplashFadeDuration(reducedMotion: boolean) {
  return reducedMotion ? 0 : SPLASH_FADE_DURATION_MS;
}
