export type UserRole = "USER" | "TEACHER" | "MODERATOR" | "FINANCE" | "ADMIN" | "SUPERADMIN";

export interface User {
  id: string;
  /** Absent for accounts created through Telegram. */
  email?: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  /** undefined for accounts without an e-mail (Telegram). */
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
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
  /** Short-lived access token, kept in memory only. */
  token: string;
  /** Sign-up only: what really happened to the verification e-mail. */
  emailVerification?: EmailDelivery;
}

export interface EmailDelivery {
  sent: boolean;
  mailConfigured: boolean;
}

export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeToken: string;
}

export type LoginResult = AuthResponse | TwoFactorChallenge;

export interface TwoFactorStatus {
  available: boolean;
  enabled: boolean;
  enabledAt?: string | null;
  recoveryCodesLeft: number;
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
