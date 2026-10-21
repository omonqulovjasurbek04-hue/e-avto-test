export type UserRole = "USER" | "TEACHER" | "MODERATOR" | "FINANCE" | "MANAGER" | "ADMIN" | "SUPERADMIN";

export interface User {
  id: string;
  /** Absent for accounts created through Telegram. */
  email?: string;
  name: string;
  phone?: string;
  role: UserRole;
  /** Sign-up number, every account: shown as "user0001". */
  userNumber?: number;
  /** Only after the first bought course: shown as "student0001". */
  studentNumber?: number;
  avatarUrl?: string;
  /** undefined for accounts without an e-mail (Telegram). */
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  /** false: created through Telegram, sign-up not finished yet (no phone/password). */
  hasPassword?: boolean;
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

/** Sign in with the phone number; e-mail still works for staff and older accounts. */
export interface LoginPayload {
  phone?: string;
  email?: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email?: string;
  password: string;
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
