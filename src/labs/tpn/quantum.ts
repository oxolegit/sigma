import type { Rng } from '../../lib/rng';

/** Урок 9: нейтрон-волна, резонансы и статистика уровней. Энергии — эВ, если не сказано иначе. */

/* ---------- Рассеяние на твёрдой сфере: парциальные волны ---------- */

/** Сферические функции Бесселя j_l(x) и Неймана y_l(x) для l = 0…L.
 *  y — прямой рекурсией (устойчива вверх), j — обратной рекурсией Миллера с нормировкой на j₀ или j₁. */
export function sphericalBessel(L: number, x: number): { j: number[]; y: number[] } {
  const s = Math.sin(x), c = Math.cos(x);
  const y = new Array<number>(L + 1);
  y[0] = -c / x;
  if (L > 0) y[1] = -c / (x * x) - s / x;
  for (let l = 1; l < L; l++) y[l + 1] = ((2 * l + 1) / x) * y[l]! - y[l - 1]!;
  const N = Math.max(L, Math.ceil(x)) + 30;
  const t = new Array<number>(N + 2).fill(0);
  t[N] = 1e-30;
  for (let l = N; l >= 1; l--) {
    t[l - 1] = ((2 * l + 1) / x) * t[l]! - t[l + 1]!;
    if (Math.abs(t[l - 1]!) > 1e250) for (let k = l - 1; k <= N + 1; k++) t[k]! *= 1e-250;
  }
  const j0 = s / x, j1 = s / (x * x) - c / x;
  const scale = Math.abs(j0) > Math.abs(j1) ? j0 / t[0]! : j1 / t[1]!;
  return { j: t.slice(0, L + 1).map((v) => v * scale), y };
}

/** Полиномы Лежандра P_0…P_L в точке u. */
export function legendre(L: number, u: number): number[] {
  const P = [1, u];
  for (let l = 1; l < L; l++) P.push(((2 * l + 1) * u * P[l]! - l * P[l - 1]!) / (l + 1));
  return P.slice(0, L + 1);
}

export interface HardSphere {
  kR: number;
  L: number;
  /** Фазы рассеяния δ_l: tg δ_l = j_l(kR)/y_l(kR). */
  delta: number[];
  /** σ/πR² = 4/(kR)² · Σ(2l+1) sin²δ_l. */
  sigma: number;
  /** Число «работающих» парциальных волн — дающих не меньше 1 % сечения. */
  waves: number;
  /** Угловое распределение |f(θ)|² в единицах R². */
  intensity: (theta: number) => number;
}

/** Рассеяние нейтронной волны на непроницаемой сфере радиуса R при параметре kR = R/ƛ. */
export function hardSphere(kR: number): HardSphere {
  const L = Math.ceil(kR) + 8;
  const { j, y } = sphericalBessel(L, kR);
  const delta = j.map((jj, l) => Math.atan(jj / y[l]!));
  const parts = delta.map((d, l) => (2 * l + 1) * Math.sin(d) ** 2);
  const sum = parts.reduce((a, b) => a + b, 0);
  // «Работает» волна, дающая не меньше 1 % сечения: абсолютный порог sin²δ > 0.01 при малых kR отбросил бы даже s-волну.
  const waves = parts.filter((p) => p >= 0.01 * sum).length;
  const intensity = (theta: number) => {
    const P = legendre(L, Math.cos(theta));
    let re = 0, im = 0;
    delta.forEach((d, l) => { const s = Math.sin(d); re += (2 * l + 1) * Math.cos(d) * s * P[l]!; im += (2 * l + 1) * s * s * P[l]!; });
    return (re * re + im * im) / (kR * kR);
  };
  return { kR, L, delta, sigma: (4 / (kR * kR)) * sum, waves, intensity };
}

/**
 * Комплексные коэффициенты рассеянной волны при R = 1: ψ_sc = Σ c_l h_l(kr) P_l(cos θ),
 * где c_l = −(2l+1) iˡ j_l(k)/h_l(k), h_l = j_l + i y_l. Плюс падающая волна e^{ikx} даёт полное поле.
 */
export function scatteredCoefficients(kR: number) {
  const L = Math.ceil(kR) + 8;
  const { j, y } = sphericalBessel(L, kR);
  const re: number[] = [], im: number[] = [];
  const iPow = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
  for (let l = 0; l <= L; l++) {
    const den = j[l]! * j[l]! + y[l]! * y[l]!;
    const qr = (j[l]! * j[l]!) / den, qi = (-j[l]! * y[l]!) / den; // j/h = j(j − i y)/(j² + y²)
    const [ar, ai] = iPow[l % 4]!;
    re.push(-(2 * l + 1) * (ar * qr - ai * qi));
    im.push(-(2 * l + 1) * (ar * qi + ai * qr));
  }
  /** Комплексная амплитуда поля в точке плоскости (x вдоль пучка, z поперёк) при радиусе ядра 1. */
  return (x: number, z: number, scatteredOnly = false): [number, number] => {
    const r = Math.hypot(x, z);
    if (r < 1) return [0, 0];
    const b = sphericalBessel(L, kR * r);
    const P = legendre(L, x / r);
    let sr = 0, si = 0;
    for (let l = 0; l <= L; l++) {
      const hr = b.j[l]!, hi = b.y[l]!;
      sr += (re[l]! * hr - im[l]! * hi) * P[l]!;
      si += (re[l]! * hi + im[l]! * hr) * P[l]!;
    }
    return scatteredOnly ? [sr, si] : [Math.cos(kR * x) + sr, Math.sin(kR * x) + si];
  };
}

/** Энергия нейтрона, при которой kR принимает заданное значение для ядра радиуса R (по умолчанию ²³⁸U, 8.7 фм). */
export const energyForKR = (kR: number, R = 8.7e-13) => ((4.5516e-10 * kR) / R) ** 2;

/* ---------- Резонанс Брейта — Вигнера и доплеровское уширение ---------- */

export const HBAR = 6.582e-16; // эВ·с

/** Сечение радиационного захвата в одиночном резонансе ²³⁸U, барн. */
export function breitWignerCapture(E: number, E0: number, Gn: number, Gg: number): number {
  const G = Gn + Gg;
  const s0 = ((2.6e6 * 1.0084) / E0) * (Gn / G);
  const x = (2 * (E - E0)) / G;
  return (s0 * (Gg / G) * Math.sqrt(E0 / E)) / (1 + x * x);
}

/** Доплеровская ширина Δ = √(4E₀kT/A), эВ. */
export const dopplerWidth = (E0: number, T: number, A: number) => Math.sqrt((4 * E0 * 8.617e-5 * Math.max(T, 0)) / A);

/** Резонанс на равномерной сетке без уширения и после свёртки с гауссианом ширины Δ; пик и площадь. */
export function resonance(E0: number, Gn: number, Gg: number, T: number, A = 238, half = 1.2, n = 3001) {
  const h = (2 * half) / (n - 1);
  const E = Array.from({ length: n }, (_, i) => E0 - half + i * h);
  const cold = E.map((e) => breitWignerCapture(e, E0, Gn, Gg));
  const D = dopplerWidth(E0, T, A);
  let hot = cold;
  if (D > h) {
    const m = Math.ceil((4 * D) / h);
    const w: number[] = [];
    let ws = 0;
    for (let k = -m; k <= m; k++) { const v = Math.exp(-(((k * h) / D) ** 2)); w.push(v); ws += v; }
    hot = cold.map((_, i) => {
      let acc = 0;
      for (let k = -m; k <= m; k++) { const j = i + k; if (j >= 0 && j < n) acc += w[k + m]! * cold[j]!; }
      return acc / ws;
    });
  }
  const area = (s: number[]) => s.reduce((a, v) => a + v * h, 0);
  return { E, cold, hot, D, tau: HBAR / (Gn + Gg), branching: Gg / (Gn + Gg), peakCold: Math.max(...cold), peakHot: Math.max(...hot), areaCold: area(cold), areaHot: area(hot) };
}

/* ---------- Статистика уровней ---------- */

export const wigner = (s: number) => ((Math.PI * s) / 2) * Math.exp((-Math.PI * s * s) / 4);
export const poisson = (s: number) => Math.exp(-s);
export const porterThomas = (x: number) => Math.exp(-x / 2) / Math.sqrt(2 * Math.PI * x);

function gauss(rng: Rng): number {
  let u = 0;
  while (!u) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface Level { E: number; spacing: number; x: number; Gn: number }

/** «Лестница» из N уровней: расстояния по Вигнеру или Пуассону со средним 20 эВ, ширины по Портеру — Томасу. */
export function levelLadder(law: 'wigner' | 'poisson', rng: Rng, N = 400, meanSpacing = 20, meanGn = 0.002): Level[] {
  let E = 5;
  const out: Level[] = [];
  for (let i = 0; i < N; i++) {
    const xi = 1 - rng();
    const spacing = law === 'wigner' ? Math.sqrt((-4 / Math.PI) * Math.log(xi)) : -Math.log(xi);
    E += spacing * meanSpacing;
    const g = gauss(rng);
    out.push({ E, spacing, x: g * g, Gn: meanGn * g * g * Math.sqrt(E / 100) });
  }
  return out;
}

/** Сечение захвата лестницы резонансов на 1/v-фоне, барн. */
export function ladderCapture(levels: readonly Level[], E: number, Gg = 0.023): number {
  let s = 2.7 * Math.sqrt(0.0253 / E);
  for (const r of levels) {
    if (r.E > E + 60) break;
    const G = r.Gn + Gg, x = (2 * (E - r.E)) / G;
    if (Math.abs(x) > 4000) continue;
    s += ((2.6e6 / r.E) * (r.Gn / G) * (Gg / G) * Math.sqrt(r.E / E)) / (1 + x * x);
  }
  return s;
}

/* ---------- Каналы реакции ---------- */

export type Channel = 'el' | 'in' | 'cap' | 'fis' | 'alpha';
export const CHANNEL_NAMES: Record<Channel, string> = {
  el: 'упругое рассеяние', in: 'неупругое (n, n′γ)', cap: 'захват (n, γ)', fis: 'деление', alpha: '(n, α)',
};

/** Сечения каналов, барн: тепловые — из приложений пособия, при 2 МэВ — приближённые оценённые значения. */
export const NUCLEI = {
  u235: { label: '²³⁵U', A: 235, Z: 92, thermal: [['el', 15.0], ['cap', 98.6], ['fis', 582.2]], fast: [['el', 4.3], ['in', 1.6], ['cap', 0.07], ['fis', 1.27]] },
  u238: { label: '²³⁸U', A: 238, Z: 92, thermal: [['el', 9.0], ['cap', 2.7]], fast: [['el', 4.4], ['in', 2.6], ['cap', 0.04], ['fis', 0.54]] },
  c12: { label: '¹²C', A: 12, Z: 6, thermal: [['el', 4.75], ['cap', 0.0034]], fast: [['el', 1.7], ['cap', 0.0001]] },
  h1: { label: '¹H', A: 1, Z: 1, thermal: [['el', 20.4], ['cap', 0.332]], fast: [['el', 2.9], ['cap', 0.00003]] },
  b10: { label: '¹⁰B', A: 10, Z: 5, thermal: [['el', 2.2], ['cap', 0.5], ['alpha', 3837]], fast: [['el', 1.6], ['in', 0.6], ['alpha', 0.35]] },
} as const satisfies Record<string, { label: string; A: number; Z: number; thermal: readonly (readonly [Channel, number])[]; fast: readonly (readonly [Channel, number])[] }>;
export type NucleusId = keyof typeof NUCLEI;

/** Каналы с вероятностями σ_i/σ_tot. */
export function channels(nucleus: NucleusId, energy: 'thermal' | 'fast') {
  const list = NUCLEI[nucleus][energy];
  const total = list.reduce((s, [, v]) => s + v, 0);
  return list.map(([ch, sigma]) => ({ channel: ch, sigma, p: sigma / total }));
}

export function sampleChannel(list: readonly { channel: Channel; p: number }[], rng: Rng): Channel {
  let x = rng();
  for (const c of list) { x -= c.p; if (x < 0) return c.channel; }
  return list[list.length - 1]!.channel;
}
