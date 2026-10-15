/**
 * Непрерывные случайные величины: от ненормированной функции y(x) к плотности f(x),
 * функции распределения F(x), моментам, квантилям и FWHM (пособие, разд. 1, 4–6).
 * Всё считается численно (Симпсон, бисекция); тесты сверяют с ответами, полученными руками.
 */

/** Интеграл Симпсона на [a, b], n — чётное число отрезков. */
export function simpson(f: (x: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Корень монотонной функции на [lo, hi] бисекцией: g(lo) и g(hi) разных знаков. */
export function bisect(g: (x: number) => number, lo: number, hi: number, iter = 200): number {
  let glo = g(lo);
  for (let i = 0; i < iter; i++) {
    const mid = (lo + hi) / 2;
    const gm = g(mid);
    if ((gm > 0) === (glo > 0)) { lo = mid; glo = gm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface Shape {
  id: string;
  /** Подпись в выборе: «y = 0.5x на (1; 3)». */
  label: string;
  /** TeX ненормированной функции. */
  tex: string;
  /** Ненормированная функция y(x) ≥ 0; вне носителя — 0. Концы носителя включены: на них опирается интеграл Симпсона. */
  y: (x: number) => number;
  /** Носитель — где считать интегралы; для бесконечных хвостов — обрезанный с запасом. */
  support: [number, number];
  /** Область рисунка по x. */
  view: [number, number];
  /** Нормировочная константа C = 1/∫y dx, как её записывают руками — для подписи. */
  cTex?: string;
}

export const SHAPES: Shape[] = [
  { id: 'uniform', label: 'прямоугольник на (a; b)', tex: '1', y: (x) => (x >= 1 && x <= 3 ? 1 : 0), support: [1, 3], view: [0, 4], cTex: '\\frac{1}{b-a}' },
  { id: 'up', label: 'y = 0.5x на (1; 3)', tex: '0.5x', y: (x) => (x >= 1 && x <= 3 ? 0.5 * x : 0), support: [1, 3], view: [0, 4], cTex: '\\frac{1}{2}' },
  { id: 'down', label: 'y = −0.5x + 3 на (1; 3)', tex: '-0.5x+3', y: (x) => (x >= 1 && x <= 3 ? -0.5 * x + 3 : 0), support: [1, 3], view: [0, 4], cTex: '\\frac{1}{4}' },
  { id: 'parab', label: 'y = x(2 − x) на [0; 2]', tex: 'x(2-x)', y: (x) => (x >= 0 && x <= 2 ? x * (2 - x) : 0), support: [0, 2], view: [-0.5, 2.5], cTex: '\\frac{3}{4}' },
  { id: 'exp', label: 'y = e^(−x/3), x ≥ 0', tex: 'e^{-x/3}', y: (x) => (x >= 0 ? Math.exp(-x / 3) : 0), support: [0, 90], view: [-1, 15], cTex: '\\frac{1}{3}' },
  { id: 'gamma', label: 'y = x²e^(−x), x ≥ 0', tex: 'x^2 e^{-x}', y: (x) => (x >= 0 ? x * x * Math.exp(-x) : 0), support: [0, 60], view: [-0.5, 10], cTex: '\\frac{1}{2}' },
];
export const shape = (id: string) => SHAPES.find((s) => s.id === id) ?? SHAPES[0]!;

/** Прямоугольник на (a; b) — отдельно: у него двигаются границы. */
export function uniformShape(a: number, b: number): Shape {
  return { ...SHAPES[0]!, y: (x) => (x >= a && x <= b ? 1 : 0), support: [a, b] };
}

export interface Continuous {
  /** Нормировочная константа C: f = C·y. */
  c: number;
  f: (x: number) => number;
  /** F(x) = ∫_{−∞}^{x} f dt. */
  F: (x: number) => number;
  mean: number;
  mean2: number;
  sigma: number;
  /** η-квантиль: F(x) = η. */
  quantile: (eta: number) => number;
}

/** Плотность из ненормированной y(x): C = 1/∫y, моменты через интегралы ∫xⁿf dx. */
export function normalize(s: Shape, n = 4000): Continuous {
  const [a, b] = s.support;
  const area = simpson(s.y, a, b, n);
  const c = 1 / area;
  const f = (x: number) => c * s.y(x);
  const mean = simpson((x) => x * f(x), a, b, n);
  const mean2 = simpson((x) => x * x * f(x), a, b, n);
  const F = (x: number) => (x <= a ? 0 : x >= b ? 1 : simpson(f, a, x, 400));
  const quantile = (eta: number) => bisect((x) => F(x) - eta, a, b, 60);
  return { c, f, F, mean, mean2, sigma: Math.sqrt(Math.max(0, mean2 - mean * mean)), quantile };
}

/** P(lo < x < hi) = F(hi) − F(lo). */
export const probBetween = (d: Continuous, lo: number, hi: number) => Math.max(0, d.F(Math.max(lo, hi)) - d.F(Math.min(lo, hi)));

/**
 * FWHM: координаты, где f падает до половины максимума слева и справа от моды.
 * Ищется по сетке на [a, b], затем уточняется бисекцией.
 */
export function fwhm(f: (x: number) => number, a: number, b: number, n = 4000) {
  let xm = a, fm = -Infinity;
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const v = f(x);
    if (v > fm) { fm = v; xm = x; }
  }
  const half = fm / 2;
  const g = (x: number) => f(x) - half;
  const left = g(a) < 0 ? bisect(g, a, xm) : a;
  const right = g(b) < 0 ? bisect(g, xm, b) : b;
  return { mode: xm, max: fm, left, right, width: right - left };
}

/* ---------- Распределения урока 4: Коши и Гаусс ---------- */

/** Коши с центром x₀ и полушириной γ: f = 1/(πγ(1 + ((x − x₀)/γ)²)). FWHM = 2γ, среднего нет. */
export const cauchy = {
  pdf: (x: number, x0 = 0, g = 1) => 1 / (Math.PI * g * (1 + ((x - x0) / g) ** 2)),
  cdf: (x: number, x0 = 0, g = 1) => 0.5 + Math.atan((x - x0) / g) / Math.PI,
  quantile: (eta: number, x0 = 0, g = 1) => x0 + g * Math.tan(Math.PI * (eta - 0.5)),
};

/** erf с точностью ~1e-7 (Абрамовиц — Стиган 7.1.26 даёт 1.5e-7; здесь — ряд и цепная дробь). */
export function erf(x: number): number {
  const s = Math.sign(x), z = Math.abs(x);
  if (z < 3) {
    // Ряд Тейлора сходится быстро при |x| < 3.
    let sum = z, term = z;
    for (let n = 1; n < 200; n++) {
      term *= (-z * z) / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17) break;
    }
    return (s * 2 * sum) / Math.sqrt(Math.PI);
  }
  // Асимптотика для хвоста: 1 − erf(z) ≈ e^{−z²}/(z√π)·(1 − 1/(2z²) + 3/(4z⁴)).
  const t = 1 / (z * z);
  return s * (1 - (Math.exp(-z * z) / (z * Math.sqrt(Math.PI))) * (1 - t / 2 + (3 * t * t) / 4 - (15 * t ** 3) / 8));
}

/** Гаусс со средним μ и σ. FWHM = 2√(2 ln 2)·σ ≈ 2.355σ. */
export const gauss = {
  pdf: (x: number, mu = 0, s = 1) => Math.exp(-(((x - mu) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI)),
  cdf: (x: number, mu = 0, s = 1) => 0.5 * (1 + erf((x - mu) / (s * Math.SQRT2))),
  quantile: (eta: number, mu = 0, s = 1) => bisect((x) => gauss.cdf(x, mu, s) - eta, mu - 12 * s, mu + 12 * s, 120),
};

/** Обратная функция распределения для розыгрыша: x = F⁻¹(r) по таблице значений F на сетке. */
export function inverseSampler(d: Continuous, a: number, b: number, n = 800) {
  const xs: number[] = [], Fs: number[] = [];
  let acc = 0, prev = d.f(a);
  const h = (b - a) / n;
  xs.push(a); Fs.push(0);
  for (let i = 1; i <= n; i++) {
    const x = a + i * h, v = d.f(x);
    acc += ((prev + v) / 2) * h;
    prev = v;
    xs.push(x); Fs.push(acc);
  }
  const total = acc;
  return (r: number) => {
    const t = r * total;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Fs[m]! < t) lo = m; else hi = m; }
    const span = Fs[hi]! - Fs[lo]!;
    return xs[lo]! + (span > 0 ? ((t - Fs[lo]!) / span) * h : 0);
  };
}
