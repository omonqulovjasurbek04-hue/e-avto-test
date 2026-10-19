import { apiGet, apiPut } from "./api";
import { authService } from "./auth.service";
import { env } from "../config/env";
import type { User, UserProfile, UpdateProfilePayload } from "../types/user";
import type { Leaderboard, LeaderboardSort, ProgressStats, TestResultSummary } from "../types/result";

interface ApiStatistics {
  totalTests: number;
  averageScore: number;
  bestScore: number;
  passedTests: number;
  failedTests: number;
  completedLessons: number;
  studyStreakDays: number;
  learningTime: number;
}

interface ApiCourseProgress {
  pct: number;
}

const WEEKDAYS_BACK = 7;

/** Counts finished tests per day for the last 7 days. */
function weeklyActivity(results: TestResultSummary[]): ProgressStats["weekly"] {
  const days: ProgressStats["weekly"] = [];
  for (let i = WEEKDAYS_BACK - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      count: results.filter((r) => new Date(r.createdAt).toDateString() === key).length,
    });
  }
  return days;
}

export const userService = {
  async getProfile(): Promise<UserProfile> {
    if (env.useMock) return (await import("../data/mockUsers")).mockCurrentUserProfile;
    const [profile, stats] = await Promise.all([
      apiGet<{ user: User }>("/profile"),
      apiGet<ApiStatistics>("/statistics"),
    ]);
    return {
      ...profile.user,
      stats: {
        totalTests: stats.totalTests,
        passedTests: stats.passedTests,
        failedTests: stats.failedTests,
        averageScore: stats.averageScore,
        completedLessons: stats.completedLessons,
        studyStreakDays: stats.studyStreakDays,
      },
    };
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    if (env.useMock) return { ...(await import("../data/mockUsers")).mockCurrentUserProfile, ...payload };
    const res = await apiPut<{ user: User }>("/profile", payload);
    return res.user;
  },

  /** Points are computed on the server; the token (if any) adds the viewer's own private position. */
  async getLeaderboard(params: { courseId?: string; sort?: LeaderboardSort } = {}): Promise<Leaderboard> {
    return apiGet<Leaderboard>("/leaderboard", params);
  },

  setLeaderboardVisibility: (visible: boolean) => apiPut<{ visible: boolean }>("/users/me/leaderboard", { visible }),

  async getProgressStats(): Promise<ProgressStats> {
    if (env.useMock) return (await import("../data/mockResults")).mockProgressSummary;
    const [stats, courses, results] = await Promise.all([
      apiGet<ApiStatistics>("/statistics"),
      apiGet<ApiCourseProgress[]>("/progress"),
      apiGet<TestResultSummary[]>("/results"),
    ]);
    const progressPct = courses.length
      ? Math.round(courses.reduce((sum, c) => sum + c.pct, 0) / courses.length)
      : 0;
    return {
      weekly: weeklyActivity(results),
      avgScore: stats.averageScore,
      completedLessons: stats.completedLessons,
      learningMinutes: stats.learningTime,
      progressPct,
    };
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return authService.changePassword(currentPassword, newPassword);
  },
};
