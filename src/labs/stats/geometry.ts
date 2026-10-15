/**
 * Геометрическая вероятность и Монте-Карло: случайная площадь треугольника,
 * сверхновая в диске Галактики, случайные совпадения двух детекторов.
 */
import type { Rng } from '../../lib/rng';

/* ---------- Треугольник: a, h равномерно на (0; L), S = ah/2 ---------- */

/**
 * Площадь S = ah/2 при a, h ~ U(0; L). Обозначим z = S/Sₘₐₓ, Sₘₐₓ = L²/2: z — произведение двух
 * независимых U(0; 1), его плотность −ln z, функция распределения z − z ln z.
 */
export function triangle(L = 100) {
  const smax = (L * L) / 2;
  const pdf = (s: number) => (s > 0 && s < smax ? Math.log(smax / s) / smax : 0);
  const cdf = (s: number) => {
    if (s <= 0) return 0;
    if (s >= smax) return 1;
    const z = s / smax;
    return z - z * Math.log(z);
  };
  // ⟨S⟩ = ⟨a⟩⟨h⟩/2, ⟨S²⟩ = ⟨a²⟩⟨h²⟩/4: a и h независимы.
  const mean = (L / 2) * (L / 2) / 2;
  const mean2 = ((L * L) / 3) ** 2 / 4;
  return { smax, pdf, cdf, mean, sigma: Math.sqrt(mean2 - mean * mean) };
}

/** Медиана площади: z − z ln z = 1/2, z ≈ 0.1867. */
export function triangleMedian(L = 100) {
  const { smax, cdf } = triangle(L);
  let lo = 0, hi = smax;
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (cdf(m) < 0.5) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ---------- Галактика: диск радиуса R, Солнце на расстоянии d от центра ---------- */

/**
 * Площадь пересечения кругов радиусов r и R с центрами на расстоянии d (формула «линзы»).
 * Нужна для P(расстояние до сверхновой < r) = S∩/(πR²).
 */
export function lensArea(r: number, R: number, d: number): number {
  if (r <= 0) return 0;
  if (d + r <= R) return Math.PI * r * r;
  if (d + R <= r) return Math.PI * R * R;
  if (d >= r + R) return 0;
  const a = Math.acos(Math.max(-1, Math.min(1, (d * d + r * r - R * R) / (2 * d * r))));
  const b = Math.acos(Math.max(-1, Math.min(1, (d * d + R * R - r * r) / (2 * d * R))));
  return r * r * a + R * R * b - 0.5 * Math.sqrt(Math.max(0, (-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R)));
}

/** Вероятность, что вспышка, равномерно разыгранная по диску, ближе r к Солнцу. */
export const galaxyWithin = (r: number, R = 50, d = 26) => lensArea(r, R, d) / (Math.PI * R * R);

/** Среднее расстояние до вспышки: ⟨ρ⟩ = ∫ (1 − P(ρ < r)) dr. */
export function galaxyMeanDistance(R = 50, d = 26, n = 4000): number {
  const top = R + d;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const r = ((i + 0.5) * top) / n;
    s += (1 - galaxyWithin(r, R, d)) * (top / n);
  }
  return s;
}

/** Точка, равномерно разыгранная по диску радиуса R: r = R√u, φ = 2πv. */
export function diskPoint(rng: Rng, R = 50): [number, number] {
  const r = R * Math.sqrt(rng()), phi = 2 * Math.PI * rng();
  return [r * Math.cos(phi), r * Math.sin(phi)];
}

/* ---------- Совпадения ---------- */

/** Пуассоновский поток: моменты событий на [0, T) с частотой ν (интервалы — экспонента). */
export function poissonTimes(rng: Rng, nu: number, T: number): number[] {
  const out: number[] = [];
  if (nu <= 0) return out;
  for (let t = -Math.log(1 - rng()) / nu; t < T; t += -Math.log(1 - rng()) / nu) out.push(t);
  return out;
}

/** Темп случайных совпадений двух независимых потоков при окне τ: ν_сл = 2τν₁ν₂. */
export const randomCoincidenceRate = (nu1: number, nu2: number, tau: number) => 2 * tau * nu1 * nu2;

/** Совпадения: события второго потока, попавшие в окно ±τ вокруг события первого (оба списка по возрастанию). */
export function coincidences(a: readonly number[], b: readonly number[], tau: number): [number, number][] {
  const out: [number, number][] = [];
  let j = 0;
  for (const t of a) {
    while (j < b.length && b[j]! < t - tau) j++;
    for (let k = j; k < b.length && b[k]! <= t + tau; k++) out.push([t, b[k]!]);
  }
  return out;
}

/* ---------- Комбинации независимых событий ---------- */

/** Вероятности для независимых детекторов с эффективностями pᵢ: сработало ровно k из n. */
export function exactlyK(ps: readonly number[]): number[] {
  let dist = [1];
  for (const p of ps) {
    const next = new Array<number>(dist.length + 1).fill(0);
    dist.forEach((v, k) => { next[k]! += v * (1 - p); next[k + 1]! += v * p; });
    dist = next;
  }
  return dist;
}
