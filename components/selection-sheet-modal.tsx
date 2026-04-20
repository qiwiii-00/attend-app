import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type OptionItem = {
  label: string;
  value: number | string;
  subtitle?: string | null;
};

type SelectionSheetModalProps = {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedValue?: number | string | null;
  onSelect: (value: number | string) => void;
  onClose: () => void;
};

type Theme = (typeof AppTheme)["light"];

export function SelectionSheetModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SelectionSheetModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const translateY = useRef(new Animated.Value(320)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    translateY.setValue(320);
    overlayOpacity.setValue(0);
  }, [overlayOpacity, translateY, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons
                name="close-outline"
                size={24}
                color={theme.colors.mutedText}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {options.map((option) => {
              const selected = selectedValue === option.value;

              return (
                <Pressable
                  key={String(option.value)}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.subtitle ? (
                      <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={theme.colors.accentStrong}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.38)",
    },
    sheet: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
      maxHeight: "72%",
      borderTopWidth: 1,
      borderColor: theme.colors.border,
    },
    handle: {
      alignSelf: "center",
      width: 48,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      marginBottom: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.heading,
    },
    content: {
      gap: 12,
      paddingBottom: 8,
    },
    option: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: theme.colors.card,
    },
    optionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surfaceMuted,
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.heading,
    },
    optionLabelSelected: {
      color: theme.colors.accentStrong,
    },
    optionSubtitle: {
      fontSize: 13,
      color: theme.colors.mutedText,
    },
  });
}
