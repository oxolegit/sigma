import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkAnswer, parseAnswer } from '../src/lib/answer';
import { mulberry32 } from '../src/lib/rng';
import { moments } from '../src/labs/stats/core';
import { fwhm, normalize, simpson } from '../src/labs/stats/density';
import { exactlyK, randomCoincidenceRate } from '../src/labs/stats/geometry';
import { poissonPmf, poissonTail } from '../src/labs/stats/poisson';
import { BAR, negLogL, sumSquares } from '../src/labs/stats/fit';
import { FIXED_VARIANTS, generators, makeVariant, variantSize, type VariantTask } from '../src/labs/stats/variants';

/**
 * Варианты самостоятельных: каждый генератор на сотнях зёрен, ответ пересчитан другим путём —
 * численным интегралом, таблицей моментов, перебором, минимизацией.
 */

const close = (a: number, b: number, rel = 2e-3, abs = 1e-9) => Math.abs(a - b) <= rel * Math.abs(b) + abs;
type M = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Плотность из ненормированной y: C, x̄, σ численно. */
const dens = (y: (x: number) => number, a: number, b: number) => {
  const d = normalize({ id: 't', label: '', tex: '', y, support: [a, b], view: [a, b] }, 20000);
  return [d.c, d.mean, d.sigma];
};
/** Поиск минимума на отрезке золотым сечением. */
const argmin = (f: (x: number) => number, a: number, b: number) => {
  for (let i = 0; i < 200; i++) { const m1 = a + (b - a) * 0.382, m2 = a + (b - a) * 0.618; if (f(m1) < f(m2)) b = m2; else a = m1; }
  return (a + b) / 2;
};

/** Независимый пересчёт ответа по meta. */
function expected(t: VariantTask): number[] {
  const m = t.meta as M;
  switch (m.kind) {
    case 'table': { const r = moments(m.x, m.p); expect(m.p.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 12); return [r.mean, r.sigma]; }
    case 'linear': { const n = Array.from({ length: m.K + 1 }, (_, i) => i); const w = n.map((k) => k + 1); const r = moments(n, w); return [1 / w.reduce((a, b) => a + b, 0), r.mean, r.sigma]; }
    case 'geom': { const n = Array.from({ length: 200 }, (_, i) => i); const w = n.map((k) => m.k ** -k); const r = moments(n, w); return [1 / w.reduce((a, b) => a + b, 0), r.mean, r.sigma]; }
    case 'die': { const r = moments(Array.from({ length: m.k }, (_, i) => i + 1), Array(m.k).fill(1)); return [r.mean, r.sigma]; }
    case 'pow': return dens((x) => (x >= 0 && x <= m.b ? x ** m.m : 0), 0, m.b);
    case 'exp': return dens((x) => Math.exp(-x / m.a), 0, 60 * m.a);
    case 'parab': return dens((x) => (x >= 0 && x <= m.b ? x * (m.b - x) : 0), 0, m.b);
    case 'xexp': return dens((x) => x * Math.exp(-x / m.a), 0, 80 * m.a);
    case 'gauss': return [fwhm((x) => Math.exp(-((x - m.mu) ** 2) / m.k), m.mu - 30, m.mu + 30, 20000).width];
    case 'lorentz': return [fwhm((x) => 1 / (1 + (x - m.mu) ** 2 / (m.g * m.g)), m.mu - 60, m.mu + 60, 40000).width];
    case 'laplace': return [fwhm((x) => Math.exp(-Math.abs(x) / m.a), -40, 40, 40000).width];
    case 'dead': { // доля площади вне круга — интегралом по хордам
      const inCircle = simpson((x) => 2 * Math.sqrt(Math.max(0, m.r * m.r - x * x)), -m.r, m.r, 20000);
      return [1 - inCircle / (m.L * m.L)];
    }
    case 'frame': return [1 - ((m.L - 2 * m.d) / m.L) ** 2];
    case 'window': { const T = m.T * 1000; return [simpson((t1) => (Math.min(T, t1 + m.tau) - Math.max(0, t1 - m.tau)) / T, 0, T, 20000) / T]; }
    case 'rod': return [simpson((u) => (Math.min(u, 1 - u) < 1 / m.k ? 1 : 0), 0, 1, 200000)];
    case 'two': { const d = exactlyK([m.p1, m.p2]); return [1 - d[0]!, d[1]!]; }
    case 'three': { const d = exactlyK([m.p, m.p, m.p]); return [d[3]!, d[2]! + d[3]!]; }
    case 'coinc': return [randomCoincidenceRate(m.nu1, m.nu2, m.tau * 1e-9)];
    case 'pois': return [poissonPmf(m.l, 0), 1 - poissonPmf(m.l, 0) - poissonPmf(m.l, 1)];
    case 'frac': return [1 - poissonPmf(m.nu * m.tau * 1e-6, 0)];
    case 'two-ch': { const x = m.nu * m.tau * 1e-6; return [1 - poissonPmf(x, 0) - poissonPmf(x, 1)]; }
    case 'nonpar': return [1 / (1 / m.nTrue + m.tau * 1e-6)];
    case 'nonpar-true': { const tau = m.tau * 1e-6, k = 1 - m.m * tau; return [m.m / k, Math.sqrt(m.m / m.t) / k ** 2]; }
    case 'rate': return [m.N / m.t, Math.sqrt(m.N) / m.t];
    case 'bg': return [(m.N - m.Nb) / m.t, Math.sqrt(m.N / m.t ** 2 + m.Nb / m.t ** 2)];
    case 'precision': { const N = (100 / m.d) ** 2; return [N, N / m.nu]; }
    case 'gt': return [poissonTail(m.l, m.k)];
    case 'ge': { let s = 0; for (let n = m.k; n < 200; n++) s += poissonPmf(m.l, n); return [s]; }
    case 'gt-window': { let s = 0; for (let n = m.k + 1; n < 200; n++) s += poissonPmf(m.nu * m.t, n); return [s]; }
    case 'exact': return [(m.nu * m.t) ** m.k * Math.exp(-m.nu * m.t) / [1, 1, 2, 6, 24, 120][m.k]!];
    case 'mode': { const p = Array.from({ length: 60 }, (_, n) => poissonPmf(m.l, n)); const k = p.indexOf(Math.max(...p)); return [k, p[k]!]; }
    case 'pmf': return [m.l ** m.k * Math.exp(-m.l) / [1, 1, 2, 6, 24, 120][m.k]!];
    case 'zero-rate': return [-Math.log(1 - m.cl) / (m.T * 3600)];
    case 'proton': return [((m.M * 1000) / 18) * 6.022e23 * 10 * m.yrs / -Math.log(1 - m.cl)];
    case 'zero-l': return [-Math.log(1 - m.cl)];
    case 'true': { const x = m.N / m.t, tau = m.tau * 1e-6; return [x / (1 - x * tau), Math.sqrt(m.N) * m.t / (m.t - m.N * tau) ** 2]; }
    case 'count': return [m.v * Math.exp(-m.v * m.tau * 1e-6) * m.t];
    case 'frac-ms': return [1 - Math.exp(-m.nu * m.tau * 1e-3)];
    case 'wmean': { const s = (v: number) => (v - m.a[0]) ** 2 / m.s[0] ** 2 + (v - m.a[1]) ** 2 / m.s[1] ** 2; const a = argmin(s, 5, 15); return [a, Math.sqrt(1 / (m.s[0] ** -2 + m.s[1] ** -2))]; }
    case 'line': {
      // Минимум S(k, b): по b — аналитически при заданном k, по k — золотым сечением.
      const bOf = (k: number) => m.y.reduce((s: number, y: number, i: number) => s + y - k * m.x[i], 0) / m.x.length;
      const k = argmin((k) => sumSquares(m.x, m.y, k, bOf(k)), -10, 20);
      return [k, bOf(k)];
    }
    case 'pmle': {
      const L = (l: number) => m.c.reduce((s: number, n: number) => s - Math.log(poissonPmf(l, n)), 0);
      const l = argmin(L, 0.01, 30);
      return [l, 1 / Math.sqrt(m.c.reduce((s: number, n: number) => s + n, 0) / l ** 2)];
    }
    case 'pmt': return [argmin((x) => negLogL(x, m.a1, m.a2), 0, BAR.length)];
    default: throw new Error(`Неизвестный тип ${m.kind}`);
  }
}

describe.each([1, 2])('самостоятельная %i: генераторы вариантов', (work) => {
  it('шесть тем, в каждой несколько типов задач', () => {
    expect(variantSize(work)).toBe(6);
    for (const gens of generators(work)) expect(gens.length).toBeGreaterThanOrEqual(3);
  });

  const cache = new Map<string, number[]>();
  it('каждый ответ на 300 зёрнах совпадает с независимым пересчётом', { timeout: 120_000 }, () => {
    generators(work).forEach((gens, slot) => gens.forEach((gen, g) => {
      for (let seed = 1; seed <= 300; seed++) {
        const t = gen(mulberry32(seed * 31 + slot * 1009 + g));
        // Параметров у типа немного — пересчёт кэшируется по исходным данным.
        const key = JSON.stringify(t.meta);
        const exp = cache.get(key) ?? expected(t);
        cache.set(key, exp);
        expect(t.answers, `${t.meta.kind}`).toHaveLength(exp.length);
        t.answers.forEach((a, i) => {
          expect(Number.isFinite(a.value), `${t.meta.kind} seed ${seed}`).toBe(true);
          expect(close(a.value, exp[i]!, 3e-3, 1e-6), `${t.meta.kind} seed ${seed}: ${a.value} vs ${exp[i]}`).toBe(true);
        });
        expect(t.q).not.toMatch(/NaN|undefined|Infinity/);
        expect(t.answer).not.toMatch(/NaN|undefined|Infinity/);
      }
    }));
  });

  it('варианты 1–4 одинаковы при каждом открытии и различаются между собой', () => {
    const qs = Array.from({ length: FIXED_VARIANTS }, (_, i) => makeVariant(work, i + 1).map((t) => t.q).join('|'));
    expect(new Set(qs).size).toBe(FIXED_VARIANTS);
    expect(makeVariant(work, 3).map((t) => t.q)).toEqual(makeVariant(work, 3).map((t) => t.q));
    // Типы задач в фиксированных вариантах идут по кругу — в первой теме все варианты разные по виду.
    const kinds = Array.from({ length: FIXED_VARIANTS }, (_, i) => makeVariant(work, i + 1)[0]!.meta.kind);
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(3);
  });

  it('эталонный ответ засчитывается проверкой, а грубо неверный — нет', () => {
    for (let v = 1; v <= 60; v++) for (const t of makeVariant(work, v)) for (const a of t.answers) {
      expect(checkAnswer(String(a.value), a.value, a.tol, a.abs)).toBe('ok');
      expect(checkAnswer(String(a.value * 1.5 + 1), a.value, a.tol, a.abs)).not.toBe('ok');
    }
  });

  it(`страница sr${work}.mdx показывает вариант, а не отдельные задачи`, () => {
    const src = readFileSync(`src/content/exams/stats/sr${work}.mdx`, 'utf8');
    expect(src).toContain(`<SrVariant client:load work={${work}} />`);
    expect(src).not.toContain('<SrTask');
  });
});

describe('проверка ответа', () => {
  it('читает запись как на бумаге', () => {
    expect(parseAnswer('0,87')).toBeCloseTo(0.87, 12);
    expect(parseAnswer('1.5·10^32')).toBeCloseTo(1.5e32, -20);
    expect(parseAnswer('1.5e32')).toBeCloseTo(1.5e32, -20);
    expect(parseAnswer('2/3')).toBeCloseTo(2 / 3, 12);
    expect(parseAnswer('1 − e^(−0.1)')).toBeCloseTo(1 - Math.exp(-0.1), 12);
    expect(parseAnswer('9.5 %')).toBeCloseTo(0.095, 12);
    expect(parseAnswer('6.4·10⁻⁴')).toBeCloseTo(6.4e-4, 12);
    expect(parseAnswer('10 000')).toBe(10000);
    expect(parseAnswer('sqrt(3)')).toBeCloseTo(Math.sqrt(3), 12);
    expect(Number.isNaN(parseAnswer('абв'))).toBe(true);
  });
  it('допуск 2 % по умолчанию, «близко» — до 10 %, абсолютный — около нуля', () => {
    expect(checkAnswer('0.857', 0.857375)).toBe('ok');
    expect(checkAnswer('0.83', 0.857375)).toBe('close');
    expect(checkAnswer('0.5', 0.857375)).toBe('wrong');
    expect(checkAnswer('x', 1)).toBe('unreadable');
    expect(checkAnswer('0', 0)).toBe('ok');
    expect(checkAnswer('0.1', 0.12)).not.toBe('ok');
    expect(checkAnswer('0.1', 0.12, 0.02, 0.05)).toBe('ok');
  });
});
