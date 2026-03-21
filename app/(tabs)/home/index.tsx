import {
  CircleAlert,
  Clock,
  Pencil,
  QrCode,
  Star,
  X,
} from "lucide-react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSession } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/apiClient";
import { getUser, type User } from "@/lib/api/user-service";

type ScanOption = {
  title: string;
  shortLabel: string;
  icon: typeof QrCode;
  tint: string;
  surface: string;
  action: "scan" | "coming-soon";
};

const scanOptions: ScanOption[] = [
  {
    title: "Tap here to scan QR code",
    icon: QrCode,
    shortLabel: "Scan QR",
    tint: "#5CC9D6",
    surface: "#E8FBFD",
    action: "scan",
  },
  {
    title: "My Attendance",
    icon: Pencil,
    shortLabel: "My attendance",
    tint: "#7AA7F6",
    surface: "#EEF4FF",
    action: "coming-soon",
  },
  {
    title: "Upcoming Class",
    icon: Clock,
    shortLabel: "Schedule",
    tint: "#F2A8B7",
    surface: "#FFF1F4",
    action: "coming-soon",
  },
  {
    title: "Feedback",
    icon: Star,
    shortLabel: "Feedback",
    tint: "#D3B15A",
    surface: "#FFF8E6",
    action: "coming-soon",
  },
];

type Theme = (typeof AppTheme)["light"];

function normalizeUserResponse(value: User | { data?: User } | null | undefined) {
  if (!value) {
    return null;
  }

  if ("data" in value && value.data) {
    return value.data;
  }

  return value;
}

export default function HomeTabScreen() {
  const { user: sessionUser } = useSession();
  const theme = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<User | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const styles = useMemo(() => getStyles(theme), [theme]);

  useEffect(() => {
    async function loadUser() {
      if (!sessionUser?.id) {
        setUser(null);
        return;
      }

      try {
        const response = await getUser(sessionUser.id);
        setUser(normalizeUserResponse(response));
      } catch (error) {
        if (error instanceof ApiError) {
          setUser(sessionUser);
          return;
        }

        setUser(sessionUser);
      }
    }

    loadUser();
  }, [sessionUser]);

  function handleCardPress(option: ScanOption) {
    if (option.action !== "scan") {
      Alert.alert("Coming soon", `${option.title} is not implemented yet.`);
      return;
    }

    setScannedValue(null);
    setHasScanned(false);
    setScannerOpen(true);
  }

  function handleCloseScanner() {
    setScannerOpen(false);
    setHasScanned(false);
    setScannedValue(null);
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (hasScanned) {
      return;
    }

    setHasScanned(true);
    setScannedValue(result.data);
  }

  if (scannerOpen) {
    return (
      <SafeAreaView style={styles.scannerSafeArea} edges={["top"]}>
        <View style={styles.scannerScreen}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />
          ) : null}

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan QR Code</Text>
              <Pressable
                style={styles.scannerCloseButton}
                onPress={handleCloseScanner}
              >
                <X
                  size={18}
                  color={theme.colors.accentContrast}
                  strokeWidth={2.3}
                />
              </Pressable>
            </View>

            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <View style={styles.scannerBottom}>
              {!permission?.granted ? (
                <View style={styles.resultCard}>
                  <View style={styles.permissionRow}>
                    <CircleAlert
                      size={18}
                      color={theme.colors.accent}
                      strokeWidth={2.2}
                    />
                    <Text style={styles.resultTitle}>
                      Camera permission required
                    </Text>
                  </View>
                  <Text style={styles.resultValue}>
                    Allow camera access to scan the QR code.
                  </Text>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={requestPermission}
                  >
                    <Text style={styles.primaryButtonText}>Allow Camera</Text>
                  </Pressable>
                </View>
              ) : scannedValue ? (
                <View style={styles.resultCard}>
                  <Text style={styles.resultLabel}>Scanned QR value</Text>
                  <Text style={styles.resultValue}>{scannedValue}</Text>
                  <View style={styles.resultActions}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setHasScanned(false);
                        setScannedValue(null);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Scan Again</Text>
                    </Pressable>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={handleCloseScanner}
                    >
                      <Text style={styles.primaryButtonText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.tipCard}>
                  <Text style={styles.tipTitle}>
                    Align the code inside the frame
                  </Text>
                  <Text style={styles.tipCopy}>
                    The scan will trigger automatically.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>

          <Text style={styles.balance}>
           Hi, {user?.name ?? sessionUser?.name ?? "User"}
            
          </Text>
          <Text style={styles.balanceLabel}>{user?.course?.title ?? "No course assigned"}, {user?.semester?.title ?? "No semester assigned"}</Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={styles.actionsGrid}>
            {scanOptions.map((option) => {
              const Icon = option.icon;

              return (
                <Pressable
                  key={option.title}
                  style={styles.actionItem}
                  onPress={() => handleCardPress(option)}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor:
                          theme.colors.background === AppTheme.dark.colors.background
                            ? `${option.tint}22`
                            : option.surface,
                      },
                    ]}
                  >
                    <Icon size={40} color={option.tint} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.actionLabel}>{option.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
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
      paddingBottom: theme.spacing.xl,
    },
    hero: {
      backgroundColor: theme.colors.accentStrong,
      borderBottomLeftRadius: 34,
      borderBottomRightRadius: 34,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 18,
      paddingBottom: 94,
    },
    greeting: {
      fontSize: 16,
      lineHeight: 22,
      color: theme.colors.accentContrast,
      opacity: 0.9,
    },
    balance: {
      marginTop: 14,
      fontSize: 36,
      lineHeight: 40,
      fontWeight: "800",
      color: theme.colors.accentContrast,
      letterSpacing: -1,
    },
    balanceLabel: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.accentContrast,
      opacity: 0.82,
    },
    dashboardCard: {
      marginTop: -58,
      marginHorizontal: theme.spacing.lg,

    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 18,
    },
    actionItem: {
      backgroundColor: theme.colors.card,
      shadowColor: "#1A1D27",
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 16,
      width: "48%",
      alignItems: "center",
      gap: 8,
    },
    iconBadge: {
      width: 84,
      height: 84,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "500",
      color: theme.colors.heading,
      textAlign: "center",
    },
    sectionBlock: {
      marginTop: 26,
      gap: 14,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    moreLink: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
      color: theme.colors.mutedText,
    },
    transactionsList: {
      gap: 14,
    },
    transactionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    transactionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    transactionText: {
      flex: 1,
      gap: 1,
    },
    transactionSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.mutedText,
    },
    transactionTitle: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "700",
      color: theme.colors.heading,
    },
    transactionAmount: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
    },
    amountPositive: {
      color: "#60B96B",
    },
    amountNegative: {
      color: "#D96464",
    },
    promoCard: {
      flexDirection: "row",
      alignItems: "stretch",
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    promoMedia: {
      width: 98,
      minHeight: 90,
      backgroundColor: "#111B4E",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    promoBrand: {
      fontSize: 22,
      lineHeight: 24,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    promoContent: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 4,
      justifyContent: "center",
    },
    promoTitle: {
      fontSize: 15,
      lineHeight: 19,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    promoSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.mutedText,
    },
    promoCta: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      color: theme.colors.accentStrong,
    },
    scannerSafeArea: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    scannerScreen: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    scannerOverlay: {
      flex: 1,
      justifyContent: "space-between",
      backgroundColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(2, 6, 23, 0.42)"
          : "rgba(4, 10, 28, 0.28)",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 18,
      paddingBottom: 28,
    },
    scannerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scannerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.accentContrast,
    },
    scannerCloseButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(15, 23, 42, 0.82)"
          : "rgba(15, 23, 42, 0.6)",
      borderWidth: 1,
      borderColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(148,163,184,0.3)"
          : "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    scannerFrame: {
      alignSelf: "center",
      width: 252,
      height: 252,
      borderRadius: 28,
      backgroundColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(15, 23, 42, 0.22)"
          : "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(148,163,184,0.22)"
          : "rgba(255,255,255,0.12)",
    },
    corner: {
      position: "absolute",
      width: 36,
      height: 36,
      borderColor: theme.colors.info,
    },
    cornerTopLeft: {
      top: 12,
      left: 12,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 14,
    },
    cornerTopRight: {
      top: 12,
      right: 12,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 14,
    },
    cornerBottomLeft: {
      bottom: 12,
      left: 12,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 14,
    },
    cornerBottomRight: {
      bottom: 12,
      right: 12,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 14,
    },
    scannerBottom: {
      gap: 12,
    },
    tipCard: {
      borderRadius: theme.radius.lg,
      backgroundColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(15, 23, 42, 0.9)"
          : "rgba(15, 23, 42, 0.7)",
      borderWidth: 1,
      borderColor:
        theme.colors.background === AppTheme.dark.colors.background
          ? "rgba(148,163,184,0.18)"
          : "rgba(255,255,255,0.1)",
      padding: 18,
      gap: 6,
    },
    tipTitle: {
      color: theme.colors.accentContrast,
      fontSize: 16,
      fontWeight: "800",
    },
    tipCopy: {
      color: "#CBD5E1",
      fontSize: 14,
      lineHeight: 20,
    },
    resultCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
      padding: 18,
      gap: 12,
    },
    permissionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    resultTitle: {
      color: theme.colors.heading,
      fontSize: 16,
      fontWeight: "800",
    },
    resultLabel: {
      color: theme.colors.mutedText,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    resultValue: {
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
    },
    resultActions: {
      flexDirection: "row",
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.accentStrong,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: theme.colors.accentContrast,
      fontSize: 15,
      fontWeight: "800",
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: theme.colors.heading,
      fontSize: 15,
      fontWeight: "800",
    },
  });
}
