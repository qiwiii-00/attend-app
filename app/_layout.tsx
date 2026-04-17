import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { AuthProvider, getPostAuthRoute, useSession } from "@/lib/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  initialRouteName: "index",
};

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
    const onIndex = firstSegment === "index";
    const inTabs = firstSegment === "(tabs)";
    const inProfileReg = firstSegment === "profile-reg";

    if (!user && (inTabs || inProfileReg)) {
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

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile-reg" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal"
          options={{ headerShown: true, presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) {
    return null;
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
