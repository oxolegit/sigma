/**
 * Оценка параметров: взвешенное среднее и метод наименьших квадратов,
 * метод максимального правдоподобия (лекция 6).
 */
import { poissonPmf } from './poisson';

/* ---------- МНК ---------- */

/** Взвешенное среднее: wᵢ = 1/σᵢ², x̄ = Σwᵢxᵢ/Σwᵢ, σ = 1/√Σwᵢ. Это минимум S = Σ((xᵢ − a)/σᵢ)². */
export function weightedMean(xs: readonly number[], sigmas: readonly number[]) {
  const w = sigmas.map((s) => 1 / (s * s));
  const W = w.reduce((a, b) => a + b, 0);
  const mean = xs.reduce((s, x, i) => s + w[i]! * x, 0) / W;
  const chi2 = xs.reduce((s, x, i) => s + ((x - mean) / sigmas[i]!) ** 2, 0);
  return { mean, sigma: 1 / Math.sqrt(W), weights: w.map((v) => v / W), chi2 };
}

/** S(k, b) = Σ((yᵢ − kxᵢ − b)/σᵢ)²; без σ — просто сумма квадратов отклонений. */
export function sumSquares(xs: readonly number[], ys: readonly number[], k: number, b: number, sigmas?: readonly number[]) {
  return xs.reduce((s, x, i) => s + ((ys[i]! - k * x - b) / (sigmas?.[i] ?? 1)) ** 2, 0);
}

/**
 * Прямая y = kx + b по МНК: ∂S/∂k = ∂S/∂b = 0 дают
 * k = Σ(x − x̄)(y − ȳ)/Σ(x − x̄)², b = ȳ − k x̄ (с весами — то же с wᵢ = 1/σᵢ²).
 * Погрешности параметров — при известных σᵢ; без них σ оценивается по разбросу точек.
 */
export function linearFit(xs: readonly number[], ys: readonly number[], sigmas?: readonly number[]) {
  const w = xs.map((_, i) => (sigmas ? 1 / sigmas[i]! ** 2 : 1));
  const W = w.reduce((a, b) => a + b, 0);
  const mx = xs.reduce((s, x, i) => s + w[i]! * x, 0) / W;
  const my = ys.reduce((s, y, i) => s + w[i]! * y, 0) / W;
  let sxx = 0, sxy = 0;
  xs.forEach((x, i) => { sxx += w[i]! * (x - mx) ** 2; sxy += w[i]! * (x - mx) * (ys[i]! - my); });
  const k = sxy / sxx;
  const b = my - k * mx;
  const S = sumSquares(xs, ys, k, b, sigmas);
  // Без заданных σ дисперсия точки оценивается как S/(n − 2).
  const s2 = sigmas ? 1 : S / Math.max(1, xs.length - 2);
  return { k, b, S, sigmaK: Math.sqrt(s2 / sxx), sigmaB: Math.sqrt(s2 * (1 / W + (mx * mx) / sxx)), mx, my };
}

/* ---------- ММП: где прошла частица ---------- */

export interface Bar {
  /** Длина сцинтиллятора, м. */
  length: number;
  /** Отклик ФЭУ у самого ФЭУ, ф.э. */
  a0: number;
  /** Длина ослабления света, м. */
  d: number;
}
export const BAR: Bar = { length: 6, a0: 50, d: 2 };

/** Ожидаемые амплитуды двух ФЭУ, если частица прошла на расстоянии x от первого: A₀e^{−x/d} и A₀e^{−(L − x)/d}. */
export const expected = (x: number, bar: Bar = BAR): [number, number] =>
  [bar.a0 * Math.exp(-x / bar.d), bar.a0 * Math.exp(-(bar.length - x) / bar.d)];

/**
 * L(x) = −ln l = −Σ ln P(Aᵢ; λᵢ(x)) с пуассоновскими P (λ — ожидаемая, n — измеренная амплитуда).
 * Для нецелых амплитуд ln n! считается через гамма-функцию не нужен: он не зависит от x.
 */
export function negLogL(x: number, a1: number, a2: number, bar: Bar = BAR): number {
  const [l1, l2] = expected(x, bar);
  return l1 - a1 * Math.log(l1) + l2 - a2 * Math.log(l2);
}

/**
 * Минимум L(x): ∂L/∂x = 0 ⇔ λ₁ − λ₂ = A₁ − A₂. С u = e^{−x/d}: A₀u − A₀e^{−L/d}/u = A₁ − A₂ —
 * квадратное уравнение A₀u² − (A₁ − A₂)u − A₀e^{−L/d} = 0, берём положительный корень.
 */
export function mlePosition(a1: number, a2: number, bar: Bar = BAR): number {
  const c = bar.a0 * Math.exp(-bar.length / bar.d);
  const diff = a1 - a2;
  const u = (diff + Math.sqrt(diff * diff + 4 * bar.a0 * c)) / (2 * bar.a0);
  return Math.min(bar.length, Math.max(0, -bar.d * Math.log(u)));
}

/** Оценка по отношению амплитуд A₁/A₂ = e^{−(2x − L)/d} — не зависит от A₀. */
export const ratioPosition = (a1: number, a2: number, bar: Bar = BAR) =>
  Math.min(bar.length, Math.max(0, (bar.length + bar.d * Math.log(a2 / a1)) / 2));

/** Оценки по одному ФЭУ: x = d·ln(A₀/A₁) и x = L − d·ln(A₀/A₂). */
export const singlePositions = (a1: number, a2: number, bar: Bar = BAR): [number, number] =>
  [bar.d * Math.log(bar.a0 / a1), bar.length - bar.d * Math.log(bar.a0 / a2)];

/* ---------- ММП для λ пуассоновской выборки ---------- */

/** −ln L(λ) для выборки отсчётов: Σ(λ − nᵢ ln λ) + const. Минимум — в λ = n̄. */
export function poissonNegLogL(lambda: number, ns: readonly number[]): number {
  return ns.reduce((s, n) => s - Math.log(poissonPmf(lambda, n)), 0);
}

/**
 * Погрешность МП-оценки по кривизне: L(λ̂ ± σ) = L(λ̂) + ½.
 * Для Пуассона ∂²L/∂λ² = Σnᵢ/λ² ⇒ σ = √(λ̂/N).
 */
export const poissonMleSigma = (ns: readonly number[]) => {
  const m = ns.reduce((a, b) => a + b, 0) / ns.length;
  return Math.sqrt(m / ns.length);
};
