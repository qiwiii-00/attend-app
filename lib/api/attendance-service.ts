import { apiClient } from "@/lib/api/apiClient";

export const ATTENDANCE_API_ROUTES = {
  attendances: "/attendances",
  attendanceById: (id: number | string) => `/attendances/${id}`,
  scanStatic: "/attendance/scan-static",
} as const;

export type AttendanceStatus = "present" | "absent" | "late";

export type AttendanceSessionSummary = {
  id: number;
  course_id: number;
  semester_id: number;
  subject_id: number;
  period_id: number;
  starts_at: string;
  ends_at: string;
  created_by: number;
  status: string;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AttendanceRecord = {
  id: number;
  user_id: number;
  attendance_session_id: number;
  status: AttendanceStatus;
  scanned_at: string | null;
  device_id: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
  session?: AttendanceSessionSummary | null;
};

export type AttendanceApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
  errors?: Record<string, string[]> | null;
};

export type SaveAttendancePayload = {
  user_id: number;
  attendance_session_id: number;
  status: AttendanceStatus;
  scanned_at?: string | null;
  device_id?: string | null;
  ip_address?: string | null;
};

export type UpdateAttendancePayload = Partial<SaveAttendancePayload>;

export type ScanStaticAttendancePayload = {
  token: string;
  device_id?: string | null;
};

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const attendanceService = {
  getAttendances() {
    return apiClient.get<AttendanceApiResponse<AttendanceRecord[]>>(
      ATTENDANCE_API_ROUTES.attendances,
      sessionRequestOptions,
    );
  },

  getAttendance(id: number | string) {
    return apiClient.get<AttendanceApiResponse<AttendanceRecord>>(
      ATTENDANCE_API_ROUTES.attendanceById(id),
      sessionRequestOptions,
    );
  },

  createAttendance(payload: SaveAttendancePayload) {
    return apiClient.post<AttendanceApiResponse<AttendanceRecord>>(
      ATTENDANCE_API_ROUTES.attendances,
      payload,
      sessionRequestOptions,
    );
  },

  updateAttendance(id: number | string, payload: UpdateAttendancePayload) {
    return apiClient.put<AttendanceApiResponse<AttendanceRecord>>(
      ATTENDANCE_API_ROUTES.attendanceById(id),
      payload,
      sessionRequestOptions,
    );
  },

  deleteAttendance(id: number | string) {
    return apiClient.delete<AttendanceApiResponse<null>>(
      ATTENDANCE_API_ROUTES.attendanceById(id),
      sessionRequestOptions,
    );
  },

  scanStatic(payload: ScanStaticAttendancePayload) {
    return apiClient.post<AttendanceApiResponse<AttendanceRecord>>(
      ATTENDANCE_API_ROUTES.scanStatic,
      payload,
      sessionRequestOptions,
    );
  },
};

export const {
  getAttendances,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  scanStatic,
} = attendanceService;
