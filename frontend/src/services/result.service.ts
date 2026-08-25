import { apiClient } from "./api";
import { LeaderboardEntry, ProgressSummary, TestResult } from "../types/result";
import { mockLeaderboard, mockProgressSummary, mockResults } from "../data/mockResults";

export const resultService = {
  async getUserResults(): Promise<TestResult[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: TestResult[] }>("/results");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockResults;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: LeaderboardEntry[] }>("/leaderboard");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockLeaderboard;
  },

  async getProgressSummary(): Promise<ProgressSummary> {
    try {
      const response = await apiClient.get<{ success: boolean; data: ProgressSummary }>("/progress");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockProgressSummary;
  },
};
