import { apiClient } from "./api";
import { User } from "../types/user";
import { Question, CreateQuestionPayload } from "../types/question";
import { mockUsers } from "../data/mockUsers";
import { mockQuestions } from "../data/mockQuestions";
import { mockCourses } from "../data/mockCourses";

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalQuestions: number;
  totalTestsCompleted: number;
  averagePassRate: number;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    try {
      const response = await apiClient.get<{ success: boolean; data: AdminStats }>("/admin/stats");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return {
      totalUsers: 1450,
      totalCourses: 4,
      totalQuestions: mockQuestions.length,
      totalTestsCompleted: 6240,
      averagePassRate: 88,
    };
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: User[] }>("/admin/users");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockUsers;
  },

  async getQuestions(): Promise<Question[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Question[] }>("/admin/questions");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockQuestions;
  },

  async createQuestion(payload: CreateQuestionPayload): Promise<Question> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Question }>("/admin/questions", payload);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    const newQ: Question = {
      id: "q-" + Date.now(),
      lessonId: payload.lessonId,
      text: payload.text,
      imageUrl: payload.imageUrl,
      explanation: payload.explanation,
      ruleClause: payload.ruleClause,
      difficulty: payload.difficulty,
      order: 1,
      options: payload.options.map((opt, idx) => ({
        id: `opt-new-${idx}`,
        text: opt.text,
        order: opt.order,
        isCorrect: opt.isCorrect,
      })),
    };
    return newQ;
  },

  async deleteQuestion(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/admin/questions/${id}`);
      return true;
    } catch {
      return true;
    }
  },
};
