export const theme = {
  colors: {
    // Base
    background: "#121414",
    surface: "#0A192F",
    surfaceVariant: "#1E2020",

    // Brand
    primary: "#B9C7E4",
    onPrimary: "#233148",
    secondary: "#64748B",
    onSecondary: "#FFFFFF",

    // Text
    text: "#E2E2E2",
    textMuted: "#C5C6CD",

    // Feedback & UI
    outline: "rgba(100, 116, 139, 0.2)", // #64748B at 20% opacity
    error: "#FFB4AB",
    success: "#B9C7E4",
  },
  typography: {
    display: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -0.96,
    },
    headlineLg: {
      fontFamily: "SpaceGrotesk_600SemiBold",
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.32,
    },
    headlineMd: {
      fontFamily: "SpaceGrotesk_600SemiBold",
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.24,
    },
    bodyLg: {
      fontFamily: "Inter_400Regular",
      fontSize: 18,
      lineHeight: 28,
      letterSpacing: 0,
    },
    bodyMd: {
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    },
    labelMd: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.28,
    },
    labelSm: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.6,
    },
  },
  radius: {
    sm: 2,
    default: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },
  spacing: {
    base: 8,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    gutter: 16,
  },
} as const;

export type Theme = typeof theme;
