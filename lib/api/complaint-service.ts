import { apiClient } from "@/lib/api/apiClient";
import type { PeriodRecord } from "@/lib/api/period-service";
import type { SubjectRecord } from "@/lib/api/subject-service";
import type { User } from "@/lib/api/user-service";

export const COMPLAINT_API_ROUTES = {
  complaints: "/complaints",
  complaintById: (id: number | string) => `/complaints/${id}`,
} as const;

export type ComplaintStatus = "pending" | "approve" | "reject";

export type ComplaintRecord = {
  id: number;
  user_id: number | null;
  complaint_type: string;
  date_of_class: string;
  subject_id: number;
  period_id: number;
  reason: string;
  file_url: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  user?: User | null;
  subject?: SubjectRecord | null;
  period?: PeriodRecord | null;
};

export type ComplaintApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
  errors?: Record<string, string[]> | null;
};

export type SaveComplaintPayload = {
  complaint_type: string;
  date_of_class: string;
  subject_id: number;
  period_id: number;
  reason: string;
  file_url?: string | null;
};

export type UpdateComplaintPayload = Partial<SaveComplaintPayload>;
export type UpdateComplaintStatusPayload = UpdateComplaintPayload & {
  status?: ComplaintStatus;
};

export type ComplaintMutationResponse = ComplaintApiResponse<ComplaintRecord>;

export type ComplaintDeleteResponse = ComplaintApiResponse<null>;

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const complaintService = {
  getComplaints() {
    return apiClient.get<ComplaintApiResponse<ComplaintRecord[]>>(
      COMPLAINT_API_ROUTES.complaints,
      sessionRequestOptions,
    );
  },

  getComplaint(id: number | string) {
    return apiClient.get<ComplaintApiResponse<ComplaintRecord>>(
      COMPLAINT_API_ROUTES.complaintById(id),
      sessionRequestOptions,
    );
  },

  createComplaint(payload: SaveComplaintPayload) {
    return apiClient.post<ComplaintMutationResponse>(
      COMPLAINT_API_ROUTES.complaints,
      payload,
      sessionRequestOptions,
    );
  },

  updateComplaint(id: number | string, payload: UpdateComplaintStatusPayload) {
    return apiClient.put<ComplaintMutationResponse>(
      COMPLAINT_API_ROUTES.complaintById(id),
      payload,
      sessionRequestOptions,
    );
  },

  deleteComplaint(id: number | string) {
    return apiClient.delete<ComplaintDeleteResponse>(
      COMPLAINT_API_ROUTES.complaintById(id),
      sessionRequestOptions,
    );
  },
};

export const {
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
} = complaintService;
