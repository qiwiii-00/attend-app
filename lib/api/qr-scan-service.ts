import { apiClient } from "@/lib/api/apiClient";
import type { AttendanceApiResponse, AttendanceRecord } from "@/lib/api/attendance-service";
import type { SemesterApiResponse, SemesterQrData } from "@/lib/api/semester-service";

export const QR_SCAN_API_ROUTES = {
  scanSemester: "/qr/scan-semester",
  semesterQr: (id: number | string) => `/semesters/${id}/qr`,
} as const;

export type ScanSemesterQrPayload = {
  token: string;
  device_id?: string | null;
};

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const qrScanService = {
  getSemesterQr(id: number | string) {
    return apiClient.get<SemesterApiResponse<SemesterQrData>>(
      QR_SCAN_API_ROUTES.semesterQr(id),
      sessionRequestOptions,
    );
  },

  scanSemesterQr(payload: ScanSemesterQrPayload) {
    return apiClient.post<AttendanceApiResponse<AttendanceRecord>>(
      QR_SCAN_API_ROUTES.scanSemester,
      payload,
      sessionRequestOptions,
    );
  },
};

export const { getSemesterQr, scanSemesterQr } = qrScanService;
