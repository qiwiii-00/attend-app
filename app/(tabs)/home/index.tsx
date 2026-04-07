import {
  CircleAlert,
  Clock3,
  GraduationCap,
  QrCode,
  Star,
  X,
} from "lucide-react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WeeklyReportCard } from "@/components/weekly-report-card";
import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSession } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/apiClient";
import {
  getAttendances,
  type AttendanceRecord,
} from "@/lib/api/attendance-service";
import { getPeriods, type PeriodRecord } from "@/lib/api/period-service";
import { scanSemesterQr } from "@/lib/api/qr-scan-service";
import { getUser, type User } from "@/lib/api/user-service";

type ScanOption = {
  title: string;
  subtitle: string;
  shortLabel: string;
  icon: typeof QrCode;
  tint: string;
  surface: string;
  iconSurface: string;
  action: "scan" | "attendance" | "upcoming-class" | "feedback" | "coming-soon";
};

type WeeklyBar = {
  key: string;
  label: string;
  value: number;
  attended: number;
  total: number;
  isToday: boolean;
};

const scanOptions: ScanOption[] = [
  {
    title: "Scan here",
    subtitle: "Scan QR code to  attendance",
    shortLabel: "Scan QR",
    icon: QrCode,
    tint: "#334E7D",
    surface: "#FFFFFF",
    iconSurface: "#DCE8FA",
    action: "scan",
  },
  {
    title: "My Attendance",
    subtitle: "View my attendance records",
    shortLabel: "My attendance",
    icon: GraduationCap,
    tint: "#000000",
    surface: "#FFFFFF",
    iconSurface: "#DCE8FA",
    action: "attendance",
  },
  {
    title: "Class Schedule",
    subtitle: "View classes for this week",
    shortLabel: "Schedule",
    icon: Clock3,
    tint: "#111111",
    surface: "#FFFFFF",
    iconSurface: "#DCE8FA",
    action: "upcoming-class",
  },
  {
    title: "Feedback",
    subtitle: "Attendance feedback and support",
    shortLabel: "Feedback",
    icon: Star,
    tint: "#000000",
    surface: "#FFFFFF",
    iconSurface: "#DCE8FA",
    action: "feedback",
  },
];

type Theme = (typeof AppTheme)["light"];

function normalizeUserResponse(
  value: User | { data?: User } | null | undefined,
) {
  if (!value) {
    return null;
  }

  if ("data" in value && value.data) {
    return value.data;
  }

  return value;
}

function getShortName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts[0] || "User";
}

function getWeekdayIndex(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - getWeekdayIndex(start));
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getAttendanceDate(attendance: AttendanceRecord) {
  const value = attendance.scanned_at ?? attendance.created_at;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sortPeriods(periods: PeriodRecord[]) {
  return [...periods].sort((left, right) =>
    left.start_time.localeCompare(right.start_time),
  );
}

function buildWeeklyBars(
  attendances: AttendanceRecord[],
  periods: PeriodRecord[],
) {
  const labels = ["M", "T", "W", "T", "F"];
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const orderedPeriods = sortPeriods(periods);
  const periodOrderMap = new Map(
    orderedPeriods.map((period, index) => [period.id, index + 1]),
  );

  return labels.map((label, index) => {
    const dayStart = addDays(startOfWeek, index);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayAttendances = attendances.filter((attendance) => {
      const date = getAttendanceDate(attendance);
      return date ? date >= dayStart && date <= dayEnd : false;
    });

    const periodNumbers = new Set(
      dayAttendances
        .map((attendance) => attendance.session?.period_id)
        .filter((periodId): periodId is number => typeof periodId === "number")
        .map((periodId) => periodOrderMap.get(periodId) ?? periodId),
    );

    const attended = dayAttendances.filter(
      (attendance) =>
        attendance.status === "present" || attendance.status === "late",
    ).length;

    return {
      key: `${label}-${index}`,
      label,
      value: periodNumbers.size,
      attended,
      total: dayAttendances.length,
      isToday: getWeekdayIndex(today) === index,
    } satisfies WeeklyBar;
  });
}

function getWeeklySummary(bars: WeeklyBar[]) {
  return bars.reduce(
    (summary, bar) => {
      summary.attended += bar.attended;
      summary.total += bar.total;
      return summary;
    },
    { attended: 0, total: 0 },
  );
}

export default function HomeTabScreen() {
  const { user: sessionUser } = useSession();
  const theme = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<User | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [scanResultMessage, setScanResultMessage] = useState<string | null>(
    null,
  );
  const styles = useMemo(() => getStyles(theme), [theme]);

  useEffect(() => {
    async function loadHomeData() {
      if (!sessionUser?.id) {
        setUser(null);
        setAttendances([]);
        setPeriods([]);
        return;
      }

      try {
        const [userResponse, attendanceResponse, periodResponse] =
          await Promise.all([
            getUser(sessionUser.id),
            getAttendances(),
            getPeriods(),
          ]);

        const currentUser = normalizeUserResponse(userResponse);
        setUser(currentUser);
        setAttendances(
          attendanceResponse.data.filter(
            (attendance) => attendance.user_id === sessionUser.id,
          ),
        );
        setPeriods(
          periodResponse.data.filter(
            (period) =>
              period.course_id === currentUser?.course_id &&
              period.semester_id === currentUser?.semester_id,
          ),
        );
      } catch (error) {
        setUser(sessionUser);

        if (error instanceof ApiError) {
          return;
        }

        Alert.alert("Load failed", "Unable to load your attendance summary.");
      }
    }

    loadHomeData();
  }, [sessionUser]);

  const weeklyBars = useMemo(
    () => buildWeeklyBars(attendances, periods),
    [attendances, periods],
  );
  const weeklySummary = useMemo(
    () => getWeeklySummary(weeklyBars),
    [weeklyBars],
  );
  const weeklySummaryText =
    weeklySummary.total > 0
      ? `${weeklySummary.attended}/${weeklySummary.total} classes marked this week`
      : "No attendance recorded this week yet";
  const totalPeriodsForScale = Math.max(periods.length, 1);

  async function refreshAttendances() {
    if (!sessionUser?.id) {
      return;
    }

    const attendanceResponse = await getAttendances();
    setAttendances(
      attendanceResponse.data.filter(
        (attendance) => attendance.user_id === sessionUser.id,
      ),
    );
  }

  function handleCardPress(option: ScanOption) {
    if (option.action === "scan") {
      setScannedValue(null);
      setHasScanned(false);
      setScanResultMessage(null);
      setScannerOpen(true);
      return;
    }

    if (option.action === "attendance") {
      router.push("/attendance");
      return;
    }

    if (option.action === "upcoming-class") {
      router.push("/upcoming-class");
      return;
    }

    if (option.action === "feedback") {
      router.push("/feedback");
      return;
    }

    Alert.alert("Coming soon", `${option.title} is not implemented yet.`);
  }

  function handleCloseScanner() {
    setScannerOpen(false);
    setHasScanned(false);
    setScannedValue(null);
    setScanResultMessage(null);
    setIsSubmittingScan(false);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (hasScanned || isSubmittingScan) {
      return;
    }

    try {
      setHasScanned(true);
      setIsSubmittingScan(true);
      setScannedValue(result.data);

      const response = await scanSemesterQr({
        token: result.data,
        device_id: "mobile-app",
      });

      setScanResultMessage(response.message);
      await refreshAttendances();
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
        <View style={styles.headerBlock}>
          <Text style={styles.helloTitle}>
            Hello, {getShortName(user?.name ?? sessionUser?.name)}
          </Text>
          <Text style={styles.courseMeta}>
            {user?.course?.title ?? "No course assigned"}{" "}
            {user?.semester?.title ?? ""}
          </Text>
        </View>

        <WeeklyReportCard
          bars={weeklyBars}
          summaryText={weeklySummaryText}
          maxValue={totalPeriodsForScale}
        />

        <View style={styles.actionsGrid}>
          {scanOptions.map((option) => {
            const Icon = option.icon;

            return (
              <Pressable
                key={option.title}
                style={[styles.actionItem, { backgroundColor: option.surface }]}
                onPress={() => handleCardPress(option)}
              >
                <View
                  style={[
                    styles.actionIconWrap,
                    { backgroundColor: option.iconSurface },
                  ]}
                >
                  <Icon size={24} color={option.tint} strokeWidth={2.2} />
                </View>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>{option.title}</Text>
                  <Text style={styles.actionSubtitle}>{option.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    screen: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    content: {
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 34,
    },
    headerBlock: {
      gap: 6,
      marginBottom: 18,
    },
    helloTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: "#111111",
    },
    courseMeta: {
      fontSize: 15,
      lineHeight: 21,
      color: "#3B3B3B",
    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 14,
      columnGap: 12,
      marginTop: 18,
      justifyContent: "center",
    },
    actionItem: {
      width: "48%",
      minHeight: 158,
      borderRadius: 28,
      paddingHorizontal: 14,
      paddingVertical: 16,
      alignItems: "flex-start",
      justifyContent: "space-between",
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      borderWidth: 1,
      borderColor: "#E9E9E9",
    },
    actionIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTextBlock: {
      gap: 4,
    },
    actionTitle: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700",
      color: "#111111",
    },
    actionSubtitle: {
      fontSize: 12,
      lineHeight: 20,
      color: "#2F2F2F",
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
