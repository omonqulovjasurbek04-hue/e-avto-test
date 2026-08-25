export function calculatePercentage(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

export function isExamPassed(correctCount: number, totalQuestions: number, passingPercentage = 90): boolean {
  if (!totalQuestions || totalQuestions <= 0) return false;
  const percentage = (correctCount / totalQuestions) * 100;
  return percentage >= passingPercentage;
}
