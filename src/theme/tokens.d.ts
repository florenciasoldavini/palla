export const designTokens: {
  colors: {
    primitive: Record<string, Record<string, string>>;
    semantic: Record<string, any>;
    gluestack: Record<string, Record<string, string>>;
  };
  fonts: {
    web: { sans: string; secondary: string };
    native: { sans: string; secondary: string };
  };
  typeScale: Record<string, any>;
  spacing: Record<string, number>;
  semanticSpacing: Record<string, Record<string, number>>;
  radius: Record<string, number>;
  layout: Record<string, number>;
  border: Record<string, number>;
  shadows: Record<string, string>;
  motion: {
    duration: Record<string, number>;
    curves: { measured: [number, number, number, number] };
    scale: Record<string, number>;
  };
  controls: {
    toasts: {
      bg: string;
      actionBg: string;
      text: string;
      secondary: string;
      dismiss: string;
      compactIconBg: string;
      compactIcon: string;
      tones: Record<
        "success" | "error" | "warning" | "info" | "muted",
        { bg: string; icon: string }
      >;
    };
    fields: { onWhite: string; onTinted: string };
    buttons: Record<
      "neutral" | "essential" | "accent" | "danger" | "success" | "warning",
      { bg: string; hover: string; pressed: string; text: string }
    >;
    heights: Record<string, number>;
    surfaces: Record<
      "panel" | "inset" | "row",
      { radius: number; padding: number }
    >;
    radius: Record<string, number>;
  };
};

export const gluestackThemeVars: {
  light: Record<string, string>;
};

export const tailwindColorScaleRefs: Record<string, any>;
