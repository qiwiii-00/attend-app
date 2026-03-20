import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function EntryScreen() {
  const { signIn, signUp } = useSession();
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
    ? "Go ahead and set up\nyour account"
    : "Create your\naccount";
  const subtitle = "Sign in-up to enjoy the best managing experience";
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
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTextBlock}>
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
                <Ionicons name={field.icon} size={18} color="#1642a8ff" />
                <TextInput
                  placeholder={field.placeholder}
                  placeholderTextColor="#8D98AE"
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
                      color="#8D98AE"
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
                    trackColor={{ false: "#D8DEEA", true: "#BFD1FF" }}
                    thumbColor={rememberMe ? "#2F66E7" : "#FFFFFF"}
                    ios_backgroundColor="#D8DEEA"
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#16213A",
  },
  screen: {
    flex: 1,
    backgroundColor: "#16213A",
  },
  hero: {
    height: 332,
    backgroundColor: "#16213A",
    paddingHorizontal: 24,
    paddingTop: 8,
    overflow: "hidden",
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
    top: 12,
    right: 26,
    opacity: 0.85,
  },
  heroTextBlock: {
    marginTop: 52,
    width: "78%",
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: "#9FAAC1",
  },
  sheet: {
    flex: 1,
    marginTop: -50,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 22,
    marginBottom: -60,
    paddingTop: 18,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#E8EDF5",
    borderRadius: 22,
    padding: 4,
  },
  segment: {
    flex: 1,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#90A3C8",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#75819A",
  },
  segmentLabelActive: {
    color: "#1F2937",
    fontWeight: "600",
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
    borderColor: "#E4EAF4",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    color: "#1E293B",
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
    color: "#7A869B",
    fontSize: 13,
  },
  linkText: {
    color: "#1642a8ff",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 4,
    height: 56,
    borderRadius: 30,
    backgroundColor: "#1642a8ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2F66E7",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    marginTop: 18,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5EAF3",
  },
  dividerText: {
    fontSize: 12,
    color: "#94A0B4",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EAF3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#334155",
  },
});
