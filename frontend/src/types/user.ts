export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  stats?: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageScore: number;
    completedLessons: number;
    studyStreakDays: number;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
