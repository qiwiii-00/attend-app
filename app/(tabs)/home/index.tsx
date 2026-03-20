import { CircleAlert, Clock, Pencil, QrCode, Star, X } from "lucide-react-native";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

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
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<User | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);

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
      <SafeAreaView style={styles.scannerSafeArea}>
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
              <Pressable style={styles.scannerCloseButton} onPress={handleCloseScanner}>
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
                    <Text style={styles.resultTitle}>Camera permission required</Text>
                  </View>
                  <Text style={styles.resultValue}>
                    Allow camera access to scan the QR code.
                  </Text>
                  <Pressable style={styles.primaryButton} onPress={requestPermission}>
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
                    <Pressable style={styles.primaryButton} onPress={handleCloseScanner}>
                      <Text style={styles.primaryButtonText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.tipCard}>
                  <Text style={styles.tipTitle}>Align the code inside the frame</Text>
                  <Text style={styles.tipCopy}>The scan will trigger automatically.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.backgroundOrbTop} />
        <View style={styles.backgroundOrbBottom} />

        <View style={styles.headerRow} />

        <Text style={styles.title}>Hello, {user?.name ?? sessionUser?.name ?? "User"}</Text>
        <Text style={styles.subtitle}>Press scan QR button to scan code</Text>

        <View style={styles.grid}>
          {scanOptions.map((option) => {
            const Icon = option.icon;

            return (
              <Pressable
                key={option.title}
                style={styles.card}
                onPress={() => handleCardPress(option)}
              >
                <View style={[styles.iconBadge, { backgroundColor: option.surface }]}>
                  <Icon size={20} color={option.tint} strokeWidth={2.2} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#CBEFF3",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F4F8F2",
    paddingHorizontal: 20,
    paddingTop: 12,
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
    backgroundColor: "rgba(140, 229, 235, 0.28)",
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -70,
    left: -40,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(222, 244, 246, 0.9)",
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
    color: "#111715",
    letterSpacing: -1.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: "#4B5A56",
  },
  grid: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  card: {
    width: "48%",
    minHeight: 176,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(223, 232, 227, 0.95)",
    shadowColor: "#A9C9C4",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    marginTop: 28,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#171D1C",
    letterSpacing: -0.3,
  },
  scannerSafeArea: {
    flex: 1,
    backgroundColor: "#050816",
  },
  scannerScreen: {
    flex: 1,
    backgroundColor: "#050816",
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "rgba(4, 10, 28, 0.28)",
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
    color: "#F8FAFC",
  },
  scannerCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    alignSelf: "center",
    width: 252,
    height: 252,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#8CF5FF",
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
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 18,
    gap: 6,
  },
  tipTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  tipCopy: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  resultCard: {
    borderRadius: 24,
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    padding: 18,
    gap: 12,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  resultLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resultValue: {
    color: "#0F172A",
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
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
});

