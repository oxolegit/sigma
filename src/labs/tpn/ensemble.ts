import type { Rng } from '../../lib/rng';
import { NU_MEAN, P_NU, sampleNu } from './fission';

/* ---------- Пуассоновский счёт ---------- */

/** ln n! суммой логарифмов: n в лаборатории не больше нескольких десятков тысяч. */
function lnFactorial(n: number): number {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

/** P(N) = μᴺe^{−μ}/N! через логарифмы — без переполнения при больших μ и N. */
export const poissonPmf = (mu: number, N: number) => (N < 0 ? 0 : Math.exp(N * Math.log(mu) - mu - lnFactorial(N)));

/** Стандартная нормальная величина (Бокс — Мюллер). */
export function gauss(rng: Rng): number {
  let u = 0;
  while (!u) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Число отсчётов при среднем μ: при μ < 30 — точный алгоритм Кнута,
 *  выше — нормальное приближение N(μ, μ) с округлением, расхождение с Пуассоном там меньше ширины столбца. */
export function samplePoisson(mu: number, rng: Rng): number {
  if (mu < 30) {
    const L = Math.exp(-mu);
    let k = 0, p = rng();
    while (p > L) { k++; p *= rng(); }
    return k;
  }
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * gauss(rng)));
}

/** Выборочные среднее и стандартное отклонение (несмещённое). */
export function sampleStats(xs: readonly number[]): { mean: number; sd: number } {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  return { mean, sd };
}

/* ---------- Тепловые нейтроны ---------- */

const K_B = 1.380649e-23; // Дж/К
const M_N = 1.67492750e-27; // кг
const H = 6.62607015e-34; // Дж·с
const EV = 1.602176634e-19; // Дж

/** Температура «тепловой точки»: kT = 0.0253 эВ, V_T = 2200 м/с. */
export const T0 = 293.6;

/** kT, эВ. */
export const kT = (T: number) => (K_B * T) / EV;

/** Наиболее вероятная скорость по плотности V_T = √(2kT/m), м/с. */
export const vT = (T: number) => Math.sqrt((2 * K_B * T) / M_N);

/** Средняя скорость по плотности V̄ = 2V_T/√π. */
export const vMean = (T: number) => (2 / Math.sqrt(Math.PI)) * vT(T);

/** Тепловая длина волны Λ = h/√(2πmkT), см. */
export const thermalLength = (T: number) => (100 * H) / Math.sqrt(2 * Math.PI * M_N * K_B * T);

/** Параметр вырождения nΛ³ при плотности n, см⁻³. */
export const degeneracy = (n: number, T: number) => n * thermalLength(T) ** 3;

/** Спектр плотности n(E) = (2/√π)·√E/(kT)^{3/2}·e^{−E/kT}, нормирован на 1; E и θ = kT в одних единицах. */
export const densitySpectrum = (E: number, theta: number) => (2 / Math.sqrt(Math.PI)) * (Math.sqrt(E) / theta ** 1.5) * Math.exp(-E / theta);

/** Спектр потока Φ(E) ∝ n(E)V ∝ E·e^{−E/kT}, нормирован на 1. */
export const fluxSpectrum = (E: number, theta: number) => (E / theta ** 2) * Math.exp(-E / theta);

/** Среднее по максвелловскому потоку сечение 1/V-поглотителя, в долях σ₀ при 2200 м/с: √π/2·√(T₀/T). */
export const oneOverVAverage = (T: number) => (Math.sqrt(Math.PI) / 2) * Math.sqrt(T0 / T);

/** Доля нейтронов с V < V_T в максвелловском газе: erf(1) − 2/(√π·e). */
export const SLOWER_THAN_VT = 0.8427007929497149 - 2 / (Math.sqrt(Math.PI) * Math.E);

/* ---------- Нейтронный газ в ящике ---------- */

/** Ящик [−HALF, HALF]³ в единицах сцены, площадка — круг радиуса DISC в плоскости x = 0. */
export const HALF = 2;
export const DISC = 1.2;

export interface Gas {
  /** Координаты и скорости частиц подряд: x, y, z. */
  p: Float32Array;
  v: Float32Array;
  /** Пересечения площадки в +x и в −x, накопленное время. */
  plus: number;
  minus: number;
  time: number;
}

/** Газ из N частиц, равномерно в ящике, каждая компонента скорости ~ N(0, vt²/2) — это Максвелл с V_T = vt. */
export function makeGas(N: number, vt: number, rng: Rng): Gas {
  const p = new Float32Array(3 * N), v = new Float32Array(3 * N);
  const sd = vt / Math.SQRT2;
  for (let i = 0; i < 3 * N; i++) {
    p[i] = (2 * rng() - 1) * HALF * 0.98;
    v[i] = gauss(rng) * sd;
  }
  return { p, v, plus: 0, minus: 0, time: 0 };
}

/** Сдвиг газа на dt: зеркальное отражение от стенок и счёт пересечений площадки. */
export function stepGas(gas: Gas, dt: number) {
  const { p, v } = gas;
  for (let i = 0; i < p.length; i += 3) {
    const x0 = p[i]!;
    for (let a = 0; a < 3; a++) {
      let x = p[i + a]! + v[i + a]! * dt;
      if (x > HALF) { x = 2 * HALF - x; v[i + a] = -v[i + a]!; }
      else if (x < -HALF) { x = -2 * HALF - x; v[i + a] = -v[i + a]!; }
      p[i + a] = x;
    }
    const x1 = p[i]!;
    if ((x0 < 0) !== (x1 < 0)) {
      // Точка пересечения плоскости x = 0 — линейная интерполяция по шагу.
      const t = x0 / (x0 - x1);
      const y = p[i + 1]! - v[i + 1]! * dt * (1 - t), z = p[i + 2]! - v[i + 2]! * dt * (1 - t);
      if (y * y + z * z < DISC * DISC) { if (x1 > x0) gas.plus++; else gas.minus++; }
    }
  }
  gas.time += dt;
}

/** Односторонние токи через площадку в долях Φ = nV̄; для изотропного газа оба стремятся к 1/4. */
export function gasCurrents(gas: Gas, vt: number): { plus: number; minus: number } {
  const n = gas.p.length / 3 / (2 * HALF) ** 3;
  const flux = n * (2 / Math.sqrt(Math.PI)) * vt;
  const norm = flux * Math.PI * DISC * DISC * gas.time;
  return { plus: gas.plus / norm, minus: gas.minus / norm };
}

/* ---------- Цепочки деления ---------- */

export { NU_MEAN, P_NU };

/** Вероятность деления на нейтрон p = k/ν̄. */
export const fissionProbability = (k: number) => k / NU_MEAN;

/**
 * Вероятность угасания цепочки от одного нейтрона — наименьший корень q = (1 − p) + p·Σ P(ν)qᵛ.
 * Итерация от q = 0 сходится к нему монотонно; при k ≤ 1 корень равен 1.
 */
export function extinction(k: number): number {
  if (k <= 1) return 1;
  const p = fissionProbability(k);
  let q = 0;
  for (let it = 0; it < 100000; it++) {
    let g = 0, qq = 1;
    for (const P of P_NU) { g += P * qq; qq *= q; }
    const next = 1 - p + p * g;
    if (Math.abs(next - q) < 1e-13) return next;
    q = next;
  }
  return q;
}

/**
 * Одна цепочка: число нейтронов по поколениям, начиная с одного.
 * Выше cap нейтронов флуктуации уже малы (1/√N), дальше — детерминированно N·k.
 */
export function chain(k: number, generations: number, cap: number, rng: Rng): number[] {
  const p = fissionProbability(k);
  const hist = [1];
  let n = 1;
  for (let g = 0; g < generations; g++) {
    if (n > cap) n = Math.round(n * k);
    else if (n > 0) {
      let m = 0;
      for (let i = 0; i < n; i++) if (rng() < p) m += sampleNu(rng);
      n = m;
    }
    hist.push(n);
  }
  return hist;
}

/** Доля угасших за generations поколений цепочек; вырвавшиеся выше cap считаются выжившими. */
export function extinctFraction(k: number, runs: number, generations: number, cap: number, rng: Rng): number {
  const p = fissionProbability(k);
  let dead = 0;
  for (let r = 0; r < runs; r++) {
    let n = 1;
    for (let g = 0; g < generations && n > 0 && n <= cap; g++) {
      let m = 0;
      for (let i = 0; i < n; i++) if (rng() < p) m += sampleNu(rng);
      n = m;
    }
    if (n === 0) dead++;
  }
  return dead / runs;
}
