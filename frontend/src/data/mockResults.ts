import { TestResult, LeaderboardEntry, ProgressSummary } from "../types/result";
import { mockQuestions } from "./mockQuestions";

export const mockResults: TestResult[] = [
  {
    id: "res-1",
    attemptId: "att-1",
    userId: "user-1",
    mode: "EXAM_20",
    totalQuestions: 20,
    correctAnswersCount: 19,
    incorrectAnswersCount: 1,
    unansweredCount: 0,
    scorePercentage: 95,
    isPassed: true,
    timeSpentSeconds: 680,
    completedAt: "2025-02-18T14:30:00.000Z",
    questionsReview: mockQuestions.slice(0, 20).map((q, idx) => {
      const correctOpt = q.options.find((o) => o.isCorrect)?.id || q.options[0].id;
      const isCorrect = idx !== 4; // 5th question is wrong for review demo
      const selectedOpt = isCorrect ? correctOpt : q.options.find((o) => !o.isCorrect)?.id || correctOpt;

      return {
        question: q,
        selectedOptionId: selectedOpt,
        correctOptionId: correctOpt,
        isCorrect,
        explanation: q.explanation,
        ruleClause: q.ruleClause,
      };
    }),
  },
  {
    id: "res-2",
    attemptId: "att-2",
    userId: "user-1",
    mode: "LESSON_TOPIC",
    lessonId: "lesson-1",
    lessonTitle: "1-Mavzu: Umumiy qoidalar",
    totalQuestions: 15,
    correctAnswersCount: 14,
    incorrectAnswersCount: 1,
    unansweredCount: 0,
    scorePercentage: 93,
    isPassed: true,
    timeSpentSeconds: 420,
    completedAt: "2025-02-15T11:15:00.000Z",
  },
  {
    id: "res-3",
    attemptId: "att-3",
    userId: "user-1",
    mode: "EXAM_20",
    totalQuestions: 20,
    correctAnswersCount: 16,
    incorrectAnswersCount: 4,
    unansweredCount: 0,
    scorePercentage: 80,
    isPassed: false,
    timeSpentSeconds: 1100,
    completedAt: "2025-02-10T16:45:00.000Z",
  },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "u-lead-1",
    name: "Sardorbek Rahimov",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    testsCompleted: 45,
    averageScore: 98,
    passRate: 98,
    studyStreakDays: 14,
  },
  {
    rank: 2,
    userId: "u-lead-2",
    name: "Malika Yusupova",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    testsCompleted: 38,
    averageScore: 96,
    passRate: 95,
    studyStreakDays: 12,
  },
  {
    rank: 3,
    userId: "user-1",
    name: "Jasurbek Omonqulov (Siz)",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    testsCompleted: 28,
    averageScore: 92,
    passRate: 86,
    studyStreakDays: 7,
  },
  {
    rank: 4,
    userId: "u-lead-4",
    name: "Bekzod Aliyev",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    testsCompleted: 25,
    averageScore: 89,
    passRate: 84,
    studyStreakDays: 5,
  },
  {
    rank: 5,
    userId: "u-lead-5",
    name: "Nodira Karimova",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    testsCompleted: 22,
    averageScore: 88,
    passRate: 82,
    studyStreakDays: 4,
  },
];

export const mockProgressSummary: ProgressSummary = {
  overallPassRate: 86,
  totalTestsTaken: 28,
  totalQuestionsSolved: 560,
  averageTimePerTestSeconds: 740,
  categoryStrengths: [
    { category: "Yo'l belgilari", total: 120, correct: 114, accuracyPercentage: 95 },
    { category: "Chorrahalar", total: 150, correct: 132, accuracyPercentage: 88 },
    { category: "Svetofor va tartibga soluvchi", total: 80, correct: 74, accuracyPercentage: 92 },
    { category: "Harakat tezligi", total: 60, correct: 57, accuracyPercentage: 95 },
    { category: "Manevrlar va quvib o'tish", total: 90, correct: 72, accuracyPercentage: 80 },
    { category: "Xavfsizlik va birinchi yordam", total: 60, correct: 50, accuracyPercentage: 83 },
  ],
  recentActivity: [
    { date: "12-Fevral", score: 85, passed: false, mode: "EXAM_20" },
    { date: "14-Fevral", score: 90, passed: true, mode: "EXAM_20" },
    { date: "15-Fevral", score: 93, passed: true, mode: "LESSON_TOPIC" },
    { date: "16-Fevral", score: 90, passed: true, mode: "EXAM_20" },
    { date: "17-Fevral", score: 95, passed: true, mode: "MARATHON" },
    { date: "18-Fevral", score: 95, passed: true, mode: "EXAM_20" },
  ],
};
