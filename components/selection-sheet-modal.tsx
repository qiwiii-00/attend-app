import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

export function SelectionSheetModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SelectionSheetModalProps) {
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
              <Ionicons name="close-outline" size={24} color="#334155" />
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
                      color="#2563EB"
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: "72%",
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
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
    color: "#0F172A",
  },
  content: {
    gap: 12,
    paddingBottom: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionSelected: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  optionLabelSelected: {
    color: "#1D4ED8",
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
});
