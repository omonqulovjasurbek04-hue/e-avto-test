export interface QuestionOption {
  id: string;
  text: string;
  order: number;
  // Note: isCorrect is only exposed during review or admin management!
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  lessonId?: string | null;
  text: string;
  imageUrl?: string | null;
  explanation?: string | null;
  ruleClause?: string | null; // Masalan: "YHQ 12.3-band"
  difficulty: "EASY" | "MEDIUM" | "HARD";
  category?: string;
  order?: number;
  options: QuestionOption[];
  lesson?: {
    id: string;
    title: string;
  };
}

export interface CreateQuestionPayload {
  lessonId?: string | null;
  text: string;
  imageUrl?: string | null;
  explanation?: string | null;
  ruleClause?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: {
    text: string;
    isCorrect: boolean;
    order: number;
  }[];
}
