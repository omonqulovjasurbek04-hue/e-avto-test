import { apiClient } from "./api";
import type { Question } from "../types/question";
import type { StartTestResponse, TestResultDetail } from "../types/result";
import { mockQuestions } from "../data/mockQuestions";
import { PASS_THRESHOLD } from "../constants/config";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const testService = {
  /**
   * Starts a test session.
   * Shuffles questions and option order dynamically on every call!
   * Default count is 50 questions.
   */
  async start(
    courseId?: string,
    count: number = 50,
    topicId?: string
  ): Promise<StartTestResponse> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: StartTestResponse;
      }>("/tests/start", { courseId, questionCount: count, topicId });
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback with dynamic shuffle
    }

    // Prefer the selected topic, then fill from the remaining categorized bank.
    let pool = [...mockQuestions];
    if (topicId) {
      const filtered = pool.filter((q) => q.lessonId === topicId);
      if (filtered.length > 0) {
        const filteredIds = new Set(filtered.map((q) => q.id));
        pool = [...filtered, ...pool.filter((q) => !filteredIds.has(q.id))];
      }
    }

    const requestedCount = Math.min(count, pool.length);

    // Shuffle the full bank so every new attempt gets a different selection.
    const shuffledPool = shuffleArray(pool);
    const selectedQuestions = shuffledPool.slice(0, requestedCount);

    // 3. For each question, dynamically shuffle its 4 options and update correctIndex
    const finalQuestions: Question[] = selectedQuestions.map((q, idx) => {
      const optsWithMeta = q.options.map((optText, origIdx) => ({
        text: optText,
        isCorrect: origIdx === q.correctIndex,
      }));

      const shuffledOpts = shuffleArray(optsWithMeta);
      const newCorrectIndex = shuffledOpts.findIndex((o) => o.isCorrect);

      return {
        ...q,
        id: `${q.id}-att-${Date.now()}-${idx}`,
        options: shuffledOpts.map((o) => o.text),
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
        order: idx + 1,
      };
    });

    return {
      test: {
        id: "test-" + Date.now(),
        totalQuestions: finalQuestions.length,
      },
      questions: finalQuestions,
    };
  },

  computeResult(
    testId: string,
    questions: Question[],
    answers: Record<string, number>,
    timeSpent: number,
    courseId?: string
  ): TestResultDetail {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    const review = questions.map((q) => {
      const selectedIndex =
        answers[q.id] === undefined ? null : answers[q.id];
      if (selectedIndex === null) skipped++;
      else if (selectedIndex === q.correctIndex) correct++;
      else wrong++;

      return {
        questionId: q.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex,
        explanation: q.explanation,
      };
    });

    const total = questions.length;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const passed = score >= PASS_THRESHOLD;

    return {
      id: testId,
      courseId,
      totalQuestions: total,
      correctAnswers: correct,
      wrongAnswers: wrong,
      skippedAnswers: skipped,
      score,
      passed,
      timeSpent,
      createdAt: new Date().toISOString(),
      answers: review,
      questionsReview: review,
    };
  },
};
