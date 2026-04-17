import { apiClient } from "@/lib/api/apiClient";
import type { User } from "@/lib/api/user-service";

export const STAFF_DETAIL_API_ROUTES = {
  staffDetails: "/staff-details",
  staffDetailById: (id: number | string) => `/staff-details/${id}`,
} as const;

export type StaffDetailRecord = {
  id: number;
  user_id: number;
  position: string | null;
  is_admin: boolean;
  is_teacher: boolean;
  is_receptionist: boolean;
  is_approved: boolean;
  phone_1: string | null;
  phone_2: string | null;
  approved_at: string | null;
  approved_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: User | null;
  approver?: User | null;
};

export type StaffDetailApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
  errors?: Record<string, string[]> | null;
};

export type SaveStaffDetailPayload = {
  user_id: number;
  position?: string | null;
  is_admin?: boolean;
  is_teacher?: boolean;
  is_receptionist?: boolean;
  is_approved?: boolean;
  phone_1?: string | null;
  phone_2?: string | null;
  approved_at?: string | null;
  approved_by?: number | null;
  notes?: string | null;
};

export type UpdateStaffDetailPayload = Partial<SaveStaffDetailPayload>;

export type StaffDetailMutationResponse =
  StaffDetailApiResponse<StaffDetailRecord>;

export type StaffDetailDeleteResponse = StaffDetailApiResponse<null>;

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const staffDetailService = {
  getStaffDetails() {
    return apiClient.get<StaffDetailApiResponse<StaffDetailRecord[]>>(
      STAFF_DETAIL_API_ROUTES.staffDetails,
      sessionRequestOptions,
    );
  },

  getStaffDetail(id: number | string) {
    return apiClient.get<StaffDetailApiResponse<StaffDetailRecord>>(
      STAFF_DETAIL_API_ROUTES.staffDetailById(id),
      sessionRequestOptions,
    );
  },

  createStaffDetail(payload: SaveStaffDetailPayload) {
    return apiClient.post<StaffDetailMutationResponse>(
      STAFF_DETAIL_API_ROUTES.staffDetails,
      payload,
      sessionRequestOptions,
    );
  },

  updateStaffDetail(id: number | string, payload: UpdateStaffDetailPayload) {
    return apiClient.put<StaffDetailMutationResponse>(
      STAFF_DETAIL_API_ROUTES.staffDetailById(id),
      payload,
      sessionRequestOptions,
    );
  },

  deleteStaffDetail(id: number | string) {
    return apiClient.delete<StaffDetailDeleteResponse>(
      STAFF_DETAIL_API_ROUTES.staffDetailById(id),
      sessionRequestOptions,
    );
  },
};

export const {
  getStaffDetails,
  getStaffDetail,
  createStaffDetail,
  updateStaffDetail,
  deleteStaffDetail,
} = staffDetailService;
