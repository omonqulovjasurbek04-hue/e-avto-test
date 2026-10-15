export interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  ruleClause?: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  category?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | string;
  lessonId?: string | null;
  order?: number;
}

/** A question as delivered during an active test: no correct answer, no explanation. */
export type TestQuestion = Omit<Question, "correctIndex" | "explanation" | "ruleClause">;
