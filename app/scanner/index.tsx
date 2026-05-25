import { CircleAlert, X } from "lucide-react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiError } from "@/lib/api/apiClient";
import { scanSemesterQr } from "@/lib/api/qr-scan-service";

type Theme = (typeof AppTheme)["light"];

export default function ScannerScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<
    boolean | null
  >(null);
  const [scanResultMessage, setScanResultMessage] = useState<string | null>(
    null,
  );
  const compactLayout = height < 760;
  const frameSize = useMemo(() => {
    const horizontalPadding = theme.spacing.lg * 2;
    const availableWidth = width - horizontalPadding - 24;
    const reservedHeight = compactLayout ? 320 : 376;
    const availableHeight =
      height - insets.top - insets.bottom - reservedHeight;

    return Math.max(160, Math.min(252, availableWidth, availableHeight));
  }, [
    compactLayout,
    height,
    insets.bottom,
    insets.top,
    theme.spacing.lg,
    width,
  ]);
  const frameCornerSize = frameSize < 190 ? 28 : 36;
  const frameCornerOffset = frameSize < 190 ? 10 : 12;
  const styles = useMemo(
    () => createStyles(theme, compactLayout),
    [compactLayout, theme],
  );
  const cameraGranted = permission?.granted ?? false;
  const locationGranted = hasLocationPermission === true;

  useEffect(() => {
    let isMounted = true;

    async function requestScreenPermissions() {
      const cameraPermission = await requestPermission();

      if (!isMounted || !cameraPermission.granted) {
        return;
      }

      const locationPermission =
        await Location.requestForegroundPermissionsAsync();

      if (isMounted) {
        setHasLocationPermission(locationPermission.status === "granted");
      }
    }

    void requestScreenPermissions();

    return () => {
      isMounted = false;
    };
  }, [requestPermission]);

  function handleClose() {
    router.replace("/(tabs)/home");
  }

  async function handlePermissionRetry() {
    const cameraPermission = await requestPermission();

    if (!cameraPermission.granted) {
      return;
    }

    const locationPermission =
      await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(locationPermission.status === "granted");
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (hasScanned || isSubmittingScan || !cameraGranted || !locationGranted) {
      return;
    }

    try {
      setHasScanned(true);
      setIsSubmittingScan(true);
      setScannedValue(result.data);

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
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        {cameraGranted ? (
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

          <View style={styles.frameSection}>
            <View
              style={[
                styles.frame,
                {
                  width: frameSize,
                  height: frameSize,
                  borderRadius: Math.max(22, Math.round(frameSize * 0.11)),
                },
              ]}
            >
              <View
                style={[
                  styles.corner,
                  styles.cornerTopLeft,
                  {
                    width: frameCornerSize,
                    height: frameCornerSize,
                    top: frameCornerOffset,
                    left: frameCornerOffset,
                  },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  styles.cornerTopRight,
                  {
                    width: frameCornerSize,
                    height: frameCornerSize,
                    top: frameCornerOffset,
                    right: frameCornerOffset,
                  },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  styles.cornerBottomLeft,
                  {
                    width: frameCornerSize,
                    height: frameCornerSize,
                    bottom: frameCornerOffset,
                    left: frameCornerOffset,
                  },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  styles.cornerBottomRight,
                  {
                    width: frameCornerSize,
                    height: frameCornerSize,
                    bottom: frameCornerOffset,
                    right: frameCornerOffset,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.bottom}>
            {!cameraGranted || hasLocationPermission === false ? (
              <View style={styles.resultCard}>
                <View style={styles.permissionRow}>
                  <CircleAlert
                    size={18}
                    color={theme.colors.accent}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.resultTitle}>
                    {!cameraGranted
                      ? "Camera permission required"
                      : "Location permission required"}
                  </Text>
                </View>
                <Text style={styles.resultValue}>
                  {!cameraGranted
                    ? "Allow camera access to scan the QR code."
                    : "Allow location access to validate and mark attendance."}
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={handlePermissionRetry}
                >
                  <Text style={styles.primaryButtonText}>
                    {!cameraGranted ? "Allow Camera" : "Allow Location"}
                  </Text>
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

function createStyles(theme: Theme, compactLayout: boolean) {
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
      backgroundColor: isDark
        ? "rgba(2, 6, 23, 0.42)"
        : "rgba(4, 10, 28, 0.28)",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: compactLayout ? 12 : 18,
      paddingBottom: compactLayout ? 16 : 24,
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
    frameSection: {
      flex: 1,
      minHeight: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: compactLayout ? 12 : 20,
    },
    frame: {
      alignSelf: "center",
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
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 14,
    },
    cornerTopRight: {
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 14,
    },
    cornerBottomLeft: {
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 14,
    },
    cornerBottomRight: {
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
