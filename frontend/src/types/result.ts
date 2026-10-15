import type { TestQuestion } from "./question";

export interface AnswerReview {
  questionId: string;
  text: string;
  imageUrl?: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  explanation?: string;
}

export interface TestResultSummary {
  id: string;
  courseId?: string;
  courseTitle?: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipped?: number;
  skippedAnswers?: number;
  score: number;
  passed: boolean;
  timeSpent: number;
  createdAt: string;
}

export interface TestResultDetail extends TestResultSummary {
  answers: AnswerReview[];
  questionsReview?: AnswerReview[];
}

export interface StartTestResponse {
  test: { id: string; totalQuestions: number; duration?: number; startedAt?: string };
  questions: TestQuestion[];
}

export interface LeaderboardEntry {
  id: string;
  rank?: number;
  name: string;
  points: number;
  tests: number;
  averageScore: number;
  avatarColor?: string;
}

export interface ProgressStats {
  weekly: { date: string; count: number }[];
  avgScore: number;
  completedLessons: number;
  learningMinutes: number;
  progressPct: number;
}
