import { Image } from "expo-image";
import { CircleAlert, X } from "lucide-react-native";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiError } from "@/lib/api/apiClient";
import { qrScanService } from "@/lib/api/qr-scan-service";
import type { SemesterQrData } from "@/lib/api/semester-service";

type QrScannerViewProps = {
  semesterId?: number | null;
  cameraGranted: boolean;
  hasScanned: boolean;
  isSubmitting: boolean;
  scannedValue: string | null;
  scanResultMessage: string | null;
  onBarcodeScanned: (result: BarcodeScanningResult) => void;
  onRequestPermission: () => void;
  onScanAgain: () => void;
  onClose: () => void;
};

type Theme = (typeof AppTheme)["light"];

export function QrScannerView({
  semesterId,
  cameraGranted,
  hasScanned,
  isSubmitting,
  scannedValue,
  scanResultMessage,
  onBarcodeScanned,
  onRequestPermission,
  onScanAgain,
  onClose,
}: QrScannerViewProps) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const [semesterQr, setSemesterQr] = useState<SemesterQrData | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSemesterQr() {
      if (!semesterId) {
        setSemesterQr(null);
        setQrError(null);
        return;
      }

      try {
        setIsLoadingQr(true);
        setQrError(null);

        const response = await qrScanService.getSemesterQr(semesterId);

        if (isMounted) {
          setSemesterQr(response.data);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSemesterQr(null);
        setQrError(
          error instanceof ApiError
            ? error.message
            : "Unable to load semester QR.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingQr(false);
        }
      }
    }

    loadSemesterQr();

    return () => {
      isMounted = false;
    };
  }, [semesterId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        {cameraGranted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={hasScanned ? undefined : onBarcodeScanned}
          />
        ) : null}

        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan QR </Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X
                size={18}
                color={theme.colors.accentContrast}
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
            {!cameraGranted ? (
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
                  onPress={onRequestPermission}
                >
                  <Text style={styles.primaryButtonText}>Allow Camera</Text>
                </Pressable>
              </View>
            ) : isSubmitting ? (
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
                    onPress={onScanAgain}
                  >
                    <Text style={styles.secondaryButtonText}>Scan Again</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={onClose}>
                    <Text style={styles.primaryButtonText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : semesterQr ? (
              <View style={styles.qrCard}>
                <Text style={styles.resultLabel}>Semester QR</Text>
                <Text style={styles.qrTitle}>{semesterQr.title}</Text>
                <Image
                  source={{ uri: semesterQr.qr_image_url }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
                <Text style={styles.qrTokenLabel}>Token</Text>
                <Text style={styles.qrTokenValue}>{semesterQr.token}</Text>
                <Text style={styles.tipCopy}>
                  Show this QR for attendance scanning.
                </Text>
              </View>
            ) : isLoadingQr ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Loading</Text>
                <Text style={styles.resultValue}>
                  Fetching the semester QR code.
                </Text>
              </View>
            ) : qrError ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>QR unavailable</Text>
                <Text style={styles.resultValue}>{qrError}</Text>
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

function getStyles(theme: Theme) {
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
      backgroundColor:
        theme.colors.background === AppTheme.dark.colors.background
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
    frame: {
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
    bottom: {
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
    qrCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
      padding: 18,
      gap: 10,
      alignItems: "center",
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
    qrTitle: {
      color: theme.colors.heading,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      textAlign: "center",
    },
    qrImage: {
      width: 220,
      height: 220,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
    },
    qrTokenLabel: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      alignSelf: "flex-start",
    },
    qrTokenValue: {
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
      alignSelf: "stretch",
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
