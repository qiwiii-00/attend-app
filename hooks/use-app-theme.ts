import { AppTheme, type AppThemeMode } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useAppTheme() {
  const scheme = useColorScheme();
  const mode: AppThemeMode = scheme === "dark" ? "dark" : "light";

  return AppTheme[mode];
}
