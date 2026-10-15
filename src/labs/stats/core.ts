/**
 * Описательная статистика выборки: распределение, моменты, медиана, квантили, гистограмма
 * (Хохлов, Дмитриева, разд. 1 «Случайные величины и их распределения»).
 */

export interface Distribution {
  /** Различные значения xᵢ по возрастанию. */
  x: number[];
  /** Сколько раз встретилось каждое значение. */
  count: number[];
  /** Вероятности pᵢ = nᵢ/N; их сумма — 1. */
  p: number[];
}

/** Распределение выборки: значения xᵢ, их частоты и вероятности P(xᵢ). */
export function distribution(xs: readonly number[]): Distribution {
  const m = new Map<number, number>();
  for (const v of xs) m.set(v, (m.get(v) ?? 0) + 1);
  const x = [...m.keys()].sort((a, b) => a - b);
  const count = x.map((v) => m.get(v)!);
  return { x, count, p: count.map((c) => c / xs.length) };
}

export interface Moments {
  /** μ₁ = x̄ — среднее. */
  mean: number;
  /** μ₂ = ⟨x²⟩ — средний квадрат. */
  mean2: number;
  /** D = μ₂ − μ₁². */
  variance: number;
  /** σ = √D. */
  sigma: number;
}

/** Моменты дискретного распределения: μₙ = Σ xᵢⁿ P(xᵢ). Вероятности нормируются на их сумму. */
export function moments(x: readonly number[], p: readonly number[]): Moments {
  const norm = p.reduce((s, v) => s + v, 0);
  let m1 = 0, m2 = 0;
  x.forEach((v, i) => { m1 += (v * p[i]!) / norm; m2 += (v * v * p[i]!) / norm; });
  const variance = Math.max(0, m2 - m1 * m1);
  return { mean: m1, mean2: m2, variance, sigma: Math.sqrt(variance) };
}

/** Моменты выборки (μₙ = Σxᵢⁿ/N) и погрешность среднего σ/√N. */
export function sampleMoments(xs: readonly number[]): Moments & { n: number; sem: number } {
  const m = moments(xs, xs.map(() => 1));
  return { ...m, n: xs.length, sem: m.sigma / Math.sqrt(xs.length) };
}

/**
 * Медиана выборки: половина элементов не меньше неё, половина — не больше.
 * При чётном N — среднее двух центральных, как в примере 1.1 пособия.
 */
export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k]! : (s[k - 1]! + s[k]!) / 2;
}

/**
 * η-квантиль дискретного распределения: наименьшее xₖ, для которого накопленная вероятность
 * Σ_{i≤k} P(xᵢ) достигает η. Для медианы (η = 0.5) при точном попадании в 0.5 берётся середина
 * между xₖ и следующим значением — так же, как у выборки чётной длины.
 */
export function quantile(xs: readonly number[], eta: number): number {
  const d = distribution(xs);
  let cum = 0;
  for (let i = 0; i < d.x.length; i++) {
    cum += d.p[i]!;
    if (Math.abs(cum - eta) < 1e-12 && i + 1 < d.x.length) return (d.x[i]! + d.x[i + 1]!) / 2;
    if (cum >= eta - 1e-12) return d.x[i]!;
  }
  return d.x[d.x.length - 1]!;
}

/** Мода — значение с наибольшей вероятностью (если их несколько — все). */
export function modes(xs: readonly number[]): number[] {
  const d = distribution(xs);
  const top = Math.max(...d.count);
  return d.x.filter((_, i) => d.count[i] === top);
}

/** Взвешенная таблица (значение, доля): среднее и медиана — для задачи о зарплатах. */
export function tableStats(rows: readonly { x: number; w: number }[]) {
  const total = rows.reduce((s, r) => s + r.w, 0);
  const mean = rows.reduce((s, r) => s + r.x * r.w, 0) / total;
  const sorted = [...rows].sort((a, b) => a.x - b.x);
  let cum = 0, med = sorted[0]?.x ?? NaN;
  for (const r of sorted) {
    cum += r.w / total;
    if (cum >= 0.5 - 1e-12) { med = r.x; break; }
  }
  return { mean, median: med, total };
}

/** Числа из строки: «10 1 4 3», «1,5; 2,5» → [10, 1, 4, 3], [1.5, 2.5]. Цепочку цифр без пробелов «10110» читает поцифренно. */
export function parseSample(text: string): number[] {
  const t = text.trim();
  if (/^[0-9]+$/.test(t.replace(/\s+/g, '')) && !/\s/.test(t) && t.length > 3) return [...t].map(Number);
  return t.split(/[\s;]+/).map((s) => s.replace(',', '.')).filter((s) => s !== '').map(Number).filter((v) => Number.isFinite(v));
}

/** Гистограмма: число попаданий в бины шириной (hi − lo)/bins. Значения вне [lo, hi) не считаются. */
export function histogram(xs: readonly number[], lo: number, hi: number, bins: number): number[] {
  const out = new Array<number>(bins).fill(0);
  const w = (hi - lo) / bins;
  for (const v of xs) {
    const b = Math.floor((v - lo) / w);
    if (b >= 0 && b < bins) out[b]!++;
  }
  return out;
}

/** Нарастающее среднее: mᵢ = (x₁ + … + xᵢ)/i. */
export function runningMean(xs: readonly number[]): number[] {
  let s = 0;
  return xs.map((v, i) => (s += v) / (i + 1));
}
