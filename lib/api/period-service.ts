import { apiClient } from "@/lib/api/apiClient";
import type { Course } from "@/lib/api/course-service";
import type { Semester } from "@/lib/api/semester-service";

export const PERIOD_API_ROUTES = {
  periods: "/periods",
  periodsByContext: "/periods/by-context",
  periodById: (id: number | string) => `/periods/${id}`,
} as const;

export type PeriodRecord = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  course_id: number | null;
  semester_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course?: Course | null;
  semester?: Semester | null;
};

export type PeriodContextData = {
  user_id: number;
  course_id: number;
  semester_id: number;
  periods: PeriodRecord[];
};

export type PeriodApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
  errors?: Record<string, string[]> | null;
};

export type PeriodContextQuery = {
  user_id: number;
  course_id?: number | null;
  semester_id?: number | null;
};

export type SavePeriodPayload = {
  name: string;
  start_time: string;
  end_time: string;
  course_id?: number | null;
  semester_id?: number | null;
  is_active?: boolean;
};

export type UpdatePeriodPayload = Partial<SavePeriodPayload>;

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const periodService = {
  getPeriods() {
    return apiClient.get<PeriodApiResponse<PeriodRecord[]>>(
      PERIOD_API_ROUTES.periods,
      sessionRequestOptions,
    );
  },

  getPeriodsByContext(query: PeriodContextQuery) {
    return apiClient.get<PeriodApiResponse<PeriodContextData>>(
      PERIOD_API_ROUTES.periodsByContext,
      {
        ...sessionRequestOptions,
        query,
      },
    );
  },

  getPeriod(id: number | string) {
    return apiClient.get<PeriodApiResponse<PeriodRecord>>(
      PERIOD_API_ROUTES.periodById(id),
      sessionRequestOptions,
    );
  },

  createPeriod(payload: SavePeriodPayload) {
    return apiClient.post<PeriodApiResponse<PeriodRecord>>(
      PERIOD_API_ROUTES.periods,
      payload,
      sessionRequestOptions,
    );
  },

  updatePeriod(id: number | string, payload: UpdatePeriodPayload) {
    return apiClient.put<PeriodApiResponse<PeriodRecord>>(
      PERIOD_API_ROUTES.periodById(id),
      payload,
      sessionRequestOptions,
    );
  },

  deletePeriod(id: number | string) {
    return apiClient.delete<PeriodApiResponse<null>>(
      PERIOD_API_ROUTES.periodById(id),
      sessionRequestOptions,
    );
  },
};

export const {
  getPeriods,
  getPeriodsByContext,
  getPeriod,
  createPeriod,
  updatePeriod,
  deletePeriod,
} = periodService;
