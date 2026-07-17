export const designTokens: {
  colors: {
    primitive: Record<string, Record<string, string>>;
    semantic: Record<string, any>;
    gluestack: Record<string, Record<string, string>>;
  };
  fonts: {
    web: { sans: string; mono: string };
    native: { sans: string; mono: string };
  };
  typeScale: Record<string, any>;
  spacing: Record<string, number>;
  semanticSpacing: Record<string, Record<string, number>>;
  radius: Record<string, number>;
  layout: Record<string, number>;
  border: Record<string, number>;
  shadows: Record<string, string>;
  motion: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
  controls: {
    heights: Record<string, number>;
    radius: Record<string, number>;
  };
};

export const gluestackThemeVars: {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const tailwindColorScaleRefs: Record<string, any>;
