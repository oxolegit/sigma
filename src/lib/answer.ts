/**
 * Проверка числового ответа в задачах самостоятельных.
 * Ответы в задачах округлены, поэтому сравнение — с относительным допуском, а не точное, как в тренажёре.
 * Запись — как на бумаге: 0,87; 1.5·10^32; 1.5e32; 2/3; 1 − e^(−0.1); 9.5 %.
 */
import { parseNum } from './expr';

/** Число из ввода студента; «9.5 %» — это 0.095. NaN — если прочитать не удалось. */
export function parseAnswer(input: string): number {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) return NaN;
  const pct = /%\s*$/.test(s);
  // «1.5 · 10^32» и «1,5×10³²» → mathjs; пробелы внутри числа («1 000») убираем.
  const body = s.replace(/%\s*$/, '').replace(/(\d) (?=\d{3}\b)/g, '$1').replace(/10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, p: string) => `10^(${[...p].map((ch) => SUP[ch]).join('')})`);
  try {
    const v = parseNum(body);
    return pct ? v / 100 : v;
  } catch {
    return NaN;
  }
}
const SUP: Record<string, string> = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

export type AnswerVerdict = 'ok' | 'close' | 'wrong' | 'unreadable';

/**
 * Верно, если ответ отличается от эталона не больше чем на tol (доля, по умолчанию 2 %).
 * «close» — в пределах 10 %: скорее всего, ошибка округления или промежуточного шага.
 * abs — абсолютный допуск для ответов около нуля (сдвиг прямой, среднее со знаком).
 */
export function checkAnswer(input: string, value: number, tol = 0.02, abs = 0): AnswerVerdict {
  const u = parseAnswer(input);
  if (!Number.isFinite(u)) return 'unreadable';
  const d = Math.abs(u - value);
  const scale = Math.abs(value) || 1;
  if (d <= Math.max(tol * scale, abs) + 1e-12) return 'ok';
  if (d <= 0.1 * scale) return 'close';
  return 'wrong';
}
