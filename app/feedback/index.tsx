import * as Calendar from "expo-calendar";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { ChevronDown, ChevronLeft, CalendarDays, Upload, FileText } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { ApiError } from "@/lib/api/apiClient";
import { useSession } from "@/lib/auth-context";
import {
  getPeriodsByContext,
  type PeriodRecord,
} from "@/lib/api/period-service";
import { getSubjects, type SubjectRecord } from "@/lib/api/subject-service";

type FeedbackTab = "new" | "list";

type ComplaintTypeOption = {
  label: string;
  value: string;
};

type UploadedProof = {
  uri: string;
  name: string;
};

type SubmittedComplaint = {
  id: number;
  complaintType: string;
  dateOfClass: string;
  subjectName: string;
  timeLabel: string;
  reason: string;
  proofName: string | null;
  submittedAt: string;
  status: "Pending";
};

const complaintTypeOptions: ComplaintTypeOption[] = [
  { label: "Attendance mismatch", value: "Attendance mismatch" },
  { label: "Marked absent by mistake", value: "Marked absent by mistake" },
  { label: "Late marked incorrectly", value: "Late marked incorrectly" },
  { label: "QR scan issue", value: "QR scan issue" },
  { label: "Other attendance issue", value: "Other attendance issue" },
];

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function formatSubmittedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getSubjectMap(subjects: SubjectRecord[]) {
  return new Map(
    subjects
      .filter((subject) => typeof subject.period_id === "number")
      .map((subject) => [subject.period_id as number, subject]),
  );
}

function buildTimeOptions(periods: PeriodRecord[]) {
  return periods.map((period) => ({
    label: `${period.start_time} - ${period.end_time}`,
    value: String(period.id),
    subtitle: period.name,
  }));
}

function toDdMmYyyy(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

function parseDdMmYyyy(value: string) {
  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default function FeedbackScreen() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState<FeedbackTab>("new");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [complaintType, setComplaintType] = useState<string | null>(null);
  const [dateOfClass, setDateOfClass] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<UploadedProof | null>(null);
  const [submittedComplaints, setSubmittedComplaints] = useState<SubmittedComplaint[]>([]);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [showComplaintTypeModal, setShowComplaintTypeModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  useEffect(() => {
    async function loadContext() {
      if (!user?.id) {
        setPeriods([]);
        setSubjects([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [periodResponse, subjectResponse] = await Promise.all([
          getPeriodsByContext({ user_id: user.id }),
          getSubjects(),
        ]);

        const { course_id, semester_id, periods: periodItems } = periodResponse.data;

        setPeriods(periodItems);
        setSubjects(
          subjectResponse.data.filter(
            (subject) =>
              subject.course_id === course_id &&
              subject.semester_id === semester_id &&
              subject.is_active,
          ),
        );
      } catch (error) {
        setPeriods([]);
        setSubjects([]);
        const message =
          error instanceof ApiError ? error.message : "Unable to load complaint form data.";
        Alert.alert("Load failed", message);
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, [user]);

  const subjectMap = useMemo(() => getSubjectMap(subjects), [subjects]);
  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );
  const selectedSubject = selectedPeriod ? subjectMap.get(selectedPeriod.id) : undefined;
  const subjectOptions = useMemo(
    () =>
      periods.map((period) => {
        const subject = subjectMap.get(period.id);
        return {
          label: subject?.name ?? period.name,
          value: String(period.id),
          subtitle: `${period.start_time} - ${period.end_time}`,
        };
      }),
    [periods, subjectMap],
  );
  const timeOptions = useMemo(() => buildTimeOptions(periods), [periods]);

  async function handleOpenDatePicker() {
    try {
      const permission = await Calendar.requestCalendarPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Calendar permission required",
          "Allow calendar access if you want attendance dates to match your device calendar history.",
        );
      }
    } catch {
      // Keep the date picker available even if calendar permission lookup fails.
    }

    setShowNativeDatePicker(true);
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "dismissed") {
      setShowNativeDatePicker(false);
      return;
    }

    if (selectedDate) {
      setDateOfClass(toDdMmYyyy(selectedDate));
    }

    setShowNativeDatePicker(false);
  }

  async function handlePickProof() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to attach a supporting image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setProof({
        uri: asset.uri,
        name: asset.fileName ?? `proof-${Date.now()}.jpg`,
      });
    } catch {
      Alert.alert("Upload failed", "Unable to choose an image right now.");
    }
  }

  function resetForm() {
    setComplaintType(null);
    setDateOfClass("");
    setSelectedPeriodId(null);
    setReason("");
    setProof(null);
  }

  async function handleSubmit() {
    if (!complaintType) {
      Alert.alert("Missing field", "Please select a complaint type.");
      return;
    }

    if (!dateOfClass.trim()) {
      Alert.alert("Missing field", "Please enter the class date.");
      return;
    }

    if (!selectedPeriod) {
      Alert.alert("Missing field", "Please select the subject and time.");
      return;
    }

    if (!reason.trim()) {
      Alert.alert("Missing field", "Please enter the reason for your complaint.");
      return;
    }

    try {
      setSubmitting(true);

      const nextComplaint: SubmittedComplaint = {
        id: Date.now(),
        complaintType,
        dateOfClass: dateOfClass.trim(),
        subjectName: selectedSubject?.name ?? selectedPeriod.name,
        timeLabel: `${selectedPeriod.start_time} - ${selectedPeriod.end_time}`,
        reason: reason.trim(),
        proofName: proof?.name ?? null,
        submittedAt: new Date().toISOString(),
        status: "Pending",
      };

      setSubmittedComplaints((current) => [nextComplaint, ...current]);
      resetForm();
      setActiveTab("list");
      Alert.alert("Submitted", "Your complaint has been saved successfully.");
    } finally {
      setSubmitting(false);
    }
  }

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
          <Text style={styles.title}>Feedback</Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, activeTab === "new" && styles.tabButtonActive]}
            onPress={() => setActiveTab("new")}
          >
            <Text
              style={[styles.tabLabel, activeTab === "new" && styles.tabLabelActive]}
            >
              New Complaint
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "list" && styles.tabButtonActive]}
            onPress={() => setActiveTab("list")}
          >
            <Text
              style={[styles.tabLabel, activeTab === "list" && styles.tabLabelActive]}
            >
              My Complaints
            </Text>
          </Pressable>
        </View>

        {activeTab === "new" ? (
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#30497E" />
              <Text style={styles.loadingText}>Loading complaint form...</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Pressable
                style={styles.dropdownField}
                onPress={() => setShowComplaintTypeModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !complaintType && styles.placeholderText,
                  ]}
                >
                  {complaintType ?? "Select complaint type"}
                </Text>
                <ChevronDown size={18} color="#111111" strokeWidth={2.3} />
              </Pressable>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Class details</Text>

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Date of class</Text>
                    <View style={styles.inputShell}>
                      <TextInput
                        value={dateOfClass}
                        onChangeText={(text) => setDateOfClass(formatDateInput(text))}
                        placeholder="dd-mm-yyyy"
                        placeholderTextColor="#A3A8B4"
                        keyboardType="number-pad"
                        style={styles.textInput}
                        maxLength={10}
                      />
                      <Pressable
                        onPress={handleOpenDatePicker}
                        hitSlop={8}
                        style={styles.calendarIconButton}
                      >
                        <CalendarDays size={18} color="#8B90A0" strokeWidth={2.2} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Subject</Text>
                    <Pressable
                      style={styles.inputShell}
                      onPress={() => setShowSubjectModal(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !selectedSubject && !selectedPeriod && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedSubject?.name ?? selectedPeriod?.name ?? "Select"}
                      </Text>
                      <ChevronDown size={18} color="#8B90A0" strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fullField}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <Pressable
                    style={styles.inputShell}
                    onPress={() => setShowTimeModal(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !selectedPeriod && styles.placeholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedPeriod
                        ? `${selectedPeriod.start_time} - ${selectedPeriod.end_time}`
                        : "Select Time"}
                    </Text>
                    <ChevronDown size={18} color="#8B90A0" strokeWidth={2.2} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Reason for complaint</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Explain clearly why this attendance is incorrect. e.g. I was present but was marked absent, I have a medical certificate..."
                  placeholderTextColor="#A3A8B4"
                  multiline
                  textAlignVertical="top"
                  style={styles.reasonInput}
                />

                <Text style={[styles.sectionTitle, styles.supportingTitle]}>
                  Supporting document(optional)
                </Text>
                <View style={styles.uploadRow}>
                  <Pressable style={styles.uploadButton} onPress={handlePickProof}>
                    <Upload size={16} color="#fdfdfd" strokeWidth={2.2} />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </Pressable>
                  <Text
                    style={[styles.uploadHint, !proof && styles.placeholderText]}
                    numberOfLines={1}
                  >
                    {proof?.name ?? "Choose image"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? "Submitting..." : "Submit"}
                </Text>
              </Pressable>
            </View>
          )
        ) : submittedComplaints.length > 0 ? (
          <View style={styles.complaintList}>
            {submittedComplaints.map((complaint) => (
              <View key={complaint.id} style={styles.complaintCard}>
                <View style={styles.complaintHeader}>
                  <Text style={styles.complaintType}>{complaint.complaintType}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{complaint.status}</Text>
                  </View>
                </View>

                <Text style={styles.complaintMeta}>
                  {complaint.subjectName} - {complaint.timeLabel}
                </Text>
                <Text style={styles.complaintMeta}>
                  Class date {complaint.dateOfClass} - Submitted {formatSubmittedAt(complaint.submittedAt)}
                </Text>
                <Text style={styles.complaintReason}>{complaint.reason}</Text>

                {complaint.proofName ? (
                  <View style={styles.attachmentRow}>
                    <FileText size={15} color="#5C6480" strokeWidth={2.2} />
                    <Text style={styles.attachmentText}>{complaint.proofName}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No complaints yet</Text>
            <Text style={styles.emptyText}>
              Submit a new complaint and it will appear here for quick tracking.
            </Text>
          </View>
        )}
      </ScrollView>

      <SelectionSheetModal
        visible={showComplaintTypeModal}
        title="Select complaint type"
        options={complaintTypeOptions}
        selectedValue={complaintType}
        onSelect={(value) => setComplaintType(String(value))}
        onClose={() => setShowComplaintTypeModal(false)}
      />

      <SelectionSheetModal
        visible={showSubjectModal}
        title="Select subject"
        options={subjectOptions}
        selectedValue={selectedPeriodId ? String(selectedPeriodId) : null}
        onSelect={(value) => setSelectedPeriodId(Number(value))}
        onClose={() => setShowSubjectModal(false)}
      />

      <SelectionSheetModal
        visible={showTimeModal}
        title="Select time"
        options={timeOptions}
        selectedValue={selectedPeriodId ? String(selectedPeriodId) : null}
        onSelect={(value) => setSelectedPeriodId(Number(value))}
        onClose={() => setShowTimeModal(false)}
      />

      {showNativeDatePicker ? (
        <DateTimePicker
          value={dateOfClass ? parseDdMmYyyy(dateOfClass) : new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      ) : null}
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
    paddingBottom: 40,
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
  tabRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 26,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    backgroundColor: "#050505",
    borderColor: "#050505",
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  form: {
    marginTop: 16,
    gap: 12,
  },
  dropdownField: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#AEB6CA",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: "#111111",
  },
  placeholderText: {
    color: "#A3A8B4",
  },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: "#CCD4F1",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  fullField: {
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#30354A",
    marginBottom: 6,
  },
  inputShell: {
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#111111",
    paddingVertical: 0,
  },
  calendarIconButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonInput: {
    minHeight: 116,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 19,
    color: "#111111",
  },
  supportingTitle: {
    marginTop: 12,
    marginBottom: 10,
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  uploadButton: {
    minWidth: 92,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#2e82ff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e7e7e7",
  },
  uploadHint: {
    flex: 1,
    fontSize: 14,
    color: "#4C536B",
  },
  submitButton: {
    alignSelf: "center",
    width: 234,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#6496fb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
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
  complaintList: {
    marginTop: 18,
    gap: 12,
  },
  complaintCard: {
    borderRadius: 18,
    backgroundColor: "#F6F8FD",
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E6F4",
  },
  complaintHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  complaintType: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF0B3",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6A5400",
  },
  complaintMeta: {
    fontSize: 13,
    color: "#5C6480",
  },
  complaintReason: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1D2235",
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  attachmentText: {
    fontSize: 13,
    color: "#5C6480",
  },
  emptyState: {
    marginTop: 22,
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
