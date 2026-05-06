import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  XCircle,
} from "lucide-react-native";
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

import { ApiError } from "@/lib/api/apiClient";
import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getAttendances,
  getUserAttendanceSummary,
  type AttendanceSummaryItem,
  type AttendanceRecord,
} from "@/lib/api/attendance-service";
import {
  getAttendanceSessions,
  type AttendanceSessionRecord,
} from "@/lib/api/attendance-session-service";
import {
  getPeriodsByContext,
  type PeriodRecord,
} from "@/lib/api/period-service";
import { MonthlySubjectAttendanceCard } from "@/components/monthly-subject-attendance-card";
import { useSession } from "@/lib/auth-context";

type SubjectSummary = {
  name: string;
  attended: number;
  total: number;
};

type GroupedAttendance = {
  dateKey: string;
  dateLabel: string;
  items: {
    id: number;
    subjectName: string;
    timeLabel: string;
    status: AttendanceRecord["status"];
  }[];
};

type SummaryRange = "Day" | "Month";
type AttendanceSummaryTotals = {
  total: number;
  present: number;
  late: number;
  absent: number;
};

type TodaySubjectStatus = "present" | "late" | "absent" | "not_marked";

type TodaySubjectItem = {
  id: number;
  subjectName: string;
  timeLabel: string;
  status: TodaySubjectStatus;
};

type Theme = (typeof AppTheme)["light"];

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function getAttendanceDate(attendance: AttendanceRecord) {
  const parsed = new Date(attendance.scanned_at ?? attendance.created_at);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getSessionMap(sessions: AttendanceSessionRecord[]) {
  return new Map(sessions.map((session) => [session.id, session]));
}

function getSubjectName(
  attendance: AttendanceRecord,
  sessionMap: Map<number, AttendanceSessionRecord>,
) {
  const session = sessionMap.get(attendance.attendance_session_id);
  return (
    session?.subject?.title ?? `Session #${attendance.attendance_session_id}`
  );
}

function buildSubjectSummary(
  attendances: AttendanceRecord[],
  sessionMap: Map<number, AttendanceSessionRecord>,
) {
  const subjectTotals = new Map<string, SubjectSummary>();

  for (const attendance of attendances) {
    const name = getSubjectName(attendance, sessionMap);
    const existing = subjectTotals.get(name) ?? { name, attended: 0, total: 0 };
    existing.total += 1;

    if (attendance.status === "present" || attendance.status === "late") {
      existing.attended += 1;
    }

    subjectTotals.set(name, existing);
  }

  return Array.from(subjectTotals.values()).sort(
    (left, right) => right.total - left.total,
  );
}

function isInCurrentMonth(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

function buildGroupedHistory(
  attendances: AttendanceRecord[],
  sessionMap: Map<number, AttendanceSessionRecord>,
) {
  const groups = new Map<string, GroupedAttendance>();

  for (const attendance of attendances) {
    const date = getAttendanceDate(attendance);
    if (!date) {
      continue;
    }

    const dateKey = formatApiDate(date);
    const existing = groups.get(dateKey) ?? {
      dateKey,
      dateLabel: formatDayLabel(date),
      items: [],
    };

    existing.items.push({
      id: attendance.id,
      subjectName: getSubjectName(attendance, sessionMap),
      timeLabel: formatTimeLabel(date),
      status: attendance.status,
    });

    groups.set(dateKey, existing);
  }

  return Array.from(groups.values())
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) =>
        left.timeLabel.localeCompare(right.timeLabel),
      ),
    }));
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekdayKey(date: Date) {
  return WEEKDAY_KEYS[date.getDay()];
}

function sortPeriods(periods: PeriodRecord[]) {
  return [...periods].sort((left, right) =>
    left.start_time.localeCompare(right.start_time),
  );
}

function buildTodaySubjectItems(
  periods: PeriodRecord[],
  attendances: AttendanceRecord[],
  sessionMap: Map<number, AttendanceSessionRecord>,
) {
  const todayKey = formatApiDate(new Date());
  const weekday = getWeekdayKey(new Date());

  const attendanceByPeriodId = new Map<number, TodaySubjectStatus>();

  for (const attendance of attendances) {
    const date = getAttendanceDate(attendance);
    const session = sessionMap.get(attendance.attendance_session_id);

    if (!date || !session?.period_id || formatApiDate(date) !== todayKey) {
      continue;
    }

    const status =
      attendance.status === "present" || attendance.status === "late"
        ? attendance.status
        : "absent";

    attendanceByPeriodId.set(session.period_id, status);
  }

  return sortPeriods(periods)
    .map((period) => {
      const subjects = period.subjects ?? [];
      const subject =
        subjects.find((item) => item.day_of_week === weekday) ??
        subjects.find((item) => item.day_of_week === null);

      if (!period.is_active || !subject?.is_active) {
        return null;
      }

      return {
        id: period.id,
        subjectName: subject.name || period.name,
        timeLabel: `${period.start_time.slice(0, 5)} - ${period.end_time.slice(0, 5)}`,
        status: attendanceByPeriodId.get(period.id) ?? "not_marked",
      } satisfies TodaySubjectItem;
    })
    .filter((item): item is TodaySubjectItem => item !== null);
}

function getSelectedRangeMeta(range: SummaryRange) {
  const today = new Date();

  if (range === "Day") {
    const todayValue = formatApiDate(today);

    return {
      sortBy: "daily" as const,
      title: "Today",
      fromDate: todayValue,
      toDate: todayValue,
      matchItem: (item: AttendanceSummaryItem) => item.date === todayValue,
    };
  }

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    sortBy: "monthly" as const,
    title: "This month",
    fromDate: formatApiDate(startOfMonth),
    toDate: formatApiDate(endOfMonth),
    matchItem: (item: AttendanceSummaryItem) =>
      item.year === today.getFullYear() && item.month === today.getMonth() + 1,
  };
}

function getSummaryTotals(
  item?: AttendanceSummaryItem | null,
): AttendanceSummaryTotals {
  return {
    total: item?.total_count ?? 0,
    present: item?.present_count ?? 0,
    late: item?.late_count ?? 0,
    absent: item?.absent_count ?? 0,
  };
}

function getStatusColors(theme: Theme, status: AttendanceRecord["status"]) {
  if (status === "present") {
    return {
      bg: theme.colors.surfaceSoft,
      fg: theme.colors.info,
      label: "Present",
    };
  }

  if (status === "late") {
    return {
      bg: theme.colors.infoSoft,
      fg: theme.colors.accentStrong,
      label: "Late",
    };
  }

  return {
    bg: theme.colors.cardAccent,
    fg: theme.colors.accentStrong,
    label: "Absent",
  };
}

export default function AttendanceScreen() {
  const { user } = useSession();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionRecord[]>([]);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [selectedRange, setSelectedRange] = useState<SummaryRange>("Day");
  const [summaryTotals, setSummaryTotals] = useState<AttendanceSummaryTotals>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
  });

  useEffect(() => {
    async function loadAttendanceData() {
      if (!user?.id) {
        setAttendances([]);
        setSessions([]);
        setLoading(false);
        return;
      }

      try {
        const [attendanceResponse, sessionResponse, periodResponse] =
          await Promise.all([
          getAttendances(),
          getAttendanceSessions(),
          getPeriodsByContext({ user_id: user.id }),
        ]);

        setAttendances(
          attendanceResponse.data
            .filter((attendance) => attendance.user_id === user.id)
            .sort((left, right) =>
              right.created_at.localeCompare(left.created_at),
            ),
        );
        setSessions(sessionResponse.data);
        setPeriods(periodResponse.data.periods);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          Alert.alert("Load failed", "Unable to load attendance details.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadAttendanceData();
  }, [user]);

  useEffect(() => {
    async function loadSummary() {
      if (!user?.id) {
        setSummaryTotals({ total: 0, present: 0, late: 0, absent: 0 });
        setSummaryLoading(false);
        return;
      }

      const rangeMeta = getSelectedRangeMeta(selectedRange);

      try {
        setSummaryLoading(true);

        const response = await getUserAttendanceSummary({
          sort_by: rangeMeta.sortBy,
          user_id: user.id,
          semester_id: user.semester_id ?? undefined,
          from_date: rangeMeta.fromDate,
          to_date: rangeMeta.toDate,
        });

        const matchedItem =
          response.data.items.find(rangeMeta.matchItem) ??
          response.data.items[0] ??
          null;

        setSummaryTotals(getSummaryTotals(matchedItem));
      } catch (error) {
        setSummaryTotals({ total: 0, present: 0, late: 0, absent: 0 });

        if (!(error instanceof ApiError)) {
          Alert.alert("Load failed", "Unable to load attendance summary.");
        }
      } finally {
        setSummaryLoading(false);
      }
    }

    loadSummary();
  }, [selectedRange, user]);

  const sessionMap = useMemo(() => getSessionMap(sessions), [sessions]);
  const todaySubjectItems = useMemo(
    () => buildTodaySubjectItems(periods, attendances, sessionMap),
    [periods, attendances, sessionMap],
  );
  const subjectSummary = useMemo(() => {
    const monthlyAttendances = attendances.filter((attendance) => {
      const date = getAttendanceDate(attendance);
      return date ? isInCurrentMonth(date) : false;
    });

    return buildSubjectSummary(monthlyAttendances, sessionMap);
  }, [attendances, sessionMap]);
  const groupedHistory = useMemo(
    () => buildGroupedHistory(attendances, sessionMap),
    [attendances, sessionMap],
  );
  const selectedRangeMeta = useMemo(
    () => getSelectedRangeMeta(selectedRange),
    [selectedRange],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft
              size={20}
              color={theme.colors.heading}
              strokeWidth={2.3}
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>My Attendance</Text>
            <Text style={styles.subtitle}>
              Weekly summary and subject-wise history
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.accentStrong} />
            <Text style={styles.loadingText}>
              Loading attendance details...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.filterTabs}>
              {(["Day", "Month"] as const).map((option) => {
                const isActive = option === selectedRange;

                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.filterTab,
                      isActive && styles.filterTabActive,
                    ]}
                    onPress={() => setSelectedRange(option)}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        isActive && styles.filterTabTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>
                  {selectedRangeMeta.title}
                </Text>
                <View style={styles.summaryChip}>
                  <CalendarDays
                    size={14}
                    color={theme.colors.accentStrong}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.summaryChipText}>
                    {summaryTotals.total} classes
                  </Text>
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.statTile}>
                  <Check
                    size={18}
                    color={getStatusColors(theme, "present").fg}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.statValue}>
                    {summaryLoading ? "..." : summaryTotals.present}
                  </Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View
                  style={[
                    styles.statTile,
                    {
                      backgroundColor: getStatusColors(theme, "late").bg,
                    },
                  ]}
                >
                  <Clock3
                    size={18}
                    color={getStatusColors(theme, "late").fg}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.statValue}>
                    {summaryLoading ? "..." : summaryTotals.late}
                  </Text>
                  <Text style={styles.statLabel}>Leave Granted</Text>
                </View>
                <View
                  style={[
                    styles.statTile,
                    {
                      backgroundColor: getStatusColors(theme, "absent").bg,
                    },
                  ]}
                >
                  <XCircle
                    size={18}
                    color={getStatusColors(theme, "absent").fg}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.statValue}>
                    {summaryLoading ? "..." : summaryTotals.absent}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today&apos;s subjects</Text>
              {todaySubjectItems.length > 0 ? (
                todaySubjectItems.map((item) => {
                  const colors =
                    item.status === "not_marked"
                      ? {
                          bg: theme.colors.surfaceMuted,
                          fg: theme.colors.mutedText,
                          label: "Not marked",
                        }
                      : getStatusColors(theme, item.status);

                  return (
                    <View key={item.id} style={styles.todayRow}>
                      <View style={styles.todayRowText}>
                        <Text style={styles.todaySubjectName}>
                          {item.subjectName}
                        </Text>
                        <Text style={styles.todaySubjectTime}>
                          {item.timeLabel}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.todayStatusPill,
                          { backgroundColor: colors.bg },
                        ]}
                      >
                        <Text
                          style={[styles.todayStatusText, { color: colors.fg }]}
                        >
                          {colors.label}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No classes scheduled today</Text>
                  <Text style={styles.emptyCopy}>
                    Today&apos;s subject list will appear here when your timetable
                    has active periods for this day.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly by subject</Text>
              {subjectSummary.length > 0 ? (
                subjectSummary.map((subject) => {
                  return (
                    <MonthlySubjectAttendanceCard
                      key={subject.name}
                      subjectName={subject.name}
                      attended={subject.attended}
                      total={subject.total}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    No monthly attendance records yet
                  </Text>
                  <Text style={styles.emptyCopy}>
                    Subject-wise attendance cards will appear here as you attend
                    classes this month.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
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
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 36,
      gap: 18,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.mutedText,
    },
    loadingState: {
      paddingVertical: 80,
      alignItems: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.mutedText,
    },
    filterTabs: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      padding: 6,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterTab: {
      flex: 1,
      minHeight: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    filterTabActive: {
      backgroundColor: theme.colors.accentStrong,
    },
    filterTabText: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.heading,
    },
    filterTabTextActive: {
      color: theme.colors.accentContrast,
      fontWeight: "700",
    },
    summaryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    summaryTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    summaryChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    summaryChipText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.accentStrong,
    },
    summaryStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    statTile: {
      flex: 1,
      flexDirection: "column",
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 12,
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    statValue: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.heading,
      textAlign: "center",
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.mutedText,
      textAlign: "center",
    },
    section: {
      gap: 12,
    },
    todayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderRadius: 18,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    todayRowText: {
      flex: 1,
      gap: 4,
    },
    todaySubjectName: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.heading,
    },
    todaySubjectTime: {
      fontSize: 13,
      color: theme.colors.mutedText,
    },
    todayStatusPill: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    todayStatusText: {
      fontSize: 12,
      fontWeight: "800",
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    emptyCard: {
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 18,
      gap: 6,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    emptyCopy: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.mutedText,
    },
    historyGroup: {
      gap: 10,
    },
    groupLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.mutedText,
      textTransform: "uppercase",
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    historyText: {
      flex: 1,
      gap: 4,
    },
    historySubject: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.heading,
    },
    historyTime: {
      fontSize: 13,
      color: theme.colors.mutedText,
    },
    statusPill: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "800",
    },
  });
}
