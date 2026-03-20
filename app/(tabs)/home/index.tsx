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
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/apiClient";
import { getUser, type User } from "@/lib/api/user-service";

type ScanOption = {
  title: string;
  icon: typeof QrCode;
  tint: string;
  surface: string;
  action: "scan" | "coming-soon";
};

const scanOptions: ScanOption[] = [
  {
    title: "Tap here to scan QR code",
    icon: QrCode,
    tint: "#5CC9D6",
    surface: "#E8FBFD",
    action: "scan",
  },
  {
    title: "My Attendance",
    icon: Pencil,
    tint: "#7AA7F6",
    surface: "#EEF4FF",
    action: "coming-soon",
  },
  {
    title: "Upcoming Class",
    icon: Clock,
    tint: "#F2A8B7",
    surface: "#FFF1F4",
    action: "coming-soon",
  },
  {
    title: "Feedback",
    icon: Star,
    tint: "#D3B15A",
    surface: "#FFF8E6",
    action: "coming-soon",
  },
];

export default function HomeTabScreen() {
  const { user: sessionUser } = useSession();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<User | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const theme = isDark ? darkTheme : lightTheme;
  const styles = getStyles(theme);

  useEffect(() => {
    async function loadUser() {
      if (!sessionUser?.id) {
        setUser(null);
        return;
      }

      try {
        const response = await getUser(sessionUser.id);
        setUser(response);
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
                <X size={18} color="#F8FAFC" strokeWidth={2.3} />
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
                    <CircleAlert size={18} color="#F59E0B" strokeWidth={2.2} />
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
      <View style={styles.screen}>
        <View style={styles.backgroundOrbTop} />
        <View style={styles.backgroundOrbBottom} />

        <View style={styles.headerRow} />

        <Text style={styles.title}>
          Hello, {user?.name ?? sessionUser?.name ?? "User"}
        </Text>

        <View style={styles.grid}>
          {scanOptions.map((option) => {
            const Icon = option.icon;

            return (
              <Pressable
                key={option.title}
                style={styles.card}
                onPress={() => handleCardPress(option)}
              >
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isDark
                        ? `${option.tint}22`
                        : option.surface,
                    },
                  ]}
                >
                  <Icon size={30} color={option.tint} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardTitle}>{option.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const lightTheme = {
  safeArea: "#CBEFF3",
  screen: "#F4F8F2",
  orb: "#CBEFF3",
  title: "#111715",
  card: "rgba(255,255,255,0.82)",
  cardBorder: "rgba(223, 232, 227, 0.95)",
  cardShadow: "#A9C9C4",
  cardTitle: "#171D1C",
  scannerSafeArea: "#050816",
  scannerOverlay: "rgba(4, 10, 28, 0.28)",
  scannerTitle: "#F8FAFC",
  scannerCloseButton: "rgba(15, 23, 42, 0.6)",
  scannerCloseBorder: "rgba(255,255,255,0.18)",
  scannerFrame: "rgba(255,255,255,0.05)",
  scannerFrameBorder: "rgba(255,255,255,0.12)",
  scannerCorner: "#8CF5FF",
  tipCard: "rgba(15, 23, 42, 0.7)",
  tipCardBorder: "rgba(255,255,255,0.1)",
  tipTitle: "#F8FAFC",
  tipCopy: "#CBD5E1",
  resultCard: "rgba(248, 250, 252, 0.95)",
  resultTitle: "#0F172A",
  resultLabel: "#475569",
  resultValue: "#0F172A",
  primaryButton: "#0F172A",
  primaryButtonText: "#FFFFFF",
  secondaryButton: "#E2E8F0",
  secondaryButtonText: "#0F172A",
};

const darkTheme = {
  safeArea: "#14313A",
  screen: "#0D171C",
  orb: "#14313A",
  title: "#F3FBF7",
  card: "rgba(17, 31, 36, 0.92)",
  cardBorder: "rgba(97, 138, 145, 0.28)",
  cardShadow: "#020617",
  cardTitle: "#E6F2EF",
  scannerSafeArea: "#020617",
  scannerOverlay: "rgba(2, 6, 23, 0.42)",
  scannerTitle: "#F8FAFC",
  scannerCloseButton: "rgba(15, 23, 42, 0.82)",
  scannerCloseBorder: "rgba(148,163,184,0.3)",
  scannerFrame: "rgba(15, 23, 42, 0.22)",
  scannerFrameBorder: "rgba(148,163,184,0.22)",
  scannerCorner: "#8CF5FF",
  tipCard: "rgba(15, 23, 42, 0.9)",
  tipCardBorder: "rgba(148,163,184,0.18)",
  tipTitle: "#F8FAFC",
  tipCopy: "#CBD5E1",
  resultCard: "rgba(15, 23, 42, 0.96)",
  resultTitle: "#F8FAFC",
  resultLabel: "#94A3B8",
  resultValue: "#E2E8F0",
  primaryButton: "#E2E8F0",
  primaryButtonText: "#0F172A",
  secondaryButton: "rgba(30, 41, 59, 0.95)",
  secondaryButtonText: "#E2E8F0",
};

function getStyles(theme: typeof lightTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.safeArea,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.screen,
      paddingHorizontal: 20,
      borderTopLeftRadius: 40,
      position: "relative",
      overflow: "hidden",
    },
    backgroundOrbTop: {
      position: "absolute",
      top: -110,
      right: -70,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: theme.orb,
    },
    backgroundOrbBottom: {
      position: "absolute",
      bottom: -70,
      left: -40,
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: theme.orb,
    },
    headerRow: {
      minHeight: 24,
    },
    title: {
      marginTop: 28,
      width: "84%",
      fontSize: 36,
      lineHeight: 42,
      fontWeight: "800",
      color: theme.title,
      letterSpacing: -1.3,
    },
    subtitle: {
      marginTop: 8,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "500",
      color: theme.resultLabel,
    },
    grid: {
      marginTop: 38,
      flexDirection: "row",
      paddingVertical: 70,
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      alignContent: "center",
      rowGap: 14,
    },
    card: {
      width: "48%",
      minHeight: 166,
      borderRadius: 24,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      shadowColor: theme.cardShadow,
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBadge: {
      width: 58,
      height: 58,
      borderRadius: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      marginTop: 28,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "700",
      color: theme.cardTitle,
      letterSpacing: -0.3,
      textAlign: "center",
    },
    scannerSafeArea: {
      flex: 1,
      backgroundColor: theme.scannerSafeArea,
    },
    scannerScreen: {
      flex: 1,
      backgroundColor: theme.scannerSafeArea,
    },
    scannerOverlay: {
      flex: 1,
      justifyContent: "space-between",
      backgroundColor: theme.scannerOverlay,
      paddingHorizontal: 20,
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
      color: theme.scannerTitle,
    },
    scannerCloseButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.scannerCloseButton,
      borderWidth: 1,
      borderColor: theme.scannerCloseBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    scannerFrame: {
      alignSelf: "center",
      width: 252,
      height: 252,
      borderRadius: 28,
      backgroundColor: theme.scannerFrame,
      borderWidth: 1,
      borderColor: theme.scannerFrameBorder,
    },
    corner: {
      position: "absolute",
      width: 36,
      height: 36,
      borderColor: theme.scannerCorner,
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
      borderRadius: 24,
      backgroundColor: theme.tipCard,
      borderWidth: 1,
      borderColor: theme.tipCardBorder,
      padding: 18,
      gap: 6,
    },
    tipTitle: {
      color: theme.tipTitle,
      fontSize: 16,
      fontWeight: "800",
    },
    tipCopy: {
      color: theme.tipCopy,
      fontSize: 14,
      lineHeight: 20,
    },
    resultCard: {
      borderRadius: 24,
      backgroundColor: theme.resultCard,
      padding: 18,
      gap: 12,
    },
    permissionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    resultTitle: {
      color: theme.resultTitle,
      fontSize: 16,
      fontWeight: "800",
    },
    resultLabel: {
      color: theme.resultLabel,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    resultValue: {
      color: theme.resultValue,
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
      backgroundColor: theme.primaryButton,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: theme.primaryButtonText,
      fontSize: 15,
      fontWeight: "800",
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: theme.secondaryButton,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: theme.secondaryButtonText,
      fontSize: 15,
      fontWeight: "800",
    },
  });
}
