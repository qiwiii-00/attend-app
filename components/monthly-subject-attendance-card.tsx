import { StyleSheet, Text, View } from "react-native";

type MonthlySubjectAttendanceCardProps = {
  subjectName: string;
  attended: number;
  total: number;
};

export function MonthlySubjectAttendanceCard({
  subjectName,
  attended,
  total,
}: MonthlySubjectAttendanceCardProps) {
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E1F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: "#16345F",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    color: "#1C1C1C",
  },
  summaryText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1C1C1C",
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD6F3",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#314A80",
  },
});
