import type { Course } from "@/lib/api/course-service";
import { apiClient } from "@/lib/api/apiClient";

export type Semester = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  semester_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course?: Course | null;
};

export type SaveSemesterPayload = {
  course_id: number;
  title: string;
  description?: string | null;
  semester_number: number;
  is_active?: boolean;
};

export type UpdateSemesterPayload = Partial<SaveSemesterPayload>;

export type SemesterMutationResponse = {
  message: string;
  data: Semester;
};

export type SemesterDeleteResponse = {
  message: string;
};

export const semesterService = {
  getSemesters() {
    return apiClient.get<Semester[]>("/semesters");
  },

  getSemester(id: number | string) {
    return apiClient.get<Semester>(`/semesters/${id}`);
  },

  createSemester(payload: SaveSemesterPayload) {
    return apiClient.post<SemesterMutationResponse>("/semesters", payload);
  },

  updateSemester(id: number | string, payload: UpdateSemesterPayload) {
    return apiClient.put<SemesterMutationResponse>(`/semesters/${id}`, payload);
  },

  deleteSemester(id: number | string) {
    return apiClient.delete<SemesterDeleteResponse>(`/semesters/${id}`);
  },
};

export const {
  getSemesters,
  getSemester,
  createSemester,
  updateSemester,
  deleteSemester,
} = semesterService;
