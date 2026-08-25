import { Question } from "./question";

export type TestMode = "EXAM_20" | "LESSON_TOPIC" | "MARATHON" | "MISTAKES_PRACTICE";

export interface StartTestPayload {
  mode: TestMode;
  lessonId?: string;
  questionCount?: number;
  timeLimitSeconds?: number;
}

export interface ActiveTestSession {
  attemptId: string;
  mode: TestMode;
  lessonId?: string;
  lessonTitle?: string;
  totalQuestions: number;
  timeLimitSeconds: number; // e.g. 20 * 60 = 1200 seconds for 20 questions
  startedAt: string;
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>; // questionId -> selectedOptionId
  markedForReview: Record<string, boolean>; // questionId -> boolean flag
}

export interface SubmitAnswerPayload {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
}

export interface FinishTestPayload {
  attemptId: string;
  timeSpentSeconds: number;
  answers: {
    questionId: string;
    selectedOptionId: string;
  }[];
}
