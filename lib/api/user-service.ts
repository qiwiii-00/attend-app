import type { Course } from "@/lib/api/course-service";
import type { Semester } from "./semester-service";
import { apiClient } from "@/lib/api/apiClient";

export type User = {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  student_id: string | null;
  phone?: string | null;
  roll_no?: string | null;
  course_id: number | null;
  semester_id: number | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  course?: Course | null;
  semester?: Semester | null;
};

export type SaveUserPayload = {
  name: string;
  email: string;
  password: string;
  role?: string | null;
  student_id?: string | null;
  phone?: string | null;
  roll_no?: string | null;
  course_id?: number | null;
  semester_id?: number | null;
  is_active?: boolean;
};

export type UpdateUserPayload = Partial<SaveUserPayload>;

export type UserMutationResponse = {
  message: string;
  data: User;
};

export type UserDeleteResponse = {
  message: string;
};

export const userService = {
  getUsers() {
    return apiClient.get<User[]>("/users");
  },

  getUser(id: number | string) {
    return apiClient.get<User>(`/users/${id}`);
  },

  createUser(payload: SaveUserPayload) {
    return apiClient.post<UserMutationResponse>("/users", payload);
  },

  updateUser(id: number | string, payload: UpdateUserPayload) {
    return apiClient.put<UserMutationResponse>(`/users/${id}`, payload);
  },

  deleteUser(id: number | string) {
    return apiClient.delete<UserDeleteResponse>(`/users/${id}`);
  },
};

export const { getUsers, getUser, createUser, updateUser, deleteUser } =
  userService;
