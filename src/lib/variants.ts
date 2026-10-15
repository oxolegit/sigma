/**
 * Варианты самостоятельных и контрольных: в варианте — по задаче на каждую тему.
 * У темы несколько типов задач (генераторов); числа разыгрываются от зерна варианта, ответ считается тут же.
 * Варианты 1–4 фиксированы (одинаковы у всех), остальные зёрна — «случайный вариант».
 * Темы курса лежат рядом с его лабораториями (src/labs/<курс>/variants.ts), реестр — src/labs/variants.ts.
 */
import { mulberry32, type Rng } from './rng';

export interface VariantAnswer {
  /** Что ввести: «$\bar n$». */
  label: string;
  value: number;
  /** Относительный допуск; по умолчанию 2 %. */
  tol?: number;
  /** Абсолютный допуск — для ответов около нуля и целых (чётность, число). */
  abs?: number;
  unit?: string;
}

export interface VariantTask {
  /** Тема — заголовок задачи. */
  topic: string;
  q: string;
  answers: VariantAnswer[];
  answer: string;
  hint?: string;
  meta: { kind: string } & Record<string, unknown>;
}

export type Gen = (rng: Rng) => VariantTask;
export interface Slot { topic: string; gens: Gen[] }
/** Работы курса: номер → темы. */
export type Works = Record<number, Slot[]>;

export const ri = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;

/** Число для TeX: 4 значащие цифры, 1.5·10^{32} для больших и маленьких. */
export function fmt(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = Number((v / 10 ** e).toPrecision(3));
    return `${m}\\cdot10^{${e}}`;
  }
  return String(Number(v.toPrecision(digits)));
}

/** Фиксированных вариантов — как на настоящей самостоятельной. */
export const FIXED_VARIANTS = 4;

/**
 * Вариант: для фиксированных (1–4) тип задачи в теме — по кругу, чтобы варианты различались;
 * для случайных — тип тоже случайный. Числа — от зерна варианта и номера темы.
 */
export function buildVariant(slots: Slot[], work: number, variant: number): VariantTask[] {
  return slots.map((slot, i) => {
    const rng = mulberry32(variant * 7919 + i * 104729 + work * 15485863);
    const gen = variant <= FIXED_VARIANTS ? slot.gens[(variant - 1 + i) % slot.gens.length]! : pick(rng, slot.gens);
    return { ...gen(rng), topic: slot.topic };
  });
}
