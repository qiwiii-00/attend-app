import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/apiClient";
import { getUser, type User } from "@/lib/api/user-service";

type ProfileItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : "Not set";
}

function getInitials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileTabScreen() {
  const { user: sessionUser, signOut } = useSession();
  const [user, setUser] = useState<User | null>(sessionUser);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      if (!sessionUser?.id) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getUser(sessionUser.id);
        setUser(response.data);
      } catch (error) {
        setUser(sessionUser);

        if (!(error instanceof ApiError)) {
          Alert.alert("Load failed", "Unable to refresh profile details.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [sessionUser]);

  const profileItems = useMemo<ProfileItem[]>(
    () => [
      {
        icon: "mail-outline",
        label: "Email",
        value: formatValue(user?.email),
      },
      {
        icon: "people-outline",
        label: "Role",
        value: formatValue(user?.role),
      },
      {
        icon: "card-outline",
        label: "Student ID",
        value: formatValue(user?.student_id),
      },
      {
        icon: "library-outline",
        label: "Course",
        value: formatValue(user?.course?.title),
      },
      {
        icon: "albums-outline",
        label: "Semester",
        value: formatValue(user?.semester?.title),
      },
    ],
    [user],
  );

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      await signOut();
      router.replace("/");
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your account details</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <>
              <View style={styles.profileBlock}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitials}>
                      {getInitials(user?.name ?? sessionUser?.name)}
                    </Text>
                  </View>
                  <View style={styles.cameraBadge}>
                    <Ionicons name="person-outline" size={12} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.name}>
                  {formatValue(user?.name ?? sessionUser?.name)}
                </Text>
                <Text style={styles.email}>
                  {formatValue(user?.email ?? sessionUser?.email)}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>

                {profileItems.map((item) => (
                  <View key={item.label} style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View style={styles.iconWrap}>
                        <Ionicons name={item.icon} size={16} color="#0F172A" />
                      </View>
                      <View style={styles.itemTextBlock}>
                        <Text style={styles.itemLabel}>{item.label}</Text>
                        <Text style={styles.itemValue}>{item.value}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  styles.logoutButton,
                  loggingOut && styles.buttonDisabled,
                ]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E8F4F1",
  },
  screen: {
    flex: 1,
    backgroundColor: "#E8F4F1",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: "#6B8E87",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  header: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111111",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  loadingBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 56,
  },
  loadingText: {
    fontSize: 15,
    color: "#475569",
  },
  profileBlock: {
    alignItems: "center",
    marginTop: 24,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "800",
    color: "#065F46",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 14,
    fontSize: 27,
    fontWeight: "700",
    color: "#171717",
    textAlign: "center",
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    marginTop: 28,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#171717",
  },
  itemRow: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: "#F6F6F7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTextBlock: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemValue: {
    fontSize: 15,
    color: "#18181B",
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 28,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#DC2626",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
