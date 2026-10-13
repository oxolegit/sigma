import type { Rng } from '../../lib/rng';
import type { Tone } from './neutron';

/** Урок 2: деление. Энергии — в МэВ. */

/** Ядро-мишень и составное ядро: энергия связи присоединённого нейтрона (табл. 1.8) и приближённый барьер деления.
 *  Барьеры ²³⁸U и ²³²Th подобраны так, чтобы порог совпал с пособием: ≈ 1 и ≈ 1.2 МэВ. */
export const TARGETS = [
  { id: 'u235', label: '²³⁵U → ²³⁶U*', compound: '²³⁶U*', eb: 6.40, ub: 5.75 },
  { id: 'u233', label: '²³³U → ²³⁴U*', compound: '²³⁴U*', eb: 6.77, ub: 5.5 },
  { id: 'pu239', label: '²³⁹Pu → ²⁴⁰Pu*', compound: '²⁴⁰Pu*', eb: 6.38, ub: 5.5 },
  { id: 'u238', label: '²³⁸U → ²³⁹U*', compound: '²³⁹U*', eb: 4.76, ub: 5.8 },
  { id: 'th232', label: '²³²Th → ²³³Th*', compound: '²³³Th*', eb: 5.07, ub: 6.27 },
] as const;
export type Target = (typeof TARGETS)[number];
export const target = (id: string) => TARGETS.find((t) => t.id === id) ?? TARGETS[0];

/** Энергия возбуждения составного ядра: E* = E_св + E. */
export const excitation = (t: Target, E: number) => t.eb + E;

/** Порог деления по кинетической энергии нейтрона; ≤ 0 — нуклид делящийся. */
export const threshold = (t: Target) => t.ub - t.eb;

export function fissionVerdict(t: Target, E: number): { tone: Tone; text: string; fissile: boolean; fissions: boolean } {
  const thr = threshold(t);
  const Es = excitation(t, E);
  if (thr <= 0) {
    return { tone: 'ok', fissile: true, fissions: true, text: `Делится нейтронами любых энергий: уже $E_{\\text{св}} = ${t.eb.toFixed(2)}$ МэВ больше барьера. Нуклид делящийся.` };
  }
  if (Es >= t.ub) {
    return { tone: 'ok', fissile: false, fissions: true, text: `Делится: кинетическая энергия добрала недостающие ${thr.toFixed(2)} МэВ. Деление пороговое, порог ≈ ${thr.toFixed(1)} МэВ.` };
  }
  return { tone: 'bad', fissile: false, fissions: false, text: `Не делится: не хватает ${(t.ub - Es).toFixed(2)} МэВ — скорее всего, будет радиационный захват. Порог ≈ ${thr.toFixed(1)} МэВ.` };
}

/* ---------- Капельная модель: форма — овалы Кассини с параметром c ∈ [0, 1] ---------- */

/** Деформация, при которой достигается вершина барьера. */
export const SADDLE = 0.72;

/** Радиус поверхности (до нормировки объёма) в направлении θ от оси деления. c = 1 — две касающиеся капли. */
export function cassiniRadius(theta: number, c: number): number {
  const r2 = c * c * Math.cos(2 * theta) + Math.sqrt(Math.max(0, 1 - c ** 4 * Math.sin(2 * theta) ** 2));
  return Math.sqrt(Math.max(r2, 0));
}

/** Множитель, сохраняющий объём капли при деформации (объём шара радиуса 1). */
export function volumeScale(c: number): number {
  const n = 180;
  let V = 0;
  for (let i = 0; i < n; i++) {
    const th = ((i + 0.5) * Math.PI) / n;
    V += cassiniRadius(th, c) ** 3 * Math.sin(th) * (Math.PI / n);
  }
  V *= (2 * Math.PI) / 3;
  return Math.cbrt((4 * Math.PI) / 3 / V);
}

/** Схематичная потенциальная энергия деформации, МэВ: растёт до барьера U_б в SADDLE, за точкой разрыва падает. */
export function deformationEnergy(c: number, ub: number): number {
  if (c <= SADDLE) return ub * Math.sin((Math.PI * c) / (2 * SADDLE)) ** 2;
  const u = (c - SADDLE) / (1 - SADDLE);
  return ub - (ub + 14) * u * u;
}

/** Наибольшая деформация, до которой капля дойдёт с энергией E* (если E* < U_б — точка поворота до барьера). */
export function turningDeformation(Es: number, ub: number): number {
  return ((2 * SADDLE) / Math.PI) * Math.asin(Math.sqrt(Math.min(1, Es / ub)));
}

/* ---------- Нейтроны деления ---------- */

/** Распределение числа мгновенных нейтронов P(ν) для ²³⁵U из черновика курса. Его среднее 2.41 —
 *  на 1 % меньше табличного ν̄ = 2.44: для розыгрыша числа нейтронов в анимации разница не видна. */
export const P_NU = [0.0317, 0.1720, 0.3363, 0.3038, 0.1268, 0.0266, 0.0026, 0.0002] as const;
export const NU_MEAN = P_NU.reduce((s, p, i) => s + p * i, 0);

export function sampleNu(rng: Rng): number {
  let x = rng();
  for (let i = 0; i < P_NU.length; i++) {
    x -= P_NU[i]!;
    if (x < 0) return i;
  }
  return 2;
}

/** Спектр деления по Уатту, 1/МэВ. */
export const watt = (E: number) => 0.4527 * Math.exp(-E / 0.965) * Math.sinh(Math.sqrt(2.29 * E));

/** Максвелловская аппроксимация с T = 1.32 МэВ, 1/МэВ. */
export const maxwell = (E: number, T = 1.32) => (2 / Math.sqrt(Math.PI)) * (Math.sqrt(E) / T ** 1.5) * Math.exp(-E / T);

export interface SpectrumStats { norm: number; mean: number; mode: number; above: (Ec: number) => number }

/** Нормировка, средняя и наиболее вероятная энергия, доля выше порога — численно по сетке до 25 МэВ. */
export function spectrumStats(chi: (E: number) => number): SpectrumStats {
  const h = 0.002;
  let norm = 0, first = 0, best = 0, mode = 0;
  const cum: number[] = [];
  for (let E = h / 2; E < 25; E += h) {
    const v = chi(E);
    norm += v * h;
    first += v * E * h;
    if (v > best) { best = v; mode = E; }
    cum.push(norm);
  }
  const above = (Ec: number) => {
    const i = Math.min(cum.length - 1, Math.max(0, Math.floor(Ec / h)));
    return Ec <= 0 ? 1 : 1 - cum[i]! / norm;
  };
  return { norm, mean: first / norm, mode, above };
}
