const primitiveColors = {
  neutral: {
    0: "#ffffff",
    25: "#fbf9f8",
    50: "#f5f3f3",
    100: "#efeded",
    150: "#e9e8e7",
    200: "#e4e2e2",
    300: "#dbdad9"
  },
  ink: {
    950: "#121212",
    900: "#1b1c1c",
    800: "#232425",
    700: "#303031",
    600: "#434656",
    500: "#5f5e5e",
    400: "#737688",
    300: "#8d91a2",
    200: "#c3c5d9",
    100: "#e7e8ef",
    50: "#f2f0f0"
  },
  blue: {
    50: "#f3f6ff",
    100: "#e3e6ff",
    200: "#dce1ff",
    300: "#b6c4ff",
    400: "#8ba4ff",
    500: "#0055ff",
    600: "#004dea",
    700: "#0041c8",
    800: "#0039b3",
    900: "#001551",
    950: "#000a33"
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
    accent: primitiveColors.blue[500]
  },
  border: {
    subtle: primitiveColors.neutral[200],
    default: primitiveColors.ink[200],
    strong: primitiveColors.ink[400],
    accent: primitiveColors.blue[500]
  },
  action: {
    primary: {
      bg: primitiveColors.blue[500],
      bgHover: primitiveColors.blue[600],
      bgPressed: primitiveColors.blue[700],
      text: primitiveColors.neutral[0]
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
    active: primitiveColors.blue[500]
  }
};

const fontFamilies = {
  web: {
    sans: "Geist",
    mono: "JetBrains Mono"
  },
  native: {
    sans: "Geist",
    mono: "JetBrains Mono"
  }
};

const typeScale = {
  displayXl: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 72,
    lineHeight: 79,
    fontWeight: "900",
    letterSpacing: -2.88
  },
  headlineLg: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 48,
    lineHeight: 58,
    fontWeight: "900",
    letterSpacing: -0.96
  },
  headlineLgMobile: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.64
  },
  headlineMd: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.24
  },
  hero: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "900",
    letterSpacing: -1
  },
  title: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  section: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.4
  },
  card: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    letterSpacing: -0.2
  },
  bodyLg: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 18,
    lineHeight: 29,
    fontWeight: "400"
  },
  bodyMd: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "400"
  },
  bodySm: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400"
  },
  caption: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500"
  },
  meta: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500"
  },
  eyebrow: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 1.08,
    textTransform: "uppercase"
  },
  label: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.42,
    textTransform: "uppercase"
  },
  labelUi: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.28
  },
  labelMono: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 12,
    lineHeight: 12,
    fontWeight: "500",
    letterSpacing: 0.6
  },
  buttonSm: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  buttonMd: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  buttonLg: {
    fontFamily: fontFamilies.web.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  linkMono: {
    fontFamily: fontFamilies.web.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.96,
    textTransform: "uppercase"
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
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999
};

const layout = {
  maxWidthContent: 1440,
  maxWidthFormNative: 760,
  maxWidthFormWeb: 540,
  breakpointTablet: 768,
  breakpointDesktop: 1280,
  marginDesktop: 64,
  marginTablet: 40,
  marginMobile: 20,
  gutterDefault: 24
};

const border = {
  widthDefault: 1,
  widthStrong: 1,
  widthFocus: 1
};

const shadows = {
  card: "0px 8px 24px rgba(27, 28, 28, 0.06)",
  floating: "0px 20px 40px rgba(27, 28, 28, 0.08)"
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
    sm: 44,
    md: 52,
    lg: 58,
    iconLg: 68
  },
  radius: {
    control: radius.lg,
    card: radius.xl
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
    0: "#f7f9ff",
    50: "#edf1ff",
    100: primitiveColors.blue[100],
    200: primitiveColors.blue[200],
    300: primitiveColors.blue[300],
    400: primitiveColors.blue[400],
    500: primitiveColors.blue[500],
    600: primitiveColors.blue[600],
    700: primitiveColors.blue[700],
    800: primitiveColors.blue[800],
    900: primitiveColors.blue[900],
    950: primitiveColors.blue[950]
  },
  secondary: {
    0: primitiveColors.neutral[0],
    50: primitiveColors.neutral[25],
    100: primitiveColors.neutral[50],
    200: primitiveColors.neutral[100],
    300: primitiveColors.neutral[150],
    400: primitiveColors.neutral[200],
    500: primitiveColors.neutral[300],
    600: "#cbc9c8",
    700: "#b7b5b4",
    800: "#a3a1a0",
    900: "#8f8d8c",
    950: "#7b7978"
  },
  tertiary: {
    0: "#f3f4f6",
    50: "#eaebee",
    100: "#d7dae1",
    200: "#c3c5d9",
    300: "#a8abb8",
    400: "#8d91a2",
    500: primitiveColors.ink[400],
    600: primitiveColors.ink[600],
    700: primitiveColors.ink[500],
    800: primitiveColors.ink[700],
    900: primitiveColors.ink[900],
    950: primitiveColors.ink[950]
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
  "--color-indicator-primary": hexToRgbChannels(primitiveColors.blue[500]),
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
