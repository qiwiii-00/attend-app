import { apiClient } from "@/lib/api/apiClient";
import type { Course } from "@/lib/api/course-service";
import type { Semester } from "@/lib/api/semester-service";
import type { User } from "@/lib/api/user-service";

export const ATTENDANCE_SESSION_API_ROUTES = {
  attendanceSessions: "/attendance-sessions",
  attendanceSessionById: (id: number | string) => `/attendance-sessions/${id}`,
} as const;

export type AttendanceSessionStatus = "active" | "expired";

export type AttendanceSessionSubject = {
  id: number;
  course_id: number;
  semester_id: number;
  period_id: number;
  title: string;
  code?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AttendanceSessionPeriod = {
  id: number;
  course_id: number;
  semester_id: number;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AttendanceSessionRecord = {
  id: number;
  course_id: number;
  semester_id: number;
  subject_id: number;
  period_id: number;
  starts_at: string;
  ends_at: string;
  created_by: number;
  status: AttendanceSessionStatus;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course?: Course | null;
  semester?: Semester | null;
  subject?: AttendanceSessionSubject | null;
  period?: AttendanceSessionPeriod | null;
  creator?: User | null;
};

export type AttendanceSessionApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
  errors?: Record<string, string[]> | null;
};

export type SaveAttendanceSessionPayload = {
  course_id: number;
  semester_id: number;
  subject_id: number;
  period_id: number;
  starts_at: string;
  ends_at: string;
  created_by: number;
  status?: AttendanceSessionStatus;
  qr_token: string;
  is_active?: boolean;
};

export type UpdateAttendanceSessionPayload = Partial<SaveAttendanceSessionPayload>;

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const attendanceSessionService = {
  getAttendanceSessions() {
    return apiClient.get<AttendanceSessionApiResponse<AttendanceSessionRecord[]>>(
      ATTENDANCE_SESSION_API_ROUTES.attendanceSessions,
      sessionRequestOptions,
    );
  },

  getAttendanceSession(id: number | string) {
    return apiClient.get<AttendanceSessionApiResponse<AttendanceSessionRecord>>(
      ATTENDANCE_SESSION_API_ROUTES.attendanceSessionById(id),
      sessionRequestOptions,
    );
  },

  createAttendanceSession(payload: SaveAttendanceSessionPayload) {
    return apiClient.post<AttendanceSessionApiResponse<AttendanceSessionRecord>>(
      ATTENDANCE_SESSION_API_ROUTES.attendanceSessions,
      payload,
      sessionRequestOptions,
    );
  },

  updateAttendanceSession(
    id: number | string,
    payload: UpdateAttendanceSessionPayload,
  ) {
    return apiClient.put<AttendanceSessionApiResponse<AttendanceSessionRecord>>(
      ATTENDANCE_SESSION_API_ROUTES.attendanceSessionById(id),
      payload,
      sessionRequestOptions,
    );
  },

  deleteAttendanceSession(id: number | string) {
    return apiClient.delete<AttendanceSessionApiResponse<null>>(
      ATTENDANCE_SESSION_API_ROUTES.attendanceSessionById(id),
      sessionRequestOptions,
    );
  },
};

export const {
  getAttendanceSessions,
  getAttendanceSession,
  createAttendanceSession,
  updateAttendanceSession,
  deleteAttendanceSession,
} = attendanceSessionService;
