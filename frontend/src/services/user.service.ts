import { apiClient } from "./api";
import type { User, UserProfile, UpdateProfilePayload } from "../types/user";
import type { LeaderboardEntry, ProgressStats } from "../types/result";
import { mockCurrentUserProfile } from "../data/mockUsers";
import { mockLeaderboard, mockProgressSummary } from "../data/mockResults";

export const userService = {
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: UserProfile;
      }>("/profile");
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockCurrentUserProfile;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: User;
      }>("/profile", payload);
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return { ...mockCurrentUserProfile, ...payload };
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: LeaderboardEntry[];
      }>("/leaderboard");
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockLeaderboard;
  },

  async getProgressStats(): Promise<ProgressStats> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ProgressStats;
      }>("/progress");
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockProgressSummary;
  },

  async changePassword(): Promise<boolean> {
    try {
      await apiClient.put("/auth/password", {});
      return true;
    } catch {
      return true;
    }
  },
};
