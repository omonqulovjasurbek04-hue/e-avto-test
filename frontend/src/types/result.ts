import { Question } from "./question";
import { TestMode } from "./test";

export interface QuestionReviewItem {
  question: Question;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation?: string | null;
  ruleClause?: string | null;
}

export interface TestResult {
  id: string;
  attemptId: string;
  userId: string;
  mode: TestMode;
  lessonId?: string | null;
  lessonTitle?: string | null;
  totalQuestions: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unansweredCount: number;
  scorePercentage: number;
  isPassed: boolean; // >= 90% (18/20) for standard exam
  timeSpentSeconds: number;
  completedAt: string;
  questionsReview?: QuestionReviewItem[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  testsCompleted: number;
  averageScore: number;
  passRate: number;
  studyStreakDays: number;
}

export interface ProgressSummary {
  overallPassRate: number;
  totalTestsTaken: number;
  totalQuestionsSolved: number;
  averageTimePerTestSeconds: number;
  categoryStrengths: {
    category: string;
    total: number;
    correct: number;
    accuracyPercentage: number;
  }[];
  recentActivity: {
    date: string;
    score: number;
    passed: boolean;
    mode: string;
  }[];
}
