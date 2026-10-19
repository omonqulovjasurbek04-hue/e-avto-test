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

/** Public leaderboard row: only students who agreed to be listed, with a shortened name ("Azizbek K."). */
export interface LeaderboardEntry {
  rank: number;
  name: string;
  course: string | null;
  tests: number;
  /** Percent of correct answers over all counted attempts. */
  accuracy: number;
  points: number;
  isMe: boolean;
}

export interface Leaderboard {
  stats: { students: number; testsTaken: number; averageAccuracy: number | null };
  entries: LeaderboardEntry[];
  /** The viewer's own position (private to them); null for guests. */
  me: { rank: number | null; points: number; tests: number; accuracy: number; visible: boolean } | null;
  rules: { perCorrect: number; perfectBonus: number; firstTryPassBonus: number };
}

export type LeaderboardSort = "points" | "accuracy" | "tests";

export interface ProgressStats {
  weekly: { date: string; count: number }[];
  avgScore: number;
  completedLessons: number;
  learningMinutes: number;
  progressPct: number;
}
