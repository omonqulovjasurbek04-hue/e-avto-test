import { apiClient } from "./api";
import type {
  TestResultDetail,
  TestResultSummary,
} from "../types/result";
import { mockResults } from "../data/mockResults";
import { STORAGE_KEYS } from "../constants/config";

const HISTORY_KEY = STORAGE_KEYS.history;
let inMemoryHistory: TestResultDetail[] = [];

function readHistory(): TestResultDetail[] {
  if (typeof localStorage !== "undefined") {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return inMemoryHistory;
    }
  }
  return inMemoryHistory;
}

function writeHistory(list: TestResultDetail[]) {
  inMemoryHistory = list;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

function toSummary(r: TestResultDetail): TestResultSummary {
  const { answers, ...rest } = r;
  return rest;
}

export const resultService = {
  async list(): Promise<TestResultSummary[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: TestResultSummary[];
      }>("/results");
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    const history = readHistory().map(toSummary);
    const mock = mockResults.map(toSummary);
    return [...history, ...mock];
  },

  async getUserResults(): Promise<TestResultSummary[]> {
    return resultService.list();
  },

  async get(id: string): Promise<TestResultDetail | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: TestResultDetail;
      }>(`/results/${id}`);
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    const all = [...readHistory(), ...mockResults];
    return all.find((r) => r.id === id) ?? null;
  },

  async saveResult(detail: TestResultDetail): Promise<TestResultDetail> {
    const history = readHistory();
    history.unshift(detail);
    writeHistory(history);
    return detail;
  },
};
