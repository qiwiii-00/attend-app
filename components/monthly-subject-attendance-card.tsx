import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type MonthlySubjectAttendanceCardProps = {
  subjectName: string;
  attended: number;
  total: number;
};

type Theme = (typeof AppTheme)["light"];

export function MonthlySubjectAttendanceCard({
  subjectName,
  attended,
  total,
}: MonthlySubjectAttendanceCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const progress = total > 0 ? Math.min(attended / total, 1) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.subjectName} numberOfLines={1}>
          {subjectName}
        </Text>
        <Text style={styles.summaryText}>
          {attended}/{total}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
      ...theme.shadow.soft,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    subjectName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.heading,
    },
    summaryText: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.heading,
    },
    progressTrack: {
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: theme.colors.accentStrong,
    },
  });
}
