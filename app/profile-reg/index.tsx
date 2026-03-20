import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiError } from "@/lib/api/apiClient";
import { useSession } from "@/lib/auth-context";
import { SelectionSheetModal } from "@/components/selection-sheet-modal";
import { getCourses, type Course } from "@/lib/api/course-service";
import { getSemesters, type Semester } from "@/lib/api/semester-service";
import { getUser, updateUser, type User } from "@/lib/api/user-service";

const roleOptions = [
  "Student",
  "Teacher",
  "Admin",
  "Receptionist",
] as const;

function showSuccessMessage(message: string) {
  Alert.alert("Success", message);
}

function normalizeListResponse<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

export default function ProfileCompleteScreen() {
  const { syncUser } = useSession();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<(typeof roleOptions)[number]>("Student");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(
    null,
  );
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const [userResponse, courseResponse, semesterResponse] =
          await Promise.all([
            getUser(userId),
            getCourses(),
            getSemesters(),
          ]);

        setUser(userResponse);
        setCourses(normalizeListResponse<Course>(courseResponse));
        setSemesters(normalizeListResponse<Semester>(semesterResponse));
        setName(userResponse.name ?? "");
        setStudentId(userResponse.student_id ?? "");
        setSelectedCourseId(userResponse.course_id ?? null);
        setSelectedSemesterId(userResponse.semester_id ?? null);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load profile data.";
        Alert.alert("Load failed", message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  const availableSemesters = useMemo(() => {
    if (!selectedCourseId) {
      return [];
    }

    return semesters.filter((semester) => semester.course_id === selectedCourseId);
  }, [selectedCourseId, semesters]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedSemester = semesters.find(
    (semester) => semester.id === selectedSemesterId,
  );

  async function handleSave() {
    if (!userId) {
      Alert.alert("Missing user", "No registered user was found for this step.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Missing fields", "Name is required.");
      return;
    }

    if (!selectedCourseId) {
      Alert.alert("Missing fields", "Please select a course.");
      return;
    }

    if (!selectedSemesterId) {
      Alert.alert("Missing fields", "Please select a semester.");
      return;
    }

    try {
      setSaving(true);

      const response = await updateUser(userId, {
        name: name.trim(),
        student_id: studentId.trim() || null,
        course_id: selectedCourseId,
        semester_id: selectedSemesterId,
      });

      setUser(response.data);
      syncUser(response.data);

      showSuccessMessage("Profile completed");
      router.replace("/(tabs)/home" as Href);
    } catch (error) {
      if (error instanceof ApiError) {
        const validationMessage = error.errors
          ? Object.values(error.errors).flat()[0]
          : undefined;

        Alert.alert("Save failed", validationMessage ?? error.message);
        return;
      }

      Alert.alert("Save failed", "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your profile setup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Profile setup is unavailable</Text>
          <Text style={styles.emptyText}>
            This screen only opens after a successful registration.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.secondaryButtonText}>Back to Register</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Profile Completion</Text>
          <Text style={styles.title}>Finish setting up your student profile</Text>
          <Text style={styles.subtitle}>
            Add your details and choose your course and semester before entering
            the app.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyField}>
              <Ionicons name="mail-outline" size={18} color="#2563EB" />
              <Text style={styles.readonlyValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputShell}>
              <Ionicons name="person-outline" size={18} color="#2563EB" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Student ID</Text>
            <View style={styles.inputShell}>
              <Ionicons name="card-outline" size={18} color="#2563EB" />
              <TextInput
                value={studentId}
                onChangeText={setStudentId}
                placeholder="Student ID"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Role</Text>
            <Pressable
              style={styles.selector}
              onPress={() => setShowRoleModal(true)}
            >
              <View style={styles.selectorLeft}>
                <Ionicons name="people-outline" size={18} color="#2563EB" />
                <Text style={styles.selectorText}>{selectedRole}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Course</Text>
            <Pressable
              style={styles.selector}
              onPress={() => setShowCourseModal(true)}
            >
              <View style={styles.selectorLeft}>
                <Ionicons name="library-outline" size={18} color="#2563EB" />
                <Text
                  style={[
                    styles.selectorText,
                    !selectedCourse && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedCourse?.title ?? "Choose a course"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Semester</Text>
            <Pressable
              style={[
                styles.selector,
                !selectedCourseId && styles.selectorDisabled,
              ]}
              onPress={() => {
                if (!selectedCourseId) {
                  Alert.alert(
                    "Select course first",
                    "Choose a course before selecting a semester.",
                  );
                  return;
                }

                setShowSemesterModal(true);
              }}
            >
              <View style={styles.selectorLeft}>
                <Ionicons name="albums-outline" size={18} color="#2563EB" />
                <Text
                  style={[
                    styles.selectorText,
                    !selectedSemester && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedSemester?.title ?? "Choose a semester"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Saving..." : "Complete Profile"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SelectionSheetModal
        visible={showRoleModal}
        title="Select Role"
        options={roleOptions.map((role) => ({
          value: role,
          label: role,
        }))}
        selectedValue={selectedRole}
        onSelect={(value) =>
          setSelectedRole(value as (typeof roleOptions)[number])
        }
        onClose={() => setShowRoleModal(false)}
      />

      <SelectionSheetModal
        visible={showCourseModal}
        title="Select Course"
        options={courses.map((course) => ({
          value: course.id,
          label: course.title,
          subtitle: course.description,
        }))}
        selectedValue={selectedCourseId}
        onSelect={(value) => {
          const nextCourseId = Number(value);
          setSelectedCourseId(nextCourseId);
          setSelectedSemesterId(null);
        }}
        onClose={() => setShowCourseModal(false)}
      />

      <SelectionSheetModal
        visible={showSemesterModal}
        title="Select Semester"
        options={availableSemesters.map((semester) => ({
          value: semester.id,
          label: semester.title,
          subtitle: `Semester ${semester.semester_number}`,
        }))}
        selectedValue={selectedSemesterId}
        onSelect={(value) => setSelectedSemesterId(Number(value))}
        onClose={() => setShowSemesterModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#DCE8FF",
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#93C5FD",
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#BFDBFE",
  },
  card: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  inputShell: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBE4F0",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  readonlyField: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readonlyValue: {
    flex: 1,
    fontSize: 15,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  selector: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBE4F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectorDisabled: {
    opacity: 0.7,
  },
  selectorLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  selectorPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  primaryButton: {
    marginTop: 8,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 15,
    color: "#334155",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 20,
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
