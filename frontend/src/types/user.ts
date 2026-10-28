export type UserRole = "USER" | "TEACHER" | "MODERATOR" | "FINANCE" | "MANAGER" | "ADMIN" | "SUPERADMIN";

export interface User {
  id: string;
  /** Absent for accounts created through Telegram. */
  email?: string;
  name: string;
  phone?: string;
  role: UserRole;
  /** Sign-up number: shown as "user0001". Absent for a teacher (the number was freed for a new sign-up). */
  userNumber?: number;
  /** Only after the first course: shown as "student0001" (own sequence). */
  studentNumber?: number;
  /** Once the account was made a teacher: shown as "teacher0001". */
  teacherNumber?: number;
  /** Staff roles: shown as "admin0001", "manager0001", … (own sequence per role). */
  staffNumber?: number;
  avatarUrl?: string;
  /** undefined for accounts without an e-mail (Telegram). */
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  /** false: created through Telegram, sign-up not finished yet (no phone/password). */
  hasPassword?: boolean;
  /** Sign-in methods linked to the account (Settings -> linked accounts). */
  googleLinked?: boolean;
  /** The linked Google address / Telegram "@username" (or first name). */
  googleEmail?: string;
  telegramLinked?: boolean;
  telegramName?: string;
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
