import type { TestQuestion } from "./question";
import type { TestResultDetail } from "./result";

export type TestStatus = "idle" | "active" | "finished";

export interface TestSession {
  id: string;
  courseId?: string;
  questions: TestQuestion[];
  answers: Record<string, number>;
  currentIndex: number;
  marked: string[];
  timeLeft: number;
  duration: number;
  status: TestStatus;
  result: TestResultDetail | null;
}
