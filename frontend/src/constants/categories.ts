import type { Difficulty } from "@/types/course";

export const CATEGORIES = [
  "Yo'l belgilari",
  "Yo'l qoidalari",
  "Svetofor",
  "Parkovka",
  "Xavfsizlik",
] as const;

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Boshlang'ich" },
  { value: "intermediate", label: "O'rta" },
  { value: "advanced", label: "Murakkab" },
  { value: "EASY", label: "Oson" },
  { value: "MEDIUM", label: "O'rta" },
  { value: "HARD", label: "Murakkab" },
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Boshlang'ich",
  intermediate: "O'rta",
  advanced: "Murakkab",
  EASY: "Oson",
  MEDIUM: "O'rta",
  HARD: "Murakkab",
};
