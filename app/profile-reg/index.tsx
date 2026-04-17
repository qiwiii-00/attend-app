import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SelectionSheetModal } from "@/components/selection-sheet-modal";
import { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiError } from "@/lib/api/apiClient";
import { uploadAvatar } from "@/lib/api/cloudinary-service";
import { getCourses, type Course } from "@/lib/api/course-service";
import { getSemesters, type Semester } from "@/lib/api/semester-service";
import {
  createStaffDetail,
  getStaffDetails,
  type StaffDetailRecord,
  updateStaffDetail,
} from "@/lib/api/staff-detail-service";
import { useSession } from "@/lib/auth-context";
import { updateUser, type User } from "@/lib/api/user-service";

const roleOptions = ["Student", "Teacher", "Admin", "Receptionist"] as const;
const staffRoleOptions = roleOptions.filter((role) => role !== "Student");
type Theme = (typeof AppTheme)["light"];

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

function getInitials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getRoleFlags(role: (typeof roleOptions)[number]) {
  return {
    is_admin: role === "Admin",
    is_teacher: role === "Teacher",
    is_receptionist: role === "Receptionist",
  };
}

export default function ProfileCompleteScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user: sessionUser, refreshSession, syncUser } = useSession();
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
  const [staffDetailId, setStaffDetailId] = useState<number | null>(null);
  const [staffPosition, setStaffPosition] = useState("");
  const [staffPhone1, setStaffPhone1] = useState("");
  const [staffPhone2, setStaffPhone2] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const initializedUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [currentUser, courseResponse, semesterResponse, staffResponse] =
          await Promise.all([
            sessionUser ? Promise.resolve(sessionUser) : refreshSession(),
            getCourses(),
            getSemesters(),
            getStaffDetails(),
          ]);

        if (!currentUser) {
          setUser(null);
          return;
        }

        setUser(currentUser);
        setCourses(normalizeListResponse<Course>(courseResponse));
        setSemesters(normalizeListResponse<Semester>(semesterResponse));
        const currentStaffDetail =
          normalizeListResponse<StaffDetailRecord>(staffResponse).find(
            (staffDetail) => staffDetail.user_id === currentUser.id,
          ) ?? null;

        if (initializedUserIdRef.current !== currentUser.id) {
          setName(currentUser.name ?? "");
          setStudentId(currentUser.student_id ?? "");
          setSelectedRole(
            roleOptions.find((role) => role === currentUser.role) ?? "Student",
          );
          setSelectedCourseId(currentUser.course_id ?? null);
          setSelectedSemesterId(currentUser.semester_id ?? null);
          setStaffDetailId(currentStaffDetail?.id ?? null);
          setStaffPosition(currentStaffDetail?.position ?? "");
          setStaffPhone1(currentStaffDetail?.phone_1 ?? "");
          setStaffPhone2(currentStaffDetail?.phone_2 ?? "");
          setStaffNotes(currentStaffDetail?.notes ?? "");
          initializedUserIdRef.current = currentUser.id;
        }
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
  }, [refreshSession, sessionUser]);

  const availableSemesters = useMemo(() => {
    if (!selectedCourseId) {
      return [];
    }

    return semesters.filter(
      (semester) => semester.course_id === selectedCourseId,
    );
  }, [selectedCourseId, semesters]);

  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId,
  );
  const selectedSemester = semesters.find(
    (semester) => semester.id === selectedSemesterId,
  );
  const isStudentRole = selectedRole === "Student";
  const isStaffRole = !isStudentRole;

  async function handlePickAvatar() {
    if (uploadingAvatar) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to choose a profile image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      setUploadingAvatar(true);
      const response = await uploadAvatar({
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });

      setUser(response.data.user);
      syncUser(response.data.user);
    } catch (error) {
      if (error instanceof ApiError) {
        const validationMessage = error.errors
          ? Object.values(error.errors).flat()[0]
          : undefined;

        Alert.alert("Upload failed", validationMessage ?? error.message);
        return;
      }

      Alert.alert("Upload failed", "Unable to update your profile image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      Alert.alert(
        "Missing user",
        "No registered user was found for this step.",
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert("Missing fields", "Name is required.");
      return;
    }

    if (isStudentRole && !selectedCourseId) {
      Alert.alert("Missing fields", "Please select a course.");
      return;
    }

    if (isStudentRole && !selectedSemesterId) {
      Alert.alert("Missing fields", "Please select a semester.");
      return;
    }

    if (isStaffRole && !staffPosition.trim()) {
      Alert.alert("Missing fields", "Position is required for staff roles.");
      return;
    }

    try {
      setSaving(true);

      const response = await updateUser(user.id, {
        name: name.trim(),
        role: selectedRole,
        student_id: isStudentRole ? studentId.trim() || null : null,
        course_id: isStudentRole ? selectedCourseId : null,
        semester_id: isStudentRole ? selectedSemesterId : null,
      });

      setUser(response.data);
      syncUser(response.data);

      if (isStaffRole) {
        const payload = {
          user_id: response.data.id,
          position: staffPosition.trim() || null,
          phone_1: staffPhone1.trim() || null,
          phone_2: staffPhone2.trim() || null,
          notes: staffNotes.trim() || null,
          ...getRoleFlags(selectedRole),
        };

        const staffResponse = staffDetailId
          ? await updateStaffDetail(staffDetailId, payload)
          : await createStaffDetail(payload);

        setStaffDetailId(staffResponse.data.id);
        setStaffPosition(staffResponse.data.position ?? "");
        setStaffPhone1(staffResponse.data.phone_1 ?? "");
        setStaffPhone2(staffResponse.data.phone_2 ?? "");
        setStaffNotes(staffResponse.data.notes ?? "");
      }

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
          <ActivityIndicator size="large" color={theme.colors.accentStrong} />
          <Text style={styles.loadingText}>Loading your profile setup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Profile setup is unavailable</Text>
          <Text style={styles.emptyText}>
            Sign in again to continue completing your profile.
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
          <Text style={styles.title}>Finish setting up your profile</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <Pressable
              style={styles.avatarWrap}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
            >
              <View style={styles.avatar}>
                {user.avatar_url ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {getInitials(name || user.name)}
                  </Text>
                )}

                {uploadingAvatar ? (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.accentContrast}
                    />
                  </View>
                ) : null}
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons
                  name="camera-outline"
                  size={14}
                  color={theme.colors.accentContrast}
                />
              </View>
            </Pressable>

            <Text style={styles.avatarTitle}>Add your profile photo</Text>
            <Text style={styles.avatarHint}>
              {uploadingAvatar ? "Uploading image..." : ""}
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyField}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.colors.accentStrong}
              />
              <Text style={styles.readonlyValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputShell}>
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.colors.accentStrong}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={theme.colors.mutedText}
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
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={theme.colors.accentStrong}
                />
                <Text style={styles.selectorText}>{selectedRole}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.mutedText}
              />
            </Pressable>
          </View>
          {isStudentRole ? (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Student ID</Text>
                <View style={styles.inputShell}>
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={theme.colors.accentStrong}
                  />
                  <TextInput
                    value={studentId}
                    onChangeText={setStudentId}
                    placeholder="Student ID"
                    placeholderTextColor={theme.colors.mutedText}
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Course</Text>
                <Pressable
                  style={styles.selector}
                  onPress={() => setShowCourseModal(true)}
                >
                  <View style={styles.selectorLeft}>
                    <Ionicons
                      name="library-outline"
                      size={18}
                      color={theme.colors.accentStrong}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        !selectedCourse && styles.selectorPlaceholder,
                      ]}
                    >
                      {selectedCourse?.title ?? "Choose a course"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.mutedText}
                  />
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
                    <Ionicons
                      name="albums-outline"
                      size={18}
                      color={theme.colors.accentStrong}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        !selectedSemester && styles.selectorPlaceholder,
                      ]}
                    >
                      {selectedSemester?.title ?? "Choose a semester"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.mutedText}
                  />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Position</Text>
                <View style={styles.inputShell}>
                  <Ionicons
                    name="briefcase-outline"
                    size={18}
                    color={theme.colors.accentStrong}
                  />
                  <TextInput
                    value={staffPosition}
                    onChangeText={setStaffPosition}
                    placeholder={`Enter ${selectedRole.toLowerCase()} position`}
                    placeholderTextColor={theme.colors.mutedText}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Primary Phone</Text>
                <View style={styles.inputShell}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.accentStrong}
                  />
                  <TextInput
                    value={staffPhone1}
                    onChangeText={setStaffPhone1}
                    placeholder="Primary phone number"
                    placeholderTextColor={theme.colors.mutedText}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Secondary Phone</Text>
                <View style={styles.inputShell}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.accentStrong}
                  />
                  <TextInput
                    value={staffPhone2}
                    onChangeText={setStaffPhone2}
                    placeholder="Secondary phone number"
                    placeholderTextColor={theme.colors.mutedText}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputShell, styles.inputShellMultiline]}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={theme.colors.accentStrong}
                  />
                  <TextInput
                    value={staffNotes}
                    onChangeText={setStaffNotes}
                    placeholder="Add any helpful staff notes"
                    placeholderTextColor={theme.colors.mutedText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[styles.input, styles.multilineInput]}
                  />
                </View>
              </View>
            </>
          )}

          <Pressable
            style={[
              styles.primaryButton,
              saving && styles.primaryButtonDisabled,
            ]}
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
          subtitle: staffRoleOptions.includes(role) ? "Uses staff details" : undefined,
        }))}
        selectedValue={selectedRole}
        onSelect={(value) =>
          setSelectedRole(value as (typeof roleOptions)[number])
        }
        onClose={() => setShowRoleModal(false)}
      />

      <SelectionSheetModal
        visible={showCourseModal && isStudentRole}
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
        visible={showSemesterModal && isStudentRole}
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    hero: {
      borderRadius: theme.radius.xl,
      paddingHorizontal: 22,
      paddingVertical: 24,
      minHeight: 100,
      justifyContent: "flex-end",
    },
    eyebrow: {
      ...theme.typography.eyebrow,
      color: theme.colors.text,
      opacity: 0.84,
    },
    title: {
      marginTop: 8,
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.text,
    },
    card: {
      marginTop: -10,
      padding: 20,
      gap: 16,
    },
    avatarSection: {
      alignItems: "center",
      gap: 8,
      paddingBottom: 6,
    },
    avatarWrap: {
      position: "relative",
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitials: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.heading,
    },
    avatarLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(15, 23, 42, 0.35)",
    },
    cameraBadge: {
      position: "absolute",
      right: 0,
      bottom: 4,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.accentStrong,
      borderWidth: 2,
      borderColor: theme.colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.heading,
    },
    avatarHint: {
      fontSize: 13,
      color: theme.colors.mutedText,
      fontWeight: "500",
    },
    fieldBlock: {
      gap: 8,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.heading,
    },
    inputShell: {
      height: 56,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surfaceElevated,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    inputShellMultiline: {
      minHeight: 112,
      height: "auto",
      alignItems: "flex-start",
      paddingVertical: 14,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
    },
    multilineInput: {
      minHeight: 82,
    },
    readonlyField: {
      height: 56,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surfaceElevated,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    readonlyValue: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.heading,
      fontWeight: "600",
    },
    selector: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.surfaceElevated,
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
      color: theme.colors.heading,
      fontWeight: "600",
    },
    selectorPlaceholder: {
      color: theme.colors.mutedText,
      fontWeight: "500",
    },
    primaryButton: {
      marginTop: 8,
      height: 58,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accentStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: theme.colors.accentContrast,
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
      color: theme.colors.mutedText,
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
      color: theme.colors.heading,
      textAlign: "center",
    },
    emptyText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.mutedText,
      textAlign: "center",
    },
    secondaryButton: {
      marginTop: 20,
      height: 52,
      paddingHorizontal: 24,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: theme.colors.accentContrast,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
