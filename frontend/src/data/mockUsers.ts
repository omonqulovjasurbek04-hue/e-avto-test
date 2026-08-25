import { User, UserProfile } from "../types/user";

export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Jasurbek Omonqulov",
    email: "student@eavto.uz",
    phone: "+998 90 123 45 67",
    role: "USER",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: "2025-01-10T10:00:00.000Z",
    updatedAt: "2025-02-15T12:00:00.000Z",
  },
  {
    id: "admin-1",
    name: "Bosh Administrator",
    email: "admin@eavto.uz",
    phone: "+998 99 999 00 11",
    role: "ADMIN",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: "2024-12-01T08:00:00.000Z",
    updatedAt: "2025-01-01T10:00:00.000Z",
  },
];

export const mockCurrentUserProfile: UserProfile = {
  ...mockUsers[0],
  stats: {
    totalTests: 28,
    passedTests: 24,
    failedTests: 4,
    averageScore: 92,
    completedLessons: 18,
    studyStreakDays: 7,
  },
};
