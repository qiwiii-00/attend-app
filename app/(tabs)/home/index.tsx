import {
  Clock3,
  GraduationCap,
  QrCode,
  Star,
} from "lucide-react-native";
import { useIsFocused } from "@react-navigation/native";
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
import { getUser, type User } from "@/lib/api/user-service";

type ScanOption = {
  title: string;
  subtitle: string;
  shortLabel: string;
  icon: typeof QrCode;
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
    action: "scan",
  },
  {
    title: "My Attendance",
    subtitle: "View my attendance records",
    shortLabel: "My attendance",
    icon: GraduationCap,
    action: "attendance",
  },
  {
    title: "Class Schedule",
    subtitle: "View classes for this week",
    shortLabel: "Schedule",
    icon: Clock3,
    action: "upcoming-class",
  },
  {
    title: "Feedback",
    subtitle: "Attendance feedback and support",
    shortLabel: "Feedback",
    icon: Star,
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

function getScanOptionPalette(theme: Theme, action: ScanOption["action"]) {
  if (action === "scan") {
    return {
      surface: theme.colors.card,
      iconSurface: theme.colors.infoSoft,
      tint: theme.colors.info,
    };
  }

  if (action === "feedback") {
    return {
      surface: theme.colors.card,
      iconSurface: theme.colors.cardAccent,
      tint: theme.colors.accent,
    };
  }

  return {
    surface: theme.colors.card,
    iconSurface: theme.colors.surfaceMuted,
    tint: theme.colors.heading,
  };
}

export default function HomeTabScreen() {
  const { user: sessionUser } = useSession();
  const isFocused = useIsFocused();
  const theme = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const styles = useMemo(() => getStyles(theme), [theme]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

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
  }, [isFocused, sessionUser]);

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

  function handleCardPress(option: ScanOption) {
    if (option.action === "scan") {
      router.push("/scanner");
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
            const palette = getScanOptionPalette(theme, option.action);

            return (
              <Pressable
                key={option.title}
                style={[styles.actionItem, { backgroundColor: palette.surface }]}
                onPress={() => handleCardPress(option)}
              >
                <View
                  style={[
                    styles.actionIconWrap,
                    { backgroundColor: palette.iconSurface },
                  ]}
                >
                  <Icon size={24} color={palette.tint} strokeWidth={2.2} />
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
      color: theme.colors.heading,
    },
    courseMeta: {
      fontSize: 15,
      lineHeight: 21,
      color: theme.colors.mutedText,
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
      shadowOpacity: isDark ? 0.24 : 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      color: theme.colors.heading,
    },
    actionSubtitle: {
      fontSize: 12,
      lineHeight: 20,
      color: theme.colors.mutedText,
    },
  });
}
