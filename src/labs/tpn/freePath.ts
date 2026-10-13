import { isotropic, type Rng } from '../../lib/rng';

/** Доля нейтронов узкого пучка, прошедших слой x без взаимодействия: e^{−Σx}. */
export function transmission(sigma: number, x: number): number {
  return Math.exp(-sigma * x);
}

/** Длина свободного пробега до первого взаимодействия: x = −ln ξ / Σ. */
export function sampleFreePath(sigma: number, rng: Rng): number {
  return -Math.log(1 - rng()) / sigma;
}

/** Плотность вероятности первого взаимодействия на глубине x: w(x) = Σ e^{−Σx}. */
export function firstCollisionDensity(sigma: number, x: number): number {
  return sigma * Math.exp(-sigma * x);
}

/** Гистограмма плотности: столбцы ширины width от 0, нормированы на число отсчётов. */
export function densityHistogram(xs: readonly number[], bins: number, xmax: number): number[] {
  const width = xmax / bins;
  const h = new Array<number>(bins).fill(0);
  for (const x of xs) {
    const b = Math.floor(x / width);
    if (b >= 0 && b < bins) h[b]!++;
  }
  return xs.length ? h.map((v) => v / (xs.length * width)) : h;
}

export type Fate = 'uncollided' | 'scattered' | 'reflected' | 'absorbed';
export type Point3 = [number, number, number];
export interface History { fate: Fate; path: Point3[] }
export interface SlabTally { n: number; uncollided: number; scattered: number; reflected: number; absorbed: number }

export const emptyTally = (): SlabTally => ({ n: 0, uncollided: 0, scattered: 0, reflected: 0, absorbed: 0 });

/**
 * История нейтрона в пластине толщиной X (в длинах свободного пробега, Σ = 1).
 * Пучок падает по нормали в точку входа (0, y, z) и идёт вдоль +x. В каждом столкновении
 * с вероятностью c = Σs/Σt — изотропное рассеяние, иначе поглощение.
 * Пластина бесконечна поперёк, поэтому точка входа на физику не влияет — она нужна,
 * чтобы на рисунке пучок имел сечение и нейтроны без столкновений не сливались в одну линию.
 * Путь записывается, только если keepPath: для 20 000 историй треки не нужны.
 */
export function slabHistory(X: number, c: number, rng: Rng, keepPath = false, entry: [number, number] = [0, 0]): History {
  let p: Point3 = [0, entry[0], entry[1]];
  let u: Point3 = [1, 0, 0];
  let collisions = 0;
  const path: Point3[] = keepPath ? [p] : [];
  for (let step = 0; step < 10_000; step++) {
    const l = sampleFreePath(1, rng);
    const q: Point3 = [p[0] + u[0] * l, p[1] + u[1] * l, p[2] + u[2] * l];
    if (q[0] >= X || q[0] <= 0) {
      // Вылет: точка пересечения с гранью и короткий хвост наружу.
      const face = q[0] >= X ? X : 0;
      const t = (face - p[0]) / u[0];
      const exit: Point3 = [face, p[1] + u[1] * t, p[2] + u[2] * t];
      if (keepPath) path.push(exit, [exit[0] + u[0] * 0.3 * X, exit[1] + u[1] * 0.3 * X, exit[2] + u[2] * 0.3 * X]);
      const fate: Fate = face === 0 ? 'reflected' : collisions ? 'scattered' : 'uncollided';
      return { fate, path };
    }
    p = q;
    if (keepPath) path.push(p);
    collisions++;
    if (rng() >= c) return { fate: 'absorbed', path };
    u = isotropic(rng);
  }
  return { fate: 'absorbed', path };
}

/** Добавляет историю в счётчик. */
export function tally(t: SlabTally, fate: Fate): SlabTally {
  return { ...t, n: t.n + 1, [fate]: t[fate] + 1 };
}
