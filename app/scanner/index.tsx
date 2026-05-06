import { CircleAlert, X } from "lucide-react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiError } from "@/lib/api/apiClient";
import { scanSemesterQr } from "@/lib/api/qr-scan-service";

type Theme = (typeof AppTheme)["light"];

export default function ScannerScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [scanResultMessage, setScanResultMessage] = useState<string | null>(
    null,
  );

  function handleClose() {
    router.replace("/(tabs)/home");
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (hasScanned || isSubmittingScan) {
      return;
    }

    try {
      setHasScanned(true);
      setIsSubmittingScan(true);
      setScannedValue(result.data);

      const locationPermission =
        await Location.requestForegroundPermissionsAsync();

      if (locationPermission.status !== "granted") {
        throw new Error("Location permission is required to scan attendance QR.");
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const response = await scanSemesterQr({
        token: result.data,
        device_id: "mobile-app",
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      setScanResultMessage(response.message);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to mark attendance.";

      setScanResultMessage(message);
    } finally {
      setIsSubmittingScan(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
          />
        ) : null}

        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan QR Code</Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <X
                size={18}
                color={
                  theme.colors.background === AppTheme.dark.colors.background
                    ? "#FFFFFF"
                    : theme.colors.accentContrast
                }
                strokeWidth={2.3}
              />
            </Pressable>
          </View>

          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <View style={styles.bottom}>
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
            ) : isSubmittingScan ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Scanning</Text>
                <Text style={styles.resultValue}>
                  Validating QR token and marking attendance.
                </Text>
              </View>
            ) : scannedValue ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Scan result</Text>
                <Text style={styles.resultValue}>
                  {scanResultMessage ?? scannedValue}
                </Text>
                <View style={styles.resultActions}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      setHasScanned(false);
                      setScannedValue(null);
                      setScanResultMessage(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Scan Again</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={handleClose}
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

function createStyles(theme: Theme) {
  const isDark = theme.colors.background === AppTheme.dark.colors.background;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    overlay: {
      flex: 1,
      justifyContent: "space-between",
      backgroundColor: isDark
        ? "rgba(2, 6, 23, 0.42)"
        : "rgba(4, 10, 28, 0.28)",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 18,
      paddingBottom: 28,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.accentContrast,
    },
    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark
        ? "rgba(15, 23, 42, 0.82)"
        : "rgba(15, 23, 42, 0.6)",
      borderWidth: 1,
      borderColor: isDark
        ? "rgba(148,163,184,0.3)"
        : "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    frame: {
      alignSelf: "center",
      width: 252,
      height: 252,
      borderRadius: 28,
      backgroundColor: isDark
        ? "rgba(15, 23, 42, 0.22)"
        : "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor: isDark
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
    bottom: {
      gap: 12,
    },
    tipCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: isDark
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(15, 23, 42, 0.7)",
      borderWidth: 1,
      borderColor: isDark
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
      color: isDark ? "#CBD5E1" : "#E2E8F0",
      fontSize: 14,
      lineHeight: 20,
    },
    resultCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
