import { apiGet } from "./api";
import { env } from "../config/env";
import type { TestResultDetail, TestResultSummary } from "../types/result";
import { STORAGE_KEYS } from "../constants/config";

// Mock-mode history (localStorage). The real app reads results from the API only.
function readMockHistory(): TestResultDetail[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
  } catch {
    return [];
  }
}

function toSummary(r: TestResultDetail): TestResultSummary {
  const { answers: _answers, questionsReview: _review, ...rest } = r;
  return rest;
}

export const resultService = {
  async list(): Promise<TestResultSummary[]> {
    if (env.useMock) {
      const { mockResults } = await import("../data/mockResults");
      return [...readMockHistory(), ...mockResults].map(toSummary);
    }
    return apiGet<TestResultSummary[]>("/results");
  },

  async get(id: string): Promise<TestResultDetail | null> {
    if (env.useMock) {
      const { mockResults } = await import("../data/mockResults");
      return [...readMockHistory(), ...mockResults].find((r) => r.id === id) ?? null;
    }
    return apiGet<TestResultDetail>(`/results/${id}`);
  },

  /** Mock mode only. */
  async saveMockResult(detail: TestResultDetail): Promise<void> {
    const history = readMockHistory();
    history.unshift(detail);
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    } catch {
      // storage full or unavailable: the result simply is not kept in the demo history
    }
  },
};
