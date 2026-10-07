import gluestackPlugin from "@gluestack-ui/nativewind-utils/tailwind-plugin";
const { designTokens, tailwindColorScaleRefs } = require("./theme/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["app/**/*.{tsx,jsx,ts,js}", "components/**/*.{tsx,jsx,ts,js}"],
  presets: [require("nativewind/preset")],
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background|indicator)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark|primary)/
    }
  ],
  theme: {
    extend: {
      colors: {
        primary: tailwindColorScaleRefs.primary,
        secondary: tailwindColorScaleRefs.secondary,
        tertiary: tailwindColorScaleRefs.tertiary,
        error: tailwindColorScaleRefs.error,
        success: tailwindColorScaleRefs.success,
        warning: tailwindColorScaleRefs.warning,
        info: tailwindColorScaleRefs.info,
        typography: tailwindColorScaleRefs.typography,
        outline: tailwindColorScaleRefs.outline,
        background: tailwindColorScaleRefs.background,
        indicator: tailwindColorScaleRefs.indicator
      },
      fontFamily: {
        heading: [designTokens.fonts.web.sans, "sans-serif"],
        body: [designTokens.fonts.web.sans, "sans-serif"],
        mono: [designTokens.fonts.web.mono, "monospace"],
        roboto: ["Roboto", "sans-serif"]
      },
      fontWeight: {
        extrablack: "950"
      },
      fontSize: {
        "2xs": "10px"
      },
      spacing: {
        1: `${designTokens.spacing[1]}px`,
        2: `${designTokens.spacing[2]}px`,
        3: `${designTokens.spacing[3]}px`,
        4: `${designTokens.spacing[4]}px`,
        5: `${designTokens.spacing[5]}px`,
        6: `${designTokens.spacing[6]}px`,
        8: `${designTokens.spacing[8]}px`,
        10: `${designTokens.spacing[10]}px`,
        12: `${designTokens.spacing[12]}px`,
        16: `${designTokens.spacing[16]}px`,
        20: `${designTokens.spacing[20]}px`,
        24: `${designTokens.spacing[24]}px`
      },
      borderRadius: {
        sm: `${designTokens.radius.sm}px`,
        md: `${designTokens.radius.md}px`,
        lg: `${designTokens.radius.lg}px`,
        xl: `${designTokens.radius.xl}px`
      },
      boxShadow: {
        card: designTokens.shadows.card,
        floating: designTokens.shadows.floating,
        "hard-1": "-2px 2px 8px 0px rgba(38, 38, 38, 0.20)",
        "hard-2": "0px 3px 10px 0px rgba(38, 38, 38, 0.20)",
        "hard-3": "2px 2px 8px 0px rgba(38, 38, 38, 0.20)",
        "hard-4": "0px -3px 10px 0px rgba(38, 38, 38, 0.20)",
        "hard-5": "0px 2px 10px 0px rgba(38, 38, 38, 0.10)"
      }
    }
  },
  plugins: [gluestackPlugin]
};
