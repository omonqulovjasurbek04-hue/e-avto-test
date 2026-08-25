export const APP_NAME = "E-Avto Test";
export const PASS_THRESHOLD = 70;
export const DEFAULT_TEST_DURATION = 45 * 60; // 45 minutes for 50 questions
export const DEFAULT_QUESTION_COUNT = 50; // 50 questions standard
export const EXAM_20_DURATION = 20 * 60;
export const EXAM_50_DURATION = 45 * 60;
export const EXAM_100_DURATION = 90 * 60;

export const STORAGE_KEYS = {
  auth: "ea_auth_token",
  user: "ea_user",
  theme: "ea_theme",
  answers: "ea_test_answers",
  history: "ea_test_history",
} as const;
