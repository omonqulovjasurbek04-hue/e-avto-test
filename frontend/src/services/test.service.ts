import { apiPost, apiClient } from "./api";
import { env } from "../config/env";
import type { Question } from "../types/question";
import type { StartTestResponse, TestResultDetail } from "../types/result";
import { PASS_THRESHOLD, DEFAULT_QUESTION_COUNT } from "../constants/config";
import { resultService } from "./result.service";

export interface StartTestOptions {
  courseId?: string;
  count?: number;
  /** Mock mode only: prefer questions of this topic. */
  topicId?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mockDuration(count: number): number {
  if (count <= 20) return 20 * 60;
  if (count <= 50) return 45 * 60;
  return 90 * 60;
}

// ---------------------------------------------------------------------------
// Mock mode (VITE_USE_MOCK=true): everything runs in the browser for offline demos.
// The real flow never uses this; there the server grades the attempt.
// ---------------------------------------------------------------------------
const mockSessions = new Map<string, { questions: Question[]; courseId?: string; startedAt: number }>();

async function mockStart({ courseId, count = DEFAULT_QUESTION_COUNT, topicId }: StartTestOptions): Promise<StartTestResponse> {
  const { mockQuestions } = await import("../data/mockQuestions");
  let pool = [...mockQuestions];
  if (topicId) {
    const filtered = pool.filter((q) => q.lessonId === topicId);
    const ids = new Set(filtered.map((q) => q.id));
    pool = [...filtered, ...pool.filter((q) => !ids.has(q.id))];
  }

  const selected = shuffleArray(pool).slice(0, Math.min(count, pool.length));
  const questions: Question[] = selected.map((q, idx) => {
    const opts = shuffleArray(q.options.map((text, i) => ({ text, isCorrect: i === q.correctIndex })));
    return {
      ...q,
      id: `${q.id}-att-${Date.now()}-${idx}`,
      options: opts.map((o) => o.text),
      correctIndex: Math.max(0, opts.findIndex((o) => o.isCorrect)),
      order: idx + 1,
    };
  });

  const id = "mock-test-" + Date.now();
  mockSessions.set(id, { questions, courseId, startedAt: Date.now() });

  return {
    test: { id, totalQuestions: questions.length, duration: mockDuration(count), startedAt: new Date().toISOString() },
    // Strip the answer key, mirroring what the API sends.
    questions: questions.map(({ correctIndex: _c, explanation: _e, ruleClause: _r, ...q }) => q),
  };
}

async function mockFinish(testId: string, answers: Record<string, number>, timeSpent: number): Promise<TestResultDetail> {
  const session = mockSessions.get(testId);
  if (!session) throw new Error("Test sessiyasi topilmadi");

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const review = session.questions.map((q) => {
    const selected = answers[q.id] === undefined ? null : answers[q.id];
    if (selected === null) skipped++;
    else if (selected === q.correctIndex) correct++;
    else wrong++;
    return {
      questionId: q.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: selected,
      explanation: q.explanation,
    };
  });

  const total = session.questions.length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const detail: TestResultDetail = {
    id: testId,
    courseId: session.courseId,
    totalQuestions: total,
    correctAnswers: correct,
    wrongAnswers: wrong,
    skippedAnswers: skipped,
    skipped,
    score,
    passed: score >= PASS_THRESHOLD,
    timeSpent,
    createdAt: new Date().toISOString(),
    answers: review,
  };
  await resultService.saveMockResult(detail);
  mockSessions.delete(testId);
  return detail;
}

export const testService = {
  /** Starts an attempt. Questions arrive without correct answers; the server owns the key. */
  async start(options: StartTestOptions = {}): Promise<StartTestResponse> {
    if (env.useMock) return mockStart(options);
    return apiPost<StartTestResponse>("/tests/start", {
      courseId: options.courseId,
      count: options.count ?? DEFAULT_QUESTION_COUNT,
    });
  },

  /** Fire-and-forget autosave of one answer. Failures are fine: /finish sends all answers again. */
  saveAnswer(testId: string, questionId: string, selectedIndex: number): void {
    if (env.useMock) return;
    void apiClient.post(`/tests/${testId}/answer`, { questionId, selectedIndex }).catch(() => undefined);
  },

  /**
   * Submits all answers; the server grades them and enforces the time limit.
   * Calling it twice returns the same stored result.
   */
  async finish(testId: string, answers: Record<string, number>, timeSpent: number): Promise<TestResultDetail> {
    if (env.useMock) return mockFinish(testId, answers, timeSpent);
    const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
    return apiPost<TestResultDetail>(`/tests/${testId}/finish`, { answers: payload });
  },
};
