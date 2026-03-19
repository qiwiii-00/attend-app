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
};

export type Course = {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  semesters?: Semester[];
};

export type SaveCoursePayload = {
  title: string;
  description?: string | null;
  is_active?: boolean;
};

export type UpdateCoursePayload = Partial<SaveCoursePayload>;

export type CourseMutationResponse = {
  message: string;
  data: Course;
};

export type CourseDeleteResponse = {
  message: string;
};

export const courseService = {
  getCourses() {
    return apiClient.get<Course[]>("/courses");
  },

  getCourse(id: number | string) {
    return apiClient.get<Course>(`/courses/${id}`);
  },

  createCourse(payload: SaveCoursePayload) {
    return apiClient.post<CourseMutationResponse>("/courses", payload);
  },

  updateCourse(id: number | string, payload: UpdateCoursePayload) {
    return apiClient.put<CourseMutationResponse>(`/courses/${id}`, payload);
  },

  deleteCourse(id: number | string) {
    return apiClient.delete<CourseDeleteResponse>(`/courses/${id}`);
  },
};

export const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} = courseService;
