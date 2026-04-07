import { StyleSheet, Text, View } from "react-native";

export type WeeklyReportBar = {
  key: string;
  label: string;
  value: number;
  isToday: boolean;
};

type WeeklyReportCardProps = {
  bars: WeeklyReportBar[];
  summaryText: string;
  maxValue?: number;
};

const CHART_GROWTH_HEIGHT = 160;
const GRID_TOP_PADDING = 10;
const GRID_BOTTOM_PADDING = 24;

function getChartHeight(value: number, maxValue: number) {
  if (maxValue <= 0 || value <= 0) {
    return 0;
  }

  const normalized = Math.min(value, maxValue) / maxValue;
  return normalized * CHART_GROWTH_HEIGHT;
}

function getScaleLabels(maxValue: number) {
  return Array.from({ length: maxValue + 1 }, (_, index) => maxValue - index);
}

export function WeeklyReportCard({
  bars,
  summaryText,
  maxValue,
}: WeeklyReportCardProps) {
  const maxWeeklyValue = Math.max(
    maxValue ?? Math.max(...bars.map((bar) => bar.value), 1),
    1,
  );
  const scaleLabels = getScaleLabels(maxWeeklyValue);
  const activeBar =
    bars.find((bar) => bar.isToday) ??
    bars.reduce((maxBar, bar) => {
      return bar.value > maxBar.value ? bar : maxBar;
    }, bars[0]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Weekly Statistics</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>This Week</Text>
        </View>
      </View>

      <View style={styles.chartShell}>
        <View style={styles.scaleColumn}>
          {scaleLabels.map((label) => (
            <View key={label} style={styles.scaleRow}>
              <Text style={styles.scaleText}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartArea}>
          <View style={styles.gridOverlay} pointerEvents="none">
            {scaleLabels.map((label) => (
              <View key={`grid-${label}`} style={styles.gridRow}>
                <View style={styles.gridLine} />
              </View>
            ))}
          </View>

          <View style={styles.barsRow}>
            {bars.map((bar) => {
              const isActive = activeBar?.key === bar.key;

              return (
                <View key={bar.key} style={styles.barGroup}>
                  {isActive ? (
                    <View style={styles.tooltipWrap}>
                      <View style={styles.tooltipCard}>
                        <Text style={styles.tooltipValue}>{bar.value}</Text>
                        <Text style={styles.tooltipLabel}>
                          {bar.isToday ? "Today" : `${bar.label} report`}
                        </Text>
                      </View>
                      <View style={styles.tooltipDot} />
                    </View>
                  ) : (
                    <View style={styles.tooltipSpacer} />
                  )}

                  <View
                    style={[
                      styles.bar,
                      {
                        height: getChartHeight(bar.value, maxWeeklyValue),
                      },
                      isActive ? styles.barActive : styles.barMuted,
                    ]}
                  />
                  <Text
                    style={[styles.barLabel, isActive && styles.barLabelActive]}
                  >
                    {bar.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.summaryText}>{summaryText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EEF7",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C2434",
  },
  badge: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5EAF3",
    backgroundColor: "#FAFBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7A859A",
  },
  chartShell: {
    flexDirection: "row",
    marginTop: 14,
    minHeight: 240,
  },
  scaleColumn: {
    width: 26,
    paddingTop: GRID_TOP_PADDING,
    paddingBottom: GRID_BOTTOM_PADDING,
  },
  scaleRow: {
    flex: 1,
    justifyContent: "center",
  },
  scaleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A0B5",
  },
  chartArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EEF2F8",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 0,
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: GRID_TOP_PADDING,
    paddingBottom: GRID_BOTTOM_PADDING,
  },
  gridRow: {
    flex: 1,
    justifyContent: "center",
  },
  gridLine: {
    borderTopWidth: 1,
    borderTopColor: "#F1F4FA",
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 0,
  },
  barGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  tooltipWrap: {
    height: 74,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  tooltipSpacer: {
    height: 74,
  },
  tooltipCard: {
    minWidth: 98,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DEE6F2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  tooltipValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1C2434",
  },
  tooltipLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#7A859A",
  },
  tooltipDot: {
    marginTop: 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#6D47FF",
    borderWidth: 3,
    borderColor: "#D9CCFF",
  },
  bar: {
    width: "100%",
    maxWidth: 44,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barMuted: {
    backgroundColor: "#F2E8FF",
  },
  barActive: {
    backgroundColor: "#6D47FF",
    borderWidth: 1,
    borderColor: "#8766FF",
  },
  barLabel: {
    paddingBottom: 8,
    fontSize: 12,
    color: "#7A859A",
    fontWeight: "500",
  },
  barLabelActive: {
    color: "#4D5A73",
    fontWeight: "700",
  },
  summaryText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#667085",
  },
});
