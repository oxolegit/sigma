import { map } from 'nanostores';

/** Ответы пробной контрольной: номер вопроса → верно ли. Не сохраняются: сброс — перезагрузкой страницы. */
export const $answers = map<Record<string, boolean>>({});

export function recordAnswer(n: string, correct: boolean) {
  $answers.setKey(n, correct);
}

/** Новый вариант самостоятельной — счёт с нуля. */
export function resetAnswers() {
  $answers.set({});
}

export function score(answers: Record<string, boolean>) {
  const values = Object.values(answers);
  return { answered: values.length, correct: values.filter(Boolean).length };
}
