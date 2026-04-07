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

    const dateKey = date.toISOString().slice(0, 10);
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

function getWeeklyWindow() {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getSummaryTotals(item?: AttendanceSummaryItem | null): AttendanceSummaryTotals {
  return {
    total: item?.total_count ?? 0,
    present: item?.present_count ?? 0,
    late: item?.late_count ?? 0,
    absent: item?.absent_count ?? 0,
  };
}

function getStatusColors(status: AttendanceRecord["status"]) {
  if (status === "present") {
    return { bg: "#EAF8EE", fg: "#207A3C", label: "Present" };
  }

  if (status === "late") {
    return { bg: "#FFF3DB", fg: "#A66200", label: "Late" };
  }

  return { bg: "#FFE7E7", fg: "#B33535", label: "Absent" };
}

export default function AttendanceScreen() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionRecord[]>([]);
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
        const [attendanceResponse, sessionResponse] = await Promise.all([
          getAttendances(),
          getAttendanceSessions(),
        ]);

        setAttendances(
          attendanceResponse.data
            .filter((attendance) => attendance.user_id === user.id)
            .sort((left, right) =>
              right.created_at.localeCompare(left.created_at),
            ),
        );
        setSessions(sessionResponse.data);
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
          response.data.items.find(rangeMeta.matchItem) ?? response.data.items[0] ?? null;

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
  const subjectSummary = useMemo(
    () => buildSubjectSummary(attendances, sessionMap),
    [attendances, sessionMap],
  );
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
            <ArrowLeft size={20} color="#111111" strokeWidth={2.3} />
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
            <ActivityIndicator size="large" color="#39508A" />
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
                <Text style={styles.summaryTitle}>{selectedRangeMeta.title}</Text>
                <View style={styles.summaryChip}>
                  <CalendarDays size={14} color="#39508A" strokeWidth={2.2} />
                  <Text style={styles.summaryChipText}>
                    {summaryTotals.total} classes
                  </Text>
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={[styles.statTile, { backgroundColor: "#EAF8EE" }]}>
                  <Check size={18} color="#207A3C" strokeWidth={2.5} />
                  <Text style={styles.statValue}>
                    {summaryLoading ? "..." : summaryTotals.present}
                  </Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: "#FFF3DB" }]}>
                  <Clock3 size={18} color="#A66200" strokeWidth={2.5} />
                  <Text style={styles.statValue}>
                    {summaryLoading ? "..." : summaryTotals.late}
                  </Text>
                  <Text style={styles.statLabel}>Late</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: "#FFE7E7" }]}>
                  <XCircle size={18} color="#B33535" strokeWidth={2.5} />
                  <Text style={styles.statValue}>
                    {summaryLoading ? "..." : summaryTotals.absent}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>By subject</Text>
              {subjectSummary.length > 0 ? (
                subjectSummary.map((subject) => {
                  const percentage =
                    subject.total > 0
                      ? Math.round((subject.attended / subject.total) * 100)
                      : 0;

                  return (
                    <View key={subject.name} style={styles.subjectCard}>
                      <View style={styles.subjectTopRow}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        <Text style={styles.subjectMeta}>
                          {subject.attended}/{subject.total}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${percentage}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.subjectPercent}>
                        {percentage}% attendance
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    No attendance records yet
                  </Text>
                  <Text style={styles.emptyCopy}>
                    Scan a class QR to start building your report.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent history</Text>
              {groupedHistory.length > 0
                ? groupedHistory.map((group) => (
                    <View key={group.dateKey} style={styles.historyGroup}>
                      <Text style={styles.groupLabel}>{group.dateLabel}</Text>
                      {group.items.map((item) => {
                        const status = getStatusColors(item.status);

                        return (
                          <View key={item.id} style={styles.historyRow}>
                            <View style={styles.historyText}>
                              <Text style={styles.historySubject}>
                                {item.subjectName}
                              </Text>
                              <Text style={styles.historyTime}>
                                {item.timeLabel}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusPill,
                                { backgroundColor: status.bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  { color: status.fg },
                                ]}
                              >
                                {status.label}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))
                : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F4F6FB",
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
    color: "#111111",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#596273",
  },
  loadingState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#667085",
  },
  filterTabs: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCE7F1",
    borderRadius: 999,
    padding: 6,
    gap: 6,
  },
  filterTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  filterTabActive: {
    backgroundColor: "#171717",
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#171717",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#F3F6FF",
    borderRadius: 24,
    padding: 18,
    gap: 16,
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
    color: "#111111",
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#39508A",
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111111",
  },
  statLabel: {
    fontSize: 13,
    color: "#4B5563",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
  },
  subjectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9EDF5",
    gap: 10,
  },
  subjectTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subjectName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  subjectMeta: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5C6780",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5EBFA",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#6E8FD6",
  },
  subjectPercent: {
    fontSize: 12,
    color: "#5C6780",
  },
  emptyCard: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#667085",
  },
  historyGroup: {
    gap: 10,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#5C6780",
    textTransform: "uppercase",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E9EDF5",
  },
  historyText: {
    flex: 1,
    gap: 4,
  },
  historySubject: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  historyTime: {
    fontSize: 13,
    color: "#667085",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
