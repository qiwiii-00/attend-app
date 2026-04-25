import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiError } from "@/lib/api/apiClient";
import { getPostAuthRoute, useSession } from "@/lib/auth-context";

type AuthMode = "login" | "register";

type FieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
};

const loginFields: FieldProps[] = [
  {
    icon: "mail-outline",
    placeholder: "E-mail ID",
    keyboardType: "email-address",
  },
  {
    icon: "lock-closed-outline",
    placeholder: "Password",
    secureTextEntry: true,
  },
];

const registerFields: FieldProps[] = [
  {
    icon: "mail-outline",
    placeholder: "Email-ID",
    keyboardType: "email-address",
  },
  {
    icon: "lock-closed-outline",
    placeholder: "Password",
    secureTextEntry: true,
  },
  {
    icon: "lock-closed-outline",
    placeholder: "Confirm Password",
    secureTextEntry: true,
  },
];

function showSuccessMessage(message: string) {
  Alert.alert("Success", message);
}

type Theme = (typeof AppTheme)["light"];

export default function EntryScreen() {
  const { signIn, signUp } = useSession();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [mode, setMode] = useState<AuthMode>("login");
  const [rememberMe, setRememberMe] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  const isLogin = mode === "login";
  const title = isLogin
    ? "Welcome back to\nyour attendance hub"
    : "Create your\nsmart campus account";
  const subtitle =
    "Sign in or create an account to manage attendance with ease.";
  const fields = isLogin ? loginFields : registerFields;

  useEffect(() => {
    const keyboardShow = Keyboard.addListener("keyboardDidShow", () => {
      Animated.timing(sheetTranslateY, {
        toValue: -70,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });

    const keyboardHide = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, [sheetTranslateY]);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Email and password are required.");
      return;
    }

    if (!isLogin && !confirmPassword.trim()) {
      Alert.alert("Missing fields", "Confirm password is required.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert(
        "Password mismatch",
        "Password and confirm password must match.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      if (isLogin) {
        const user = await signIn({
          login: email.trim(),
          password,
          remember: rememberMe,
        });

        showSuccessMessage("Login successful");
        router.replace(getPostAuthRoute(user));
        return;
      }

      const user = await signUp({
        name: email.trim().split("@")[0] || "User",
        email: email.trim(),
        password,
        remember: rememberMe,
      });

      showSuccessMessage("Register successful");
      setPassword("");
      setConfirmPassword("");
      router.replace(getPostAuthRoute(user));
    } catch (error) {
      if (error instanceof ApiError) {
        const validationMessage = error.errors
          ? Object.values(error.errors).flat()[0]
          : undefined;

        Alert.alert(
          isLogin ? "Login failed" : "Registration failed",
          validationMessage ?? error.message,
        );
        return;
      }

      Alert.alert(
        isLogin ? "Login failed" : "Registration failed",
        "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function getValueForField(placeholder: string) {
    if (placeholder === "E-mail ID" || placeholder === "Email-ID") {
      return email;
    }

    if (placeholder === "Password") {
      return password;
    }

    if (placeholder === "Confirm Password") {
      return confirmPassword;
    }

    return "";
  }

  function handleChangeForField(placeholder: string, value: string) {
    if (placeholder === "E-mail ID" || placeholder === "Email-ID") {
      setEmail(value);
      return;
    }

    if (placeholder === "Password") {
      setPassword(value);
      return;
    }

    if (placeholder === "Confirm Password") {
      setConfirmPassword(value);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.heroMeshTop} />
          <View style={styles.heroMeshBottom} />
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTextBlock}>
            <View style={styles.eyebrowChip}>
              <Text style={styles.eyebrowText}>
                {isLogin
                  ? "Attendance, simplified"
                  : "Fast setup, smooth access"}
              </Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.segmentedControl}>
            <Pressable
              onPress={() => setMode("login")}
              style={[styles.segment, isLogin && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  isLogin && styles.segmentLabelActive,
                ]}
              >
                Login
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              style={[styles.segment, !isLogin && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  !isLogin && styles.segmentLabelActive,
                ]}
              >
                Register
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {fields.map((field) => (
              <View key={field.placeholder} style={styles.inputShell}>
                <Ionicons
                  name={field.icon}
                  size={18}
                  color={theme.colors.accentStrong}
                />
                <TextInput
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.colors.subtleText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={
                    field.secureTextEntry
                      ? !visiblePasswords[field.placeholder]
                      : false
                  }
                  keyboardType={field.keyboardType}
                  value={getValueForField(field.placeholder)}
                  onChangeText={(value) =>
                    handleChangeForField(field.placeholder, value)
                  }
                  style={styles.input}
                />
                {field.secureTextEntry ? (
                  <Pressable
                    onPress={() =>
                      setVisiblePasswords((current) => ({
                        ...current,
                        [field.placeholder]: !current[field.placeholder],
                      }))
                    }
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        visiblePasswords[field.placeholder]
                          ? "eye-outline"
                          : "eye-off-outline"
                      }
                      size={20}
                      color={theme.colors.mutedText}
                    />
                  </Pressable>
                ) : null}
              </View>
            ))}

            {isLogin ? (
              <View style={styles.loginMetaRow}>
                <View style={styles.rememberRow}>
                  <Switch
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.accentSoft,
                    }}
                    thumbColor={
                      rememberMe
                        ? theme.colors.accentStrong
                        : theme.colors.surfaceElevated
                    }
                    ios_backgroundColor={theme.colors.border}
                    style={styles.switch}
                  />
                  <Text style={styles.rememberText}>Remember me</Text>
                </View>
                <Pressable>
                  <Text style={styles.linkText}>Forget Password?</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? "Please wait..."
                  : isLogin
                    ? "Login"
                    : "Register"}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  const isDark = theme.colors.background === AppTheme.dark.colors.background;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    hero: {
      height: 340,
      backgroundColor: "#16213A",
      paddingHorizontal: 24,
      paddingTop: 8,
      overflow: "hidden",
    },
    heroMeshTop: {
      position: "absolute",
      width: 340,
      height: 340,
      borderRadius: 170,
      backgroundColor: "rgba(42, 53, 80, 0.2)",
      top: -170,
      left: -90,
    },
    heroMeshBottom: {
      position: "absolute",
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: "rgba(32, 43, 68, 0.24)",
      bottom: -130,
      left: 40,
    },
    heroGlowLarge: {
      position: "absolute",
      width: 250,
      height: 250,
      borderRadius: 125,
      backgroundColor: "#2A3550",
      top: -28,
      right: -86,
      opacity: 0.95,
    },
    heroGlowSmall: {
      position: "absolute",
      width: 186,
      height: 186,
      borderRadius: 93,
      backgroundColor: "#202B44",
      top: 22,
      right: 18,
      opacity: 0.85,
    },
    heroTextBlock: {
      marginTop: 48,
      width: "80%",
    },
    eyebrowChip: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    eyebrowText: {
      ...theme.typography.eyebrow,
      color: "#F8FAFC",
      letterSpacing: 0.8,
    },
    title: {
      marginTop: 18,
      fontSize: 38,
      lineHeight: 44,
      fontWeight: "800",
      color: "#F8FAFC",
      letterSpacing: -1.1,
    },
    subtitle: {
      marginTop: 12,
      fontSize: 14,
      lineHeight: 21,
      color: "#9FAAC1",
    },
    sheet: {
      flex: 1,
      marginTop: -58,
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
      paddingHorizontal: 22,
      marginBottom: -60,
      paddingBottom: 10,
      paddingTop: 18,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.colors.borderSoft : "transparent",
      ...theme.shadow.card,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 22,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
    },
    segment: {
      flex: 1,
      height: 46,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: {
      backgroundColor: theme.colors.surfaceElevated,
      shadowColor: isDark ? "#000000" : "#90A3C8",
      shadowOpacity: isDark ? 0.22 : 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    segmentLabel: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.mutedText,
    },
    segmentLabelActive: {
      color: theme.colors.heading,
      fontWeight: "700",
    },
    formContent: {
      paddingTop: 22,
      paddingBottom: 36,
      gap: 14,
    },
    inputShell: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 18,
      paddingHorizontal: 16,
      height: 58,
      backgroundColor: theme.colors.card,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
    },
    loginMetaRow: {
      marginTop: 2,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rememberRow: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: -6,
    },
    switch: {
      transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
    },
    rememberText: {
      marginLeft: -2,
      color: theme.colors.mutedText,
      fontSize: 13,
    },
    linkText: {
      color: theme.colors.accentStrong,
      fontSize: 13,
      fontWeight: "700",
    },
    primaryButton: {
      marginTop: 8,
      height: 58,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accentStrong,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: isDark ? "#000000" : theme.colors.accentStrong,
      shadowOpacity: isDark ? 0.28 : 0.24,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    primaryButtonDisabled: {
      opacity: 0.72,
    },
    primaryButtonText: {
      color: theme.colors.accentContrast,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
  });
}
