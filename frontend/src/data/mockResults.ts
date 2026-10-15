import type { TestResultDetail, LeaderboardEntry, ProgressStats } from "../types/result";
import { mockQuestions } from "./mockQuestions";

function buildResult(opts: {
  id: string;
  total: number;
  wrongIndices: number[];
  timeSpent: number;
  courseId?: string;
  courseTitle?: string;
  createdAt: string;
}): TestResultDetail {
  const questions = mockQuestions.slice(0, opts.total);
  let correct = 0;
  let wrong = 0;
  const skipped = 0;

  const answers = questions.map((q, idx) => {
    const isWrong = opts.wrongIndices.includes(idx);
    const selectedIndex = isWrong
      ? q.correctIndex === 0
        ? 1
        : 0
      : q.correctIndex;
    if (isWrong) wrong++;
    else correct++;

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

  return {
    id: opts.id,
    courseId: opts.courseId,
    courseTitle: opts.courseTitle,
    totalQuestions: total,
    correctAnswers: correct,
    wrongAnswers: wrong,
    skipped,
    score,
    passed: score >= 70,
    timeSpent: opts.timeSpent,
    createdAt: opts.createdAt,
    answers,
  };
}

export const mockResults: TestResultDetail[] = [
  buildResult({
    id: "res-1",
    total: 20,
    wrongIndices: [4],
    timeSpent: 680,
    createdAt: "2025-02-18T14:30:00.000Z",
  }),
  buildResult({
    id: "res-2",
    total: 15,
    wrongIndices: [3],
    timeSpent: 420,
    courseId: "course-b",
    courseTitle: "B Toifa",
    createdAt: "2025-02-15T11:15:00.000Z",
  }),
  buildResult({
    id: "res-3",
    total: 20,
    wrongIndices: [2, 5, 9, 14],
    timeSpent: 1100,
    createdAt: "2025-02-10T16:45:00.000Z",
  }),
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: "u-lead-1", name: "Sardorbek Rahimov", points: 9800, tests: 45, averageScore: 98, avatarColor: "bg-rose-500" },
  { id: "u-lead-2", name: "Malika Yusupova", points: 9120, tests: 38, averageScore: 96, avatarColor: "bg-amber-500" },
  { id: "u-lead-3", name: "Jasurbek Omonqulov", points: 8450, tests: 28, averageScore: 92, avatarColor: "bg-brand-600" },
  { id: "u-lead-4", name: "Bekzod Aliyev", points: 7900, tests: 25, averageScore: 89, avatarColor: "bg-emerald-500" },
  { id: "u-lead-5", name: "Nodira Karimova", points: 7400, tests: 22, averageScore: 88, avatarColor: "bg-indigo-500" },
];

export const mockProgressSummary: ProgressStats = {
  weekly: [
    { date: "12-Fev", count: 1 },
    { date: "14-Fev", count: 2 },
    { date: "15-Fev", count: 1 },
    { date: "16-Fev", count: 2 },
    { date: "17-Fev", count: 3 },
    { date: "18-Fev", count: 2 },
  ],
  avgScore: 92,
  completedLessons: 18,
  learningMinutes: 320,
  progressPct: 60,
};
