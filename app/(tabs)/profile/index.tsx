import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const personalItems = [
  { icon: "person", label: "Edit Profile" },
  { icon: "card", label: "Payment Method" },
  { icon: "lock-closed", label: "Old Password" },
  { icon: "lock-closed", label: "New Password" },
] as const;

export default function ProfileTabScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color="#111111" />
            </Pressable>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          <View style={styles.profileBlock}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>JW</Text>
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.name}>Jack William</Text>
            <Text style={styles.email}>jackwilliam1704@gmail.com</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            {personalItems.map((item) => (
              <Pressable key={item.label} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Ionicons name={item.icon} size={16} color="#18181B" />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </View>
                <Ionicons name="create-outline" size={16} color="#111111" />
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>

            <Pressable style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Ionicons name="location" size={16} color="#18181B" />
                <Text style={styles.itemLabel}>Edit Address</Text>
              </View>
              <Ionicons name="create-outline" size={16} color="#111111" />
            </Pressable>
          </View>

          <Pressable style={styles.updateButton}>
            <Text style={styles.updateButtonText}>Update</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E8F4F1",
  },
  screen: {
    flex: 1,
    backgroundColor: "#E8F4F1",
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 355,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    shadowColor: "#6B8E87",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
  },
  profileBlock: {
    alignItems: "center",
    marginTop: 18,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#ECECEC",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 14,
    fontSize: 27,
    fontWeight: "700",
    color: "#171717",
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: "#A1A1AA",
  },
  section: {
    marginTop: 28,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#171717",
  },
  itemRow: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#F6F6F7",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemLabel: {
    fontSize: 14,
    color: "#18181B",
    fontWeight: "500",
  },
  updateButton: {
    marginTop: 36,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
