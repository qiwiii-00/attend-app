import { apiClient } from "@/lib/api/apiClient";
import type { Course } from "@/lib/api/course-service";
import type { Semester } from "@/lib/api/semester-service";
import type { PeriodRecord } from "@/lib/api/period-service";

export const SUBJECT_API_ROUTES = {
  subjects: "/subjects",
  subjectById: (id: number | string) => `/subjects/${id}`,
} as const;

export type SubjectRecord = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  course_id: number | null;
  semester_id: number | null;
  period_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course?: Course | null;
  semester?: Semester | null;
  period?: PeriodRecord | null;
};

export type SubjectApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
  errors?: Record<string, string[]> | null;
};

export type SaveSubjectPayload = {
  name: string;
  code?: string | null;
  description?: string | null;
  course_id?: number | null;
  semester_id?: number | null;
  period_id?: number | null;
  is_active?: boolean;
};

export type UpdateSubjectPayload = Partial<SaveSubjectPayload>;

const sessionRequestOptions = {
  credentials: "include" as const,
};

export const subjectService = {
  getSubjects() {
    return apiClient.get<SubjectApiResponse<SubjectRecord[]>>(
      SUBJECT_API_ROUTES.subjects,
      sessionRequestOptions,
    );
  },

  getSubject(id: number | string) {
    return apiClient.get<SubjectApiResponse<SubjectRecord>>(
      SUBJECT_API_ROUTES.subjectById(id),
      sessionRequestOptions,
    );
  },

  createSubject(payload: SaveSubjectPayload) {
    return apiClient.post<SubjectApiResponse<SubjectRecord>>(
      SUBJECT_API_ROUTES.subjects,
      payload,
      sessionRequestOptions,
    );
  },

  updateSubject(id: number | string, payload: UpdateSubjectPayload) {
    return apiClient.put<SubjectApiResponse<SubjectRecord>>(
      SUBJECT_API_ROUTES.subjectById(id),
      payload,
      sessionRequestOptions,
    );
  },

  deleteSubject(id: number | string) {
    return apiClient.delete<SubjectApiResponse<null>>(
      SUBJECT_API_ROUTES.subjectById(id),
      sessionRequestOptions,
    );
  },
};

export const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
} = subjectService;
