import { StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { useAppTheme } from "@/hooks/use-app-theme";

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

const CHART_HEIGHT = 160;

export function WeeklyReportCard({
  bars,
  summaryText,
  maxValue,
}: WeeklyReportCardProps) {
  const theme = useAppTheme();
  const isDark = theme.colors.background === "#121826";
  const styles = getStyles(theme);
  const maxWeeklyValue = Math.max(
    maxValue ?? Math.max(...bars.map((bar) => bar.value), 1),
    1,
  );
  const activeBar =
    bars.find((bar) => bar.isToday) ??
    bars.reduce((maxBar, bar) => {
      return bar.value > maxBar.value ? bar : maxBar;
    }, bars[0]);
  const chartData = bars.map((bar) => {
    const isActive = activeBar?.key === bar.key;

    return {
      value: bar.value,
      label: bar.label,
      frontColor: isActive
        ? isDark
          ? theme.colors.accent
          : theme.colors.accentStrong
        : isDark
          ? theme.colors.surfaceSoft
          : theme.colors.accentSoft,
      barBorderTopLeftRadius: 10,
      barBorderTopRightRadius: 10,
      barBorderColor: isActive
        ? isDark
          ? theme.colors.heading
          : theme.colors.accent
        : "transparent",
      barBorderWidth: isActive ? 2 : 0,
      barBorderRadius: 10,
      labelTextStyle: {
        color: isActive ? theme.colors.heading : theme.colors.mutedText,
        fontSize: 12,
        fontWeight: isActive ? ("700" as const) : ("500" as const),
      },
      topLabelComponentHeight: isActive ? 86 : 0,
      topLabelContainerStyle: isActive ? styles.topLabelContainer : undefined,
      topLabelComponent: isActive
        ? () => (
            <View style={styles.tooltipWrap}>
              <View style={styles.tooltipCard}>
                <Text style={styles.tooltipValue}>{bar.value}</Text>
                <Text style={styles.tooltipLabel}>
                  {bar.isToday ? "Today" : `${bar.label} report`}
                </Text>
              </View>
              <View style={styles.tooltipDot} />
            </View>
          )
        : undefined,
    };
  });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Weekly Statistics</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>This Week</Text>
        </View>
      </View>

      <View style={styles.chartArea}>
        <BarChart
          data={chartData}
          height={CHART_HEIGHT}
          overflowTop={72}
          maxValue={maxWeeklyValue}
          noOfSections={maxWeeklyValue}
          barWidth={32}
          spacing={18}
          initialSpacing={12}
          endSpacing={12}
          frontColor={theme.colors.accent}
          showGradient={false}
          yAxisTextStyle={styles.scaleText}
          xAxisLabelTextStyle={styles.barLabel}
          xAxisColor={theme.colors.borderSoft}
          yAxisColor={theme.colors.borderSoft}
          rulesColor={theme.colors.borderSoft}
          rulesType="solid"
          yAxisThickness={0}
          xAxisThickness={1}
          hideOrigin
          disablePress
          isAnimated={false}
          roundedTop
          roundedBottom={false}
        />
      </View>

      <Text style={styles.summaryText}>{summaryText}</Text>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useAppTheme>) {
  const isDark = theme.colors.background === "#121826";

  return StyleSheet.create({
    card: {
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      shadowColor: "#0F172A",
      shadowOpacity: isDark ? 0.22 : 0.08,
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
      color: theme.colors.heading,
    },
    badge: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.mutedText,
    },
    scaleText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.subtleText,
    },
    chartArea: {
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 14,
      marginTop: 14,
      paddingHorizontal: 10,
      paddingTop: 12,
      paddingBottom: 8,
      overflow: "visible",
      backgroundColor: theme.colors.surfaceElevated,
      zIndex: 1,
    },
    tooltipWrap: {
      minHeight: 74,
      alignItems: "center",
      justifyContent: "flex-end",
      marginBottom: 4,
      zIndex: 30,
      elevation: 30,
    },
    topLabelContainer: {
      width: 120,
      alignItems: "center",
      zIndex: 30,
      elevation: 30,
      transform: [{ translateX: -44 }],
    },
    tooltipCard: {
      minWidth: 98,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: "center",
      shadowColor: "#0F172A",
      shadowOpacity: isDark ? 0.24 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
      zIndex: 31,
    },
    tooltipValue: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    tooltipLabel: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.mutedText,
    },
    tooltipDot: {
      marginTop: 7,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: isDark ? theme.colors.accent : theme.colors.accentStrong,
      borderWidth: 3,
      borderColor: isDark ? theme.colors.cardAccent : theme.colors.accentSoft,
      zIndex: 31,
    },
    barLabel: {
      fontSize: 12,
      color: theme.colors.mutedText,
      fontWeight: "500",
    },
    summaryText: {
      marginTop: 10,
      fontSize: 12,
      lineHeight: 18,
      color: theme.colors.mutedText,
    },
  });
}
