/** Shown when the admin has not filled the contact fields (Admin → CMS → Sozlamalar overrides them). */
// Shown until the admin sets the real address (the phone is shown only once the admin sets it).
export const DEFAULT_CONTACT = { address: "Sirdaryo v., Yangiyer sh." } as const;
export const PASS_THRESHOLD = 70;
export const DEFAULT_QUESTION_COUNT = 50; // 50 questions standard

export const STORAGE_KEYS = {
  auth: "ea_auth_token",
  user: "ea_user",
  theme: "ea_theme",
  answers: "ea_test_answers",
  history: "ea_test_history",
} as const;
