import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, useEffect, useMemo } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { AppTheme } from "@/constants/theme";
import { AuthProvider, getPostAuthRoute, useSession } from "@/lib/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  initialRouteName: "index",
};

void SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: PropsWithChildren) {
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, user } = useSession();

  useEffect(() => {
    if (isLoading || !navigationState?.key) {
      return;
    }

    const firstSegment = segments[0];
    const onIndex = segments.length === 0 || firstSegment === "index";
    const inProfileReg = firstSegment === "profile-reg";
    const isProtectedRoute = !onIndex;

    if (!user && isProtectedRoute) {
      router.replace("/");
      return;
    }

    if (user && onIndex) {
      router.replace(getPostAuthRoute(user));
      return;
    }

    if (user && inProfileReg && user.course_id && user.semester_id) {
      router.replace("/(tabs)/home");
    }
  }, [isLoading, navigationState?.key, router, segments, user]);

  if (isLoading || !navigationState?.key) {
    return null;
  }

  return children;
}

function AppNavigator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const appTheme = isDark ? AppTheme.dark : AppTheme.light;
  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: appTheme.colors.background,
        card: appTheme.colors.background,
        text: appTheme.colors.text,
        border: appTheme.colors.border,
        primary: appTheme.colors.accentStrong,
      },
    }),
    [appTheme.colors.accentStrong, appTheme.colors.background, appTheme.colors.border, appTheme.colors.text, isDark],
  );

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(appTheme.colors.background);
  }, [appTheme.colors.background]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: appTheme.colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="profile-reg" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scanner" />
        <Stack.Screen
          name="modal"
          options={{ headerShown: true, presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font);
  const colorScheme = useColorScheme();
  const appTheme = colorScheme === "dark" ? AppTheme.dark : AppTheme.light;

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: appTheme.colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <AppNavigator />
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
