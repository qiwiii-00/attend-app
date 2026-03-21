import { Platform } from "react-native";

const palette = {
  navy900: "#1A2333",
  navy700: "#304463",
  navy500: "#465C84",
  lilac300: "#A8B2D6",
  lilac400: "#7D8ABC",
  pink100: "#FFDFF5",
  pink200: "#FFC7ED",
  cream100: "#FFF8DB",
  cream200: "#F8EEBE",
  mist50: "#F8F7F4",
  mist100: "#F1EFEB",
  mist200: "#E3E0DB",
  slate300: "#AAA7B5",
  slate500: "#6F6B78",
  slate700: "#44414D",
  black: "#111111",
  white: "#FFFFFF",
} as const;

type AppColors = {
  [K in
    | "text"
    | "background"
    | "tint"
    | "icon"
    | "tabIconDefault"
    | "tabIconSelected"
    | "surface"
    | "surfaceElevated"
    | "surfaceMuted"
    | "surfaceSoft"
    | "card"
    | "cardAccent"
    | "border"
    | "borderSoft"
    | "heading"
    | "mutedText"
    | "subtleText"
    | "accent"
    | "accentStrong"
    | "accentSoft"
    | "accentContrast"
    | "infoSoft"
    | "info"
    | "gradientTop"
    | "gradientMiddle"
    | "gradientAccent"
    | "gradientBottom"]: string;
};

const lightColors: AppColors = {
  text: palette.navy900,
  background: palette.mist50,
  tint: palette.navy700,
  icon: palette.slate500,
  tabIconDefault: palette.slate500,
  tabIconSelected: palette.navy700,
  surface: palette.mist50,
  surfaceElevated: palette.white,
  surfaceMuted: palette.mist100,
  surfaceSoft: palette.cream100,
  card: palette.white,
  cardAccent: palette.pink100,
  border: palette.mist200,
  borderSoft: "#ECE8E1",
  heading: palette.black,
  mutedText: palette.slate500,
  subtleText: palette.slate300,
  accent: palette.lilac400,
  accentStrong: palette.navy700,
  accentSoft: palette.pink200,
  accentContrast: palette.white,
  infoSoft: palette.cream100,
  info: palette.navy500,
  gradientTop: palette.navy700,
  gradientMiddle: palette.lilac400,
  gradientAccent: palette.pink200,
  gradientBottom: palette.cream100,
};

const darkColors: AppColors = {
  text: "#EEF2FF",
  background: "#121826",
  tint: "#A8B2D6",
  icon: "#9DA3B7",
  tabIconDefault: "#8890A7",
  tabIconSelected: "#FFC7ED",
  surface: "#121826",
  surfaceElevated: "#1B2436",
  surfaceMuted: "#202B41",
  surfaceSoft: "#2B3551",
  card: "#1B2436",
  cardAccent: "#2A2945",
  border: "#2E3850",
  borderSoft: "#253047",
  heading: "#FFF8DB",
  mutedText: "#B2B7CA",
  subtleText: "#7A8198",
  accent: "#FFC7ED",
  accentStrong: "#FFF8DB",
  accentSoft: "#304463",
  accentContrast: "#121826",
  infoSoft: "#2A2945",
  info: "#A8B2D6",
  gradientTop: "#304463",
  gradientMiddle: "#596C9D",
  gradientAccent: "#C89DDB",
  gradientBottom: "#F1E0A6",
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const ThemeTokens = {
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
    round: 9999,
  },
  typography: {
    eyebrow: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700" as const,
      letterSpacing: 1.2,
      textTransform: "uppercase" as const,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "500" as const,
    },
    label: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "700" as const,
    },
    title: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800" as const,
    },
    display: {
      fontSize: 50,
      lineHeight: 52,
      fontWeight: "200" as const,
    },
  },
  shadow: {
    card: {
      shadowColor: "#1A1D27",
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    soft: {
      shadowColor: "#1A1D27",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
  },
} as const;

export const AppTheme = {
  light: {
    colors: lightColors,
    fonts: Fonts,
    ...ThemeTokens,
  },
  dark: {
    colors: darkColors,
    fonts: Fonts,
    ...ThemeTokens,
  },
} as const;

export type AppThemeMode = keyof typeof AppTheme;
export type AppColorName = keyof typeof lightColors;

export function getAppTheme(mode: AppThemeMode = "light") {
  return AppTheme[mode];
}
