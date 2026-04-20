import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSession } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/apiClient";
import { uploadAvatar } from "@/lib/api/cloudinary-service";
import { getUser, type User } from "@/lib/api/user-service";

type ProfileItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

type ActionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  backgroundColor: string;
  disabled?: boolean;
  onPress?: () => void;
};

type Theme = (typeof AppTheme)["light"];

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

function splitName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { primary: "User", secondary: "" };
  }

  if (parts.length === 1) {
    return { primary: parts[0], secondary: "" };
  }

  return {
    primary: parts[0],
    secondary: parts.slice(1).join(" "),
  };
}

export default function ProfileTabScreen() {
  const { user: sessionUser, signOut, syncUser } = useSession();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [user, setUser] = useState<User | null>(sessionUser);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
        icon: "person-outline",
        label: "Role",
        value: formatValue(user?.role),
      },
      {
        icon: "mail-outline",
        label: "Email",
        value: formatValue(user?.email),
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

  const displayName = user?.name ?? sessionUser?.name;
  const { primary, secondary } = splitName(displayName);

  async function handlePickAvatar() {
    if (uploadingAvatar) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to choose a profile image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      setUploadingAvatar(true);
      const response = await uploadAvatar({
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });

      setUser(response.data.user);
      syncUser(response.data.user);
    } catch (error) {
      if (error instanceof ApiError) {
        const validationMessage = error.errors
          ? Object.values(error.errors).flat()[0]
          : undefined;

        Alert.alert("Upload failed", validationMessage ?? error.message);
        return;
      }

      Alert.alert("Upload failed", "Unable to update your profile image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

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

  const settingsItems: ActionItem[] = [
    {
      icon: "create-outline",
      label: "Edit Profile",
      tint: theme.colors.accentStrong,
      backgroundColor: theme.colors.surfaceMuted,
      onPress: () => router.push("/profile-edit"),
    },

    {
      icon: "log-out-outline",
      label: loggingOut ? "Signing out..." : "Sign Out",
      tint: theme.colors.accentStrong,
      backgroundColor: theme.colors.surfaceMuted,
      disabled: loggingOut,
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topBar}></View>

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator
                size="large"
                color={theme.colors.accentStrong}
              />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroRow}>
                <Pressable
                  style={styles.avatarWrap}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar}
                >
                  <View style={styles.avatar}>
                    {user?.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        style={styles.avatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.avatarInitials}>
                        {getInitials(displayName)}
                      </Text>
                    )}

                    {uploadingAvatar ? (
                      <View style={styles.avatarLoadingOverlay}>
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.accentContrast}
                        />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.cameraBadge}>
                    <Ionicons
                      name="camera-outline"
                      size={12}
                      color={theme.colors.accentContrast}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={styles.nameBlock}>
                <Text style={styles.primaryName}>{primary}</Text>
                {secondary ? (
                  <Text style={styles.secondaryName}>{secondary}</Text>
                ) : null}
                <Text style={styles.email}>
                  {formatValue(user?.email ?? sessionUser?.email)}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile</Text>

                {profileItems.map((item) => (
                  <View key={item.label} style={styles.itemRow}>
                    <View style={styles.itemIconWrap}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={theme.colors.accentStrong}
                      />
                    </View>
                    <View style={styles.itemTextBlock}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemValue}>{item.value}</Text>
                    </View>
                    <View style={styles.chevronWrap}>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.mutedText}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>

                {settingsItems.map((item) => {
                  return (
                    <Pressable
                      key={item.label}
                      style={[
                        styles.itemRow,
                        item.disabled && styles.buttonDisabled,
                      ]}
                      onPress={item.onPress}
                      disabled={item.disabled}
                    >
                      <View
                        style={[
                          styles.itemIconWrap,
                          { backgroundColor: item.backgroundColor },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={item.tint}
                        />
                      </View>
                      <Text style={styles.settingsLabel}>{item.label}</Text>
                      <View style={styles.chevronWrap}>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={theme.colors.mutedText}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 12,
      paddingBottom: 40,
    },
    container: {
      width: "100%",
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 28,
    },
    loadingBlock: {
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 96,
    },
    loadingText: {
      fontSize: 15,
      color: theme.colors.mutedText,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarWrap: {
      position: "relative",
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitials: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    avatarLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark
        ? "rgba(18, 24, 38, 0.62)"
        : "rgba(15, 23, 42, 0.35)",
    },
    cameraBadge: {
      position: "absolute",
      right: -2,
      bottom: 2,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.accentStrong,
      borderWidth: 2,
      borderColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    nameBlock: {
      marginTop: 18,
      alignItems: "center",
    },
    primaryName: {
      fontSize: 33,
      lineHeight: 36,
      fontWeight: "800",
      color: theme.colors.heading,
      textAlign: "center",
    },
    secondaryName: {
      fontSize: 33,
      lineHeight: 36,
      fontWeight: "300",
      color: theme.colors.mutedText,
      textAlign: "center",
    },
    email: {
      marginTop: 10,
      fontSize: 14,
      color: theme.colors.mutedText,
      textAlign: "center",
    },
    section: {
      marginTop: 34,
      gap: 14,
    },
    sectionTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.heading,
    },
    itemRow: {
      minHeight: 64,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      ...theme.shadow.soft,
    },
    itemIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    itemTextBlock: {
      flex: 1,
      gap: 3,
    },
    itemLabel: {
      fontSize: 13,
      color: theme.colors.mutedText,
      fontWeight: "600",
    },
    itemValue: {
      fontSize: 14,
      color: theme.colors.heading,
      fontWeight: "600",
    },
    settingsLabel: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.heading,
      fontWeight: "600",
    },
    chevronWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.65,
    },
  });
}
