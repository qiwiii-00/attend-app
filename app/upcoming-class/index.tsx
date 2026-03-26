import { Check, ChevronLeft } from "lucide-react-native";
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
import { useSession } from "@/lib/auth-context";
import {
  getPeriodsByContext,
  type PeriodRecord,
} from "@/lib/api/period-service";
import { getSubjects, type SubjectRecord } from "@/lib/api/subject-service";

type DayOption = {
  key: string;
  date: Date;
  weekdayShort: string;
  dayNumber: string;
};

type ScheduleItem = {
  id: number;
  start_time: string;
  end_time: string;
  subjectName: string;
  subjectCode: string | null;
  state: "done" | "upcoming" | "inactive";
};

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function getWeekDays(baseDate = new Date()) {
  const current = new Date(baseDate);
  const currentDay = current.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(current);
  start.setDate(current.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: date.toISOString().slice(0, 10),
      date,
      weekdayShort: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
      }).format(date),
      dayNumber: new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
      }).format(date),
    } satisfies DayOption;
  });
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sortPeriods(periods: PeriodRecord[]) {
  return [...periods].sort((left, right) =>
    left.start_time.localeCompare(right.start_time),
  );
}

function isBeforeToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target < today;
}

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getWeekdayKey(date: Date) {
  return WEEKDAY_KEYS[date.getDay()];
}

function getSubjectForDate(
  period: PeriodRecord,
  subjects: SubjectRecord[],
  date: Date,
) {
  const weekday = getWeekdayKey(date);

  return subjects.find((subject) => subject.day_of_week === weekday)
    ?? subjects.find((subject) => subject.day_of_week === null)
    ?? undefined;
}

function getScheduleState(
  period: PeriodRecord,
  subject: SubjectRecord | undefined,
  date: Date,
) {
  if (!subject || !subject.is_active || !period.is_active) {
    return "inactive" as const;
  }

  if (isBeforeToday(date)) {
    return "done" as const;
  }

  if (!isToday(date)) {
    return "upcoming" as const;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(period.end_time) ? "done" : "upcoming";
}

function buildSchedule(
  periods: PeriodRecord[],
  subjects: SubjectRecord[],
  selectedDate: Date,
) {
  return sortPeriods(periods)
    .map((period) => {
      const matchingSubjects = subjects.filter(
        (subject) =>
          subject.period_id === period.id &&
          subject.course_id === period.course_id &&
          subject.semester_id === period.semester_id,
      );

      const subject = getSubjectForDate(period, matchingSubjects, selectedDate);

      if (!subject || !subject.is_active || !period.is_active) {
        return null;
      }

      return {
        id: period.id,
        start_time: period.start_time,
        end_time: period.end_time,
        subjectName: subject.name ?? period.name,
        subjectCode: subject.code ?? null,
        state: getScheduleState(period, subject, selectedDate),
      } satisfies ScheduleItem;
    })
    .filter((item): item is ScheduleItem => item !== null);
}

function getItemColors(state: ScheduleItem["state"]) {
  if (state === "done") {
    return {
      line: "#D2D8E5",
      iconBg: "#2D4A86",
      cardBg: "#CFD8F7",
      text: "#111111",
      muted: "#8C95A8",
    };
  }

  if (state === "inactive") {
    return {
      line: "#E0E3EA",
      iconBg: "#D9DCE4",
      cardBg: "#D8DAE0",
      text: "#A3A8B4",
      muted: "#AEB4C1",
    };
  }

  return {
    line: "#D2D8E5",
    iconBg: "#2D4A86",
    cardBg: "#CFD8F7",
    text: "#111111",
    muted: "#8C95A8",
  };
}

export default function UpcomingClassScreen() {
  const { user } = useSession();
  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDayKey, setSelectedDayKey] = useState(weekDays[0]?.key ?? "");
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);

      if (!user?.id) {
        setPeriods([]);
        setSubjects([]);
        setLoading(false);
        return;
      }

      try {
        const [periodResponse, subjectResponse] = await Promise.all([
          getPeriodsByContext({ user_id: user.id }),
          getSubjects(),
        ]);

        setPeriods(periodResponse.data.periods);
        setSubjects(
          subjectResponse.data.filter(
            (subject) =>
              subject.course_id === user.course_id &&
              subject.semester_id === user.semester_id,
          ),
        );
      } catch (error) {
        setPeriods([]);
        setSubjects([]);
        const message =
          error instanceof ApiError ? error.message : "Unable to load class schedule.";
        Alert.alert("Load failed", message);
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();
  }, [user]);

  const selectedDay = useMemo(
    () => weekDays.find((day) => day.key === selectedDayKey) ?? weekDays[0],
    [selectedDayKey, weekDays],
  );

  const scheduleItems = useMemo(() => {
    if (!selectedDay) {
      return [];
    }

    return buildSchedule(periods, subjects, selectedDay.date);
  }, [periods, selectedDay, subjects]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#111111" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.title}>Upcoming Class</Text>
        </View>

        <Text style={styles.monthTitle}>{formatMonth(selectedDay?.date ?? new Date())}</Text>

        <View style={styles.dayStrip}>
          {weekDays.map((day) => {
            const active = day.key === selectedDayKey;

            return (
              <Pressable
                key={day.key}
                style={[styles.dayChip, active && styles.dayChipActive]}
                onPress={() => setSelectedDayKey(day.key)}
              >
                <Text style={[styles.dayChipWeek, active && styles.dayChipWeekActive]}>
                  {day.weekdayShort}
                </Text>
                <Text style={[styles.dayChipDate, active && styles.dayChipDateActive]}>
                  {day.dayNumber}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dayHeader}>
          <Text style={styles.dayName}>
            {new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(selectedDay?.date ?? new Date())}
          </Text>
          <Text style={styles.dayDate}>{formatLongDate(selectedDay?.date ?? new Date())}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#2D4A86" />
            <Text style={styles.loadingText}>Loading schedule...</Text>
          </View>
        ) : scheduleItems.length > 0 ? (
          <View style={styles.timeline}>
            {scheduleItems.map((item, index) => {
              const colors = getItemColors(item.state);

              return (
                <View key={item.id} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.iconBg }]}>
                      {item.state === "done" || item.state === "upcoming" ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                    {index < scheduleItems.length - 1 ? (
                      <View style={[styles.timelineLine, { backgroundColor: colors.line }]} />
                    ) : null}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text style={[styles.timeText, { color: colors.muted }]}>
                      {item.start_time} - {item.end_time}
                    </Text>
                    <View style={[styles.classCard, { backgroundColor: colors.cardBg }]}>
                      <Text style={[styles.classTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.subjectName}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No classes scheduled</Text>
            <Text style={styles.emptyText}>
              No active classes were found for the selected day in your weekly timetable.
            </Text>
          </View>
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7FE",
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    color: "#111111",
  },
  monthTitle: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  dayStrip: {
    marginTop: 10,
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: "#d5e2fc",
    overflow: "hidden",
  },
  dayChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 2,
  },
  dayChipActive: {
    backgroundColor: "#29417b",
  },
  dayChipWeek: {
    fontSize: 14,
    color: "#9BA2B2",
  },
  dayChipWeekActive: {
    color: "#FFFFFF",
  },
  dayChipDate: {
    fontSize: 16,
    fontWeight: "500",
    color: "#B2B7C5",
  },
  dayChipDateActive: {
    color: "#FFFFFF",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginTop: 24,
  },
  dayName: {
    fontSize: 18,
    fontWeight: "400",
    color: "#111111",
  },
  dayDate: {
    fontSize: 15,
    color: "#3A3A3A",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#6C7487",
  },
  timeline: {
    marginTop: 16,
    gap: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 96,
  },
  timelineRail: {
    width: 24,
    alignItems: "center",
    marginRight: 14,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeText: {
    width: 86,
    fontSize: 11,
  },
  classCard: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  classTitle: {
    fontSize: 15,
    textAlign: "center",
  },
  emptyState: {
    marginTop: 28,
    borderRadius: 18,
    backgroundColor: "#F7F9FC",
    padding: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#71798B",
  },
});
