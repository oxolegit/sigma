import { describe, expect, it } from 'vitest';
import {
  densityHistogram, emptyTally, firstCollisionDensity, sampleFreePath, slabHistory, tally, transmission,
} from '../src/labs/tpn/freePath';
import { mulberry32 } from '../src/lib/rng';

describe('закон ослабления', () => {
  it('на глубине λ = 1/Σ проходит 1/e пучка', () => {
    expect(transmission(0.4, 2.5)).toBeCloseTo(Math.exp(-1), 12);
  });
  it('плотность первого столкновения нормирована', () => {
    const S = 0.7;
    let sum = 0;
    const dx = 1e-3;
    for (let x = dx / 2; x < 40 / S; x += dx) sum += firstCollisionDensity(S, x) * dx;
    expect(sum).toBeCloseTo(1, 4);
  });
});

describe('Монте-Карло пробега', () => {
  const S = 0.5;
  const rng = mulberry32(42);
  const xs = Array.from({ length: 200_000 }, () => sampleFreePath(S, rng));

  it('средний пробег сходится к λ = 1/Σ', () => {
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.99 / S);
    expect(mean).toBeLessThan(1.01 / S);
  });
  it('доля пробегов длиннее X сходится к e^{−ΣX}', () => {
    const X = 2;
    const frac = xs.filter((x) => x > X).length / xs.length;
    expect(frac).toBeCloseTo(transmission(S, X), 2);
  });
  it('гистограмма плотности повторяет w(x)', () => {
    const xmax = 5 / S;
    const h = densityHistogram(xs, 25, xmax);
    const w = xmax / 25;
    expect(h[0]).toBeCloseTo((1 - Math.exp(-S * w)) / w, 1);
  });
  it('пустая гистограмма — нули', () => {
    expect(densityHistogram([], 4, 1)).toEqual([0, 0, 0, 0]);
  });
});

describe('пучок на пластину', () => {
  const run = (X: number, c: number, n: number, seed = 7) => {
    const rng = mulberry32(seed);
    let t = emptyTally();
    for (let i = 0; i < n; i++) t = tally(t, slabHistory(X, c, rng).fate);
    return t;
  };

  it('исходы складываются в число историй', () => {
    const t = run(1.5, 0.8, 5000);
    expect(t.uncollided + t.scattered + t.reflected + t.absorbed).toBe(t.n);
  });
  it('без столкновений проходит e^{−X} независимо от рассеяния', () => {
    const t = run(1.5, 0.8, 100_000);
    expect(t.uncollided / t.n).toBeCloseTo(Math.exp(-1.5), 2);
  });
  it('чистый поглотитель: прошли всего = прошли без столкновений', () => {
    const t = run(1.5, 0, 20_000);
    expect(t.scattered).toBe(0);
    expect(t.reflected).toBe(0);
  });
  it('с рассеянием детектор видит больше, чем e^{−X}', () => {
    const t = run(1.5, 0.9, 50_000);
    expect((t.uncollided + t.scattered) / t.n).toBeGreaterThan(Math.exp(-1.5) + 0.05);
  });
  it('трек начинается в точке входа и для вылетевших кончается хвостом снаружи', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const h = slabHistory(2, 0.8, rng, true);
      expect(h.path[0]).toEqual([0, 0, 0]); // точка входа по умолчанию — на оси пучка
      const end = h.path[h.path.length - 1]!;
      if (h.fate === 'reflected') expect(end[0]).toBeLessThan(0);
      if (h.fate === 'uncollided' || h.fate === 'scattered') expect(end[0]).toBeGreaterThan(2);
    }
  });
  it('точка входа сдвигает трек поперёк, но не меняет физику', () => {
    const a = slabHistory(2, 0.8, mulberry32(5), true);
    const b = slabHistory(2, 0.8, mulberry32(5), true, [0.3, -0.2]);
    expect(b.fate).toBe(a.fate);
    expect(b.path[0]).toEqual([0, 0.3, -0.2]);
    b.path.forEach((q, i) => {
      expect(q[0]).toBeCloseTo(a.path[i]![0], 12);
      expect(q[1] - a.path[i]![1]).toBeCloseTo(0.3, 12);
    });
  });
  it('одинаковое зерно — одинаковый результат', () => {
    expect(run(1, 0.5, 1000, 11)).toEqual(run(1, 0.5, 1000, 11));
  });
});
