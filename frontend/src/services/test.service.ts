import { apiClient } from "./api";
import { ActiveTestSession, FinishTestPayload, StartTestPayload } from "../types/test";
import { TestResult } from "../types/result";
import { mockQuestions } from "../data/mockQuestions";
import { mockResults } from "../data/mockResults";

export const testService = {
  async startTest(payload: StartTestPayload): Promise<ActiveTestSession> {
    try {
      const response = await apiClient.post<{ success: boolean; data: ActiveTestSession }>("/tests/start", payload);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }

    // Filter questions based on mode or lesson
    let selectedQuestions = [...mockQuestions];
    if (payload.lessonId) {
      const filtered = selectedQuestions.filter((q) => q.lessonId === payload.lessonId);
      if (filtered.length > 0) {
        selectedQuestions = filtered;
      }
    }

    // Question count: default 20 for EXAM_20, or length
    const limit = payload.questionCount || (payload.mode === "EXAM_20" ? 20 : 15);
    const sliced = selectedQuestions.slice(0, limit);

    // SECURITY: Strip isCorrect from options so frontend doesn't see answer before submission
    const sanitizedQuestions = sliced.map((q) => ({
      ...q,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        order: opt.order,
      })),
      explanation: undefined, // hidden during active exam
    }));

    const duration = payload.timeLimitSeconds || (payload.mode === "EXAM_20" ? 20 * 60 : 15 * 60);

    return {
      attemptId: "att-" + Date.now(),
      mode: payload.mode,
      lessonId: payload.lessonId,
      totalQuestions: sanitizedQuestions.length,
      timeLimitSeconds: duration,
      startedAt: new Date().toISOString(),
      questions: sanitizedQuestions,
      currentQuestionIndex: 0,
      userAnswers: {},
      markedForReview: {},
    };
  },

  async finishTest(payload: FinishTestPayload): Promise<TestResult> {
    try {
      const response = await apiClient.post<{ success: boolean; data: TestResult }>(
        `/tests/${payload.attemptId}/finish`,
        payload
      );
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }

    // Calculate score locally in mock fallback mode
    const answeredMap = new Map(payload.answers.map((a) => [a.questionId, a.selectedOptionId]));
    let correctCount = 0;
    let incorrectCount = 0;

    const reviewItems = mockQuestions.slice(0, payload.answers.length || 20).map((q) => {
      const selectedOptionId = answeredMap.get(q.id) || null;
      const correctOption = q.options.find((o) => o.isCorrect);
      const correctOptionId = correctOption?.id || q.options[0].id;
      const isCorrect = selectedOptionId === correctOptionId;

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        question: q,
        selectedOptionId,
        correctOptionId,
        isCorrect,
        explanation: q.explanation,
        ruleClause: q.ruleClause,
      };
    });

    const totalQuestions = reviewItems.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = scorePercentage >= 90; // 18 out of 20 needed

    const result: TestResult = {
      id: "res-" + Date.now(),
      attemptId: payload.attemptId,
      userId: "user-1",
      mode: "EXAM_20",
      totalQuestions,
      correctAnswersCount: correctCount,
      incorrectAnswersCount: incorrectCount,
      unansweredCount: totalQuestions - (correctCount + incorrectCount),
      scorePercentage,
      isPassed,
      timeSpentSeconds: payload.timeSpentSeconds,
      completedAt: new Date().toISOString(),
      questionsReview: reviewItems,
    };

    return result;
  },

  async getResultById(id: string): Promise<TestResult | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: TestResult }>(`/results/${id}`);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    const found = mockResults.find((r) => r.id === id || r.attemptId === id);
    return found || mockResults[0];
  },
};
