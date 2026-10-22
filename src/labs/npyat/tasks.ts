/**
 * Задачи тренажёров курса: случайные данные, ответ — из тех же округлённых чисел, что видит студент.
 */
import type { Rng } from '../../lib/rng';
import { extrapolateCritical, massFromRatio } from './physics';

/** Округление до n значащих цифр. */
const sig = (v: number, n: number) => Number(v.toPrecision(n));
const pick = <T,>(rng: Rng, xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]!;

/** Мишени: Чедвик облучал водород, гелий, литий, бериллий, углерод, азот, аргон. */
const PARTNERS = [
  { M: 4, name: 'гелия', sym: '\\text{He}' },
  { M: 12, name: 'углерода', sym: '\\text{C}' },
  { M: 14, name: 'азота', sym: '\\text{N}' },
  { M: 40, name: 'аргона', sym: '\\text{Ar}' },
] as const;

export interface ChadwickTask {
  /** Скорости отдачи, см/с: водород и второе ядро. */
  u1: number; u2: number;
  M1: number; M2: number;
  name: string; sym: string;
  /** Масса, из которой сгенерированы данные. */
  mTrue: number;
  /** Ответ по округлённым скоростям. */
  answer: number;
}

/** «Найди m по u_H/u_X»: случайная масса 0.6–2.5 а.е.м., скорости с тремя значащими цифрами. */
export function chadwickTask(rng: Rng): ChadwickTask {
  const partner = pick(rng, PARTNERS);
  const mTrue = 0.6 + 1.9 * rng();
  const u1 = sig((2.6 + 1.2 * rng()) * 1e9, 3);
  const u2 = sig((u1 * (mTrue + 1)) / (mTrue + partner.M), 3);
  return { u1, u2, M1: 1, M2: partner.M, name: partner.name, sym: partner.sym, mTrue, answer: massFromRatio(u1 / u2, 1, partner.M) };
}

export interface InvMTask {
  /** Положения стержня, % выдвижения; первое — 0. */
  positions: number[];
  /** Скорость счёта на плато, имп/с. */
  counts: number[];
  /** Где на самом деле критика (по модели, из которой взяты счёты). */
  critical: number;
  /** Прогноз по последним двум точкам. */
  answer: number;
}

/**
 * «По точкам 1/M найди критическое положение»: 1/M = 1 − (p/p_c)^γ с лёгкой кривизной, счёт округлён до целых.
 * Ответ — пересечение с нулём прямой через две последние точки, как экстраполировал Ферми.
 */
export function invMTask(rng: Rng): InvMTask {
  const critical = Math.round(55 + 35 * rng());
  const gamma = 1 + 0.15 * rng();
  const C0 = Math.round(60 + 90 * rng());
  const fr = [0, 0.3 + 0.1 * rng(), 0.55 + 0.08 * rng(), 0.72 + 0.1 * rng()];
  const positions = fr.map((f) => Math.round(f * critical));
  const counts = positions.map((p) => Math.round(C0 / (1 - (p / critical) ** gamma)));
  const answer = extrapolateCritical(positions.map((p, i) => [p, counts[0]! / counts[i]!] as const))!;
  return { positions, counts, critical, answer };
}
