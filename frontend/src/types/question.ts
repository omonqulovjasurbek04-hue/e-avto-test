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
