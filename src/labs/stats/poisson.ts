/**
 * Распределение Пуассона и счёт событий: вероятности, хвосты, пределы при нуле событий,
 * погрешность скорости счёта, мёртвое время (пособие, разд. 3, примеры 3.1–3.5).
 */
import type { Rng } from '../../lib/rng';
import { bisect } from './density';

/** Pₙ = λⁿe^{−λ}/n! — через логарифм, чтобы не переполняться при больших n. */
export function poissonPmf(lambda: number, n: number): number {
  if (n < 0 || !Number.isInteger(n)) return 0;
  if (lambda === 0) return n === 0 ? 1 : 0;
  let lf = 0;
  for (let k = 2; k <= n; k++) lf += Math.log(k);
  return Math.exp(n * Math.log(lambda) - lambda - lf);
}

/** P(N ≤ n) = P₀ + … + Pₙ; считается рекуррентно Pₖ₊₁ = Pₖ·λ/(k + 1). */
export function poissonCdf(lambda: number, n: number): number {
  if (n < 0) return 0;
  let p = Math.exp(-lambda), s = p;
  for (let k = 0; k < n; k++) { p *= lambda / (k + 1); s += p; }
  return Math.min(1, s);
}

/** P(N > n) = 1 − (P₀ + … + Pₙ). P(N ≥ n) — это P(N > n − 1). */
export const poissonTail = (lambda: number, n: number) => 1 - poissonCdf(lambda, n);

/** Наиболее вероятные n: целая часть λ; при целом λ ещё и λ − 1 (Pλ₋₁ = Pλ). */
export function poissonModes(lambda: number): number[] {
  const k = Math.floor(lambda);
  return Number.isInteger(lambda) && lambda > 0 ? [k - 1, k] : [k];
}

/** Среднее, σ и асимметрия: n̄ = λ, σ = √λ, γ = 1/√λ. */
export const poissonParams = (lambda: number) => ({ mean: lambda, sigma: Math.sqrt(lambda), skew: 1 / Math.sqrt(lambda) });

/** Розыгрыш числа событий: при малых λ — перемножением равномерных, при больших — нормальное приближение. */
export function samplePoisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0;
  if (lambda < 60) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  const u = 1 - rng(), v = rng();
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}

/* ---------- Ноль событий и малая статистика ---------- */

/** Верхний предел λ при нуле событий: e^{−λ} = 1 − CL, λ = −ln(1 − CL). */
export const zeroEventLimit = (cl: number) => -Math.log(1 - cl);

/**
 * Границы λ при k зарегистрированных событиях (пособие, табл. 3.1): правая λᵣ — из Σ_{n≤k} P = α,
 * левая λₗ — из Σ_{n<k} P = 1 − α; α = 0.158 — доля хвоста гауссиана за 1σ.
 */
export function poissonInterval(k: number, alpha = 0.158) {
  const right = bisect((l) => poissonCdf(l, k) - alpha, 0, k + 50 + 10 * Math.sqrt(k + 1));
  const left = k === 0 ? 0 : bisect((l) => poissonCdf(l, k - 1) - (1 - alpha), 0, k + 10);
  return { left, right, sigmaLeft: k - left, sigmaRight: right - k };
}

/**
 * Время жизни протона из нуля распадов: λ = N_p·t/τ ≤ λₘₐₓ ⇒ τ ≥ N_p·t/λₘₐₓ.
 * В молекуле H₂O 10 протонов, молярная масса 18 г/моль.
 */
export function protonLifetime(massKg: number, years: number, lambdaMax: number) {
  const NA = 6.022e23;
  const protons = ((massKg * 1000) / 18) * NA * 10;
  return { protons, tau: (protons * years) / lambdaMax };
}

/* ---------- Скорость счёта ---------- */

/** ν = N/t, σ_ν = √N/t: время точное, разброс — только пуассоновский. */
export const countRate = (N: number, t: number) => ({ rate: N / t, sigma: Math.sqrt(N) / t, relative: 1 / Math.sqrt(N) });

/** Скорость от источника за вычетом фона: погрешности складываются в квадратах. */
export function netRate(N: number, t: number, Nb: number, tb: number) {
  return { rate: N / t - Nb / tb, sigma: Math.sqrt(N / (t * t) + Nb / (tb * tb)) };
}

/** Сколько мерить для относительной погрешности δ: N = 1/δ², t = N/ν. */
export const timeForPrecision = (rate: number, rel: number) => ({ N: 1 / (rel * rel), t: 1 / (rel * rel) / rate });

/* ---------- Мёртвое время ---------- */

/** Доля событий, попавших в мёртвое время предыдущего: 1 − P₀ = 1 − e^{−ντ}. */
export const deadFraction = (nu: number, tau: number) => 1 - Math.exp(-nu * tau);

/** С дополнительным каналом («пинг-понг») теряются второе и следующие события за τ: 1 − e^{−x}(1 + x), x = ντ. */
export const deadFractionTwoChannels = (nu: number, tau: number) => 1 - Math.exp(-nu * tau) * (1 + nu * tau);

/** Непродлевающееся мёртвое время: n = m/(1 − mτ); m — измеренная скорость, n — истинная. */
export const trueRateNonParalyzable = (m: number, tau: number) => m / (1 - m * tau);
/** Обратно: что покажет счётчик при истинной скорости n. */
export const measuredNonParalyzable = (n: number, tau: number) => n / (1 + n * tau);

/** Продлевающееся (как на лекции): детектор видит ν_д = ν_и·e^{−ν_и τ}. */
export const measuredParalyzable = (n: number, tau: number) => n * Math.exp(-n * tau);

/**
 * Истинная скорость по N событиям за t при мёртвом времени τ (линейное приближение e^{−ντ} ≈ 1 − ντ):
 * ν_и = N/(t − Nτ), σ = √N · t/(t − Nτ)².
 */
export function trueRate(N: number, t: number, tau: number) {
  const d = t - N * tau;
  return { measured: N / t, rate: N / d, sigma: (Math.sqrt(N) * t) / (d * d), loss: 1 - (N / t) / (N / d) };
}

/**
 * Точные решения ν_д = ν e^{−ντ}: два корня, по обе стороны от максимума ν = 1/τ.
 * Физический — меньший, ближе к измеренной скорости. Если ν_д > 1/(eτ), решений нет.
 */
export function paralyzableRoots(m: number, tau: number): [number, number] | null {
  const peak = 1 / tau;
  if (m > measuredParalyzable(peak, tau)) return null;
  const g = (n: number) => measuredParalyzable(n, tau) - m;
  return [bisect(g, m, peak), bisect(g, peak, 60 / tau)];
}

/**
 * Второе приближение (пособие, пример 3.5): e^{ντ} ≈ 1 + ντ + (ντ)²/2 ⇒
 * ½mτ²ν² − (1 − mτ)ν + m = 0, оба корня.
 */
export function secondOrderRoots(m: number, tau: number): [number, number] {
  const a = 0.5 * m * tau * tau, b = -(1 - m * tau), c = m;
  const D = Math.sqrt(Math.max(0, b * b - 4 * a * c));
  return [(-b - D) / (2 * a), (-b + D) / (2 * a)];
}

/** Итерации νₖ₊₁ = ν_д·e^{νₖτ} от νₖ = ν_д: сходятся к меньшему корню при ν_д τ < 1/e. */
export function paralyzableIterations(m: number, tau: number, steps = 8): number[] {
  const out = [m];
  for (let i = 0; i < steps; i++) out.push(m * Math.exp(out[out.length - 1]! * tau));
  return out;
}

/**
 * Имитация счётчика в модели лекции: событие теряется, если за τ до него пришло хотя бы одно
 * событие (один канал) или хотя бы два (два канала, «пинг-понг»). Для пуассоновского потока
 * доля потерь — ровно 1 − e^{−ντ} и 1 − e^{−ντ}(1 + ντ).
 */
export function simulateDeadTime(times: readonly number[], tau: number, channels: 1 | 2 = 1) {
  const registered: boolean[] = [];
  let first = 0;
  times.forEach((t, i) => {
    while (times[first]! <= t - tau) first++;
    registered.push(i - first < channels);
  });
  return registered;
}
