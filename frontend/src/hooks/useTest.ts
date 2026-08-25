import { useTestStore } from "../store/test.store";

export function useTest() {
  const store = useTestStore();
  const currentQuestion =
    store.session && store.session.questions.length > 0
      ? store.session.questions[store.session.currentQuestionIndex]
      : null;

  const answeredCount = store.session
    ? Object.keys(store.session.userAnswers).length
    : 0;

  return {
    ...store,
    currentQuestion,
    answeredCount,
  };
}
