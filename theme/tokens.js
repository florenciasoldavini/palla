const primitiveColors = {
  neutral: {
    0: "#ffffff",
    25: "#fbf8ff",
    50: "#f4f2fd",
    100: "#eeedf7",
    150: "#e8e7f1",
    200: "#e3e1ec",
    300: "#dad9e3"
  },
  ink: {
    950: "#0d0e12",
    900: "#1a1b22",
    800: "#2f3038",
    700: "#3a3b43",
    600: "#444932",
    500: "#5e5e5e",
    400: "#757a60",
    300: "#9ca087",
    200: "#c5c9ac",
    100: "#e2e2e2",
    50: "#f1effa"
  },
  volt: {
    0: "#fbffe8",
    50: "#f7ffd5",
    100: "#efffa8",
    200: "#e7ff7a",
    300: "#ddff45",
    400: "#d4ff00",
    500: "#b0d500",
    600: "#8faa00",
    700: "#6f8400",
    800: "#536600",
    900: "#3e4c00",
    950: "#171e00"
  },
  error: {
    50: "#fff1ef",
    100: "#ffdad6",
    200: "#ffb4ab",
    300: "#ff8a80",
    400: "#ff5f52",
    500: "#ba1a1a",
    600: "#a31515",
    700: "#93000a",
    800: "#6f0007",
    900: "#4a0005",
    950: "#2a0003"
  },
  success: {
    50: "#eef9f1",
    100: "#dcefe1",
    200: "#b8dec2",
    300: "#94cda3",
    400: "#6fbb84",
    500: "#4a9b69",
    600: "#3e8459",
    700: "#2f7a4c",
    800: "#245e3a",
    900: "#1a4329",
    950: "#102b1b"
  },
  warning: {
    50: "#fdf5ec",
    100: "#f6e7d4",
    200: "#edd0a9",
    300: "#e4b87e",
    400: "#dca153",
    500: "#c88d3d",
    600: "#ad7630",
    700: "#8f6126",
    800: "#704b1d",
    900: "#533714",
    950: "#37240d"
  },
  info: {
    50: "#f3f6ff",
    100: "#e3e6ff",
    200: "#dce1ff",
    300: "#b6c4ff",
    400: "#8ba4ff",
    500: "#5e84ff",
    600: "#3e68f5",
    700: "#2d51d1",
    800: "#203a99",
    900: "#152769",
    950: "#0c153d"
  }
};

const semanticColors = {
  bg: {
    canvas: primitiveColors.neutral[25],
    surface: primitiveColors.neutral[0],
    surfaceLow: primitiveColors.neutral[50],
    surfaceRaised: primitiveColors.neutral[100],
    surfaceStrong: primitiveColors.neutral[150],
    inverse: primitiveColors.ink[700],
    muted: primitiveColors.neutral[50],
    error: primitiveColors.error[50],
    warning: primitiveColors.warning[50],
    success: primitiveColors.success[50],
    info: primitiveColors.info[50]
  },
  text: {
    primary: primitiveColors.ink[900],
    secondary: primitiveColors.ink[600],
    muted: primitiveColors.ink[400],
    inverse: primitiveColors.ink[50],
    accent: primitiveColors.volt[800]
  },
  border: {
    subtle: primitiveColors.neutral[200],
    default: primitiveColors.ink[200],
    strong: primitiveColors.ink[400],
    accent: primitiveColors.volt[400]
  },
  action: {
    primary: {
      bg: primitiveColors.ink[900],
      bgHover: primitiveColors.ink[800],
      bgPressed: primitiveColors.ink[950],
      text: primitiveColors.neutral[0]
    },
    essential: {
      bg: primitiveColors.volt[400],
      bgHover: primitiveColors.volt[300],
      bgPressed: primitiveColors.volt[500],
      text: primitiveColors.volt[950]
    },
    secondary: {
      bg: primitiveColors.neutral[0],
      bgHover: primitiveColors.neutral[50],
      text: primitiveColors.ink[900],
      border: primitiveColors.ink[200]
    }
  },
  status: {
    success: {
      bg: primitiveColors.success[100],
      text: primitiveColors.success[800],
      accent: primitiveColors.success[500]
    },
    warning: {
      bg: primitiveColors.warning[100],
      text: primitiveColors.warning[800],
      accent: primitiveColors.warning[500]
    },
    info: {
      bg: primitiveColors.info[100],
      text: primitiveColors.info[800],
      accent: primitiveColors.info[500]
    },
    error: {
      bg: primitiveColors.error[100],
      text: primitiveColors.error[700],
      accent: primitiveColors.error[500]
    }
  },
  icon: {
    default: primitiveColors.ink[400],
    active: primitiveColors.volt[800]
  }
};

const fontFamilies = {
  web: {
    sans: "Hanken Grotesk",
    mono: "Geist"
  },
  native: {
    sans: "Hanken Grotesk",
    mono: "Geist"
  }
};

const typeScale = {
  displayXl: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "700",
    letterSpacing: -1.92
  },
  headlineLg: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "700",
    letterSpacing: -1.92
  },
  headlineLgMobile: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "600",
    letterSpacing: -0.56
  },
  headlineMd: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    letterSpacing: -0.24
  },
  hero: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.8
  },
  title: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.56
  },
  section: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  card: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.08
  },
  bodyLg: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "400"
  },
  bodyMd: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400"
  },
  bodySm: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400"
  },
  caption: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0
  },
  meta: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500"
  },
  eyebrow: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  label: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0
  },
  labelUi: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0
  },
  labelMono: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0
  },
  buttonSm: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0
  },
  buttonMd: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0
  },
  buttonLg: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0
  },
  linkMono: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0
  },
  tabLabel: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500"
  },
  tabLabelMono: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  }
};

const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96
};

const semanticSpacing = {
  inline: {
    xs: spacing[2],
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[6]
  },
  stack: {
    sm: spacing[2],
    md: spacing[6],
    lg: spacing[12],
    xl: spacing[24]
  },
  section: {
    sm: spacing[8],
    md: spacing[12],
    lg: spacing[16],
    xl: spacing[24]
  }
};

const radius = {
  none: 0,
  sm: 4,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
};

const layout = {
  maxWidthContent: 1200,
  maxWidthFormNative: 760,
  maxWidthFormWeb: 540,
  breakpointTablet: 768,
  breakpointDesktop: 1280,
  marginDesktop: 64,
  marginTablet: 40,
  marginMobile: 16,
  gutterDefault: 16
};

const border = {
  widthDefault: 1,
  widthStrong: 1,
  widthFocus: 2
};

const shadows = {
  card: "0px 1px 2px rgba(26, 27, 34, 0.04)",
  floating: "0px 20px 40px rgba(26, 27, 34, 0.06)"
};

const motion = {
  duration: {
    fast: "120ms",
    base: "180ms",
    slow: "240ms"
  },
  easing: {
    standard: "ease-out",
    emphasis: "cubic-bezier(0.2, 0.8, 0.2, 1)"
  }
};

const controls = {
  heights: {
    sm: 40,
    md: 44,
    lg: 48,
    iconLg: 48
  },
  radius: {
    control: radius.md,
    card: radius.md
  }
};

function hexToRgbChannels(hex) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `${r} ${g} ${b}`;
}

function createVarScale(prefix, scale) {
  return Object.fromEntries(
    Object.entries(scale).map(([key, value]) => [
      `--color-${prefix}-${key}`,
      hexToRgbChannels(value)
    ])
  );
}

const gluestackScales = {
  primary: {
    0: primitiveColors.volt[0],
    50: primitiveColors.volt[50],
    100: primitiveColors.volt[100],
    200: primitiveColors.volt[200],
    300: primitiveColors.volt[300],
    400: primitiveColors.volt[400],
    500: primitiveColors.volt[800],
    600: primitiveColors.volt[700],
    700: primitiveColors.volt[900],
    800: primitiveColors.ink[900],
    900: primitiveColors.ink[950],
    950: primitiveColors.volt[950]
  },
  secondary: {
    0: primitiveColors.neutral[0],
    50: primitiveColors.neutral[25],
    100: primitiveColors.neutral[50],
    200: primitiveColors.neutral[100],
    300: primitiveColors.neutral[150],
    400: primitiveColors.neutral[200],
    500: primitiveColors.neutral[300],
    600: "#c6c6c6",
    700: "#a8a8a8",
    800: "#7f7f7f",
    900: primitiveColors.ink[500],
    950: primitiveColors.ink[900]
  },
  tertiary: {
    0: "#f5fbff",
    50: "#edf8fd",
    100: "#d8f2ff",
    200: "#cde7f3",
    300: "#b1cad7",
    400: "#8ba4af",
    500: "#6d858f",
    600: "#576f7a",
    700: "#4a626d",
    800: "#324a54",
    900: "#17323d",
    950: "#041e28"
  },
  error: primitiveColors.error,
  success: primitiveColors.success,
  warning: primitiveColors.warning,
  info: primitiveColors.info,
  typography: {
    0: primitiveColors.neutral[0],
    50: primitiveColors.ink[50],
    100: primitiveColors.ink[100],
    200: primitiveColors.ink[200],
    300: "#a7aabb",
    400: primitiveColors.ink[400],
    500: primitiveColors.ink[500],
    600: primitiveColors.ink[600],
    700: primitiveColors.ink[700],
    800: primitiveColors.ink[800],
    900: primitiveColors.ink[900],
    950: primitiveColors.ink[950]
  },
  outline: {
    0: primitiveColors.neutral[0],
    50: primitiveColors.neutral[50],
    100: primitiveColors.neutral[100],
    200: primitiveColors.neutral[200],
    300: primitiveColors.ink[200],
    400: primitiveColors.ink[400],
    500: primitiveColors.ink[500],
    600: primitiveColors.ink[600],
    700: primitiveColors.ink[700],
    800: primitiveColors.ink[800],
    900: primitiveColors.ink[900],
    950: primitiveColors.ink[950]
  },
  background: {
    0: primitiveColors.neutral[0],
    50: primitiveColors.neutral[25],
    100: primitiveColors.neutral[50],
    200: primitiveColors.neutral[100],
    300: primitiveColors.neutral[150],
    400: primitiveColors.neutral[200],
    500: primitiveColors.neutral[300],
    600: primitiveColors.ink[200],
    700: primitiveColors.ink[400],
    800: primitiveColors.ink[600],
    900: primitiveColors.ink[700],
    950: primitiveColors.ink[900]
  }
};

const gluestackThemeVarsLight = {
  ...createVarScale("primary", gluestackScales.primary),
  ...createVarScale("secondary", gluestackScales.secondary),
  ...createVarScale("tertiary", gluestackScales.tertiary),
  ...createVarScale("error", gluestackScales.error),
  ...createVarScale("success", gluestackScales.success),
  ...createVarScale("warning", gluestackScales.warning),
  ...createVarScale("info", gluestackScales.info),
  ...createVarScale("typography", gluestackScales.typography),
  ...createVarScale("outline", gluestackScales.outline),
  ...createVarScale("background", gluestackScales.background),
  "--color-background-error": hexToRgbChannels(semanticColors.bg.error),
  "--color-background-warning": hexToRgbChannels(semanticColors.bg.warning),
  "--color-background-success": hexToRgbChannels(semanticColors.bg.success),
  "--color-background-muted": hexToRgbChannels(semanticColors.bg.muted),
  "--color-background-info": hexToRgbChannels(semanticColors.bg.info),
  "--color-indicator-primary": hexToRgbChannels(primitiveColors.volt[400]),
  "--color-indicator-info": hexToRgbChannels(primitiveColors.info[500]),
  "--color-indicator-error": hexToRgbChannels(primitiveColors.error[500])
};

function createTailwindScaleRefs(prefix, scale) {
  return Object.fromEntries(
    Object.keys(scale).map((key) => [
      key,
      `rgb(var(--color-${prefix}-${key})/<alpha-value>)`
    ])
  );
}

const tailwindColorScaleRefs = {
  primary: createTailwindScaleRefs("primary", gluestackScales.primary),
  secondary: createTailwindScaleRefs("secondary", gluestackScales.secondary),
  tertiary: createTailwindScaleRefs("tertiary", gluestackScales.tertiary),
  error: createTailwindScaleRefs("error", gluestackScales.error),
  success: createTailwindScaleRefs("success", gluestackScales.success),
  warning: createTailwindScaleRefs("warning", gluestackScales.warning),
  info: createTailwindScaleRefs("info", gluestackScales.info),
  typography: {
    ...createTailwindScaleRefs("typography", gluestackScales.typography),
    white: primitiveColors.neutral[0],
    gray: primitiveColors.ink[200],
    black: primitiveColors.ink[900]
  },
  outline: createTailwindScaleRefs("outline", gluestackScales.outline),
  background: {
    ...createTailwindScaleRefs("background", gluestackScales.background),
    error: "rgb(var(--color-background-error)/<alpha-value>)",
    warning: "rgb(var(--color-background-warning)/<alpha-value>)",
    muted: "rgb(var(--color-background-muted)/<alpha-value>)",
    success: "rgb(var(--color-background-success)/<alpha-value>)",
    info: "rgb(var(--color-background-info)/<alpha-value>)",
    light: primitiveColors.neutral[25],
    dark: primitiveColors.ink[900]
  },
  indicator: {
    primary: "rgb(var(--color-indicator-primary)/<alpha-value>)",
    info: "rgb(var(--color-indicator-info)/<alpha-value>)",
    error: "rgb(var(--color-indicator-error)/<alpha-value>)"
  }
};

const designTokens = {
  colors: {
    primitive: primitiveColors,
    semantic: semanticColors,
    gluestack: gluestackScales
  },
  fonts: fontFamilies,
  typeScale,
  spacing,
  semanticSpacing,
  radius,
  layout,
  border,
  shadows,
  motion,
  controls
};

module.exports = {
  designTokens,
  gluestackThemeVars: {
    light: gluestackThemeVarsLight,
    dark: gluestackThemeVarsLight
  },
  tailwindColorScaleRefs
};
