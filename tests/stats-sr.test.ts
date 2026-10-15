import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkAnswer, parseAnswer } from '../src/lib/answer';
import { moments } from '../src/labs/stats/core';
import { fwhm, normalize, shape, simpson } from '../src/labs/stats/density';
import { exactlyK, randomCoincidenceRate } from '../src/labs/stats/geometry';
import {
  countRate, deadFraction, deadFractionTwoChannels, measuredNonParalyzable, measuredParalyzable, netRate, poissonCdf,
  poissonPmf, poissonTail, timeForPrecision, trueRate, zeroEventLimit,
} from '../src/labs/stats/poisson';
import { linearFit, mlePosition, weightedMean } from '../src/labs/stats/fit';

/**
 * Ответы задач самостоятельных записаны в MDX числами. Здесь каждое пересчитано
 * функциями курса или явной формулой — опечатка в листке не пройдёт.
 */

function tasks(path: string): Map<string, number[]> {
  const src = readFileSync(path, 'utf8');
  const out = new Map<string, number[]>();
  for (const m of src.matchAll(/<SrTask[^>]*?\bn="([\d.]+)"[\s\S]*?answers=\{\[([\s\S]*?)\]\}/g)) {
    out.set(m[1]!, [...m[2]!.matchAll(/value:\s*(-?[\d.e-]+)/g)].map((v) => Number(v[1])));
  }
  return out;
}

const gamma = normalize(shape('gamma'));
const expo = normalize(shape('exp'));
const lin = normalize({ ...shape('up'), y: (x) => (x >= 0 && x <= 2 ? x : 0), support: [0, 2] });
const geo = Array.from({ length: 80 }, (_, i) => i);
const geoM = moments(geo, geo.map((k) => 0.5 ** k));
const die = moments([1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1]);
const three = exactlyK([0.95, 0.95, 0.95]);

const SR1: Record<string, number[]> = {
  '1.1': [die.mean, die.sigma],
  '1.2': [moments([-1, 0, 2], [0.3, 0.2, 0.5]).mean, moments([-1, 0, 2], [0.3, 0.2, 0.5]).sigma],
  '1.3': [1 / geo.reduce((s, k) => s + 0.5 ** k, 0), geoM.mean, geoM.sigma],
  '2.1': [expo.c, expo.mean, expo.sigma],
  '2.2': [lin.c, lin.mean, lin.sigma],
  '2.3': [gamma.c, gamma.mean, gamma.sigma],
  '3.1': [fwhm((x) => 1 / (1 + (x - 2) ** 2 / 9), -40, 40).width],
  '3.2': [fwhm((x) => Math.exp(-Math.abs(x) / 2), -20, 20).width],
  '3.3': [fwhm((x) => x * x * Math.exp(-x), 0, 30).mode, fwhm((x) => x * x * Math.exp(-x), 0, 30).width],
  '4.1': [1 - (1 - 50 / 1000) ** 2],
  '4.2': [1 / 3 + 1 / 3],
  '4.3': [simpson((x) => x * x, 0, 1)],
  '5.1': [three[3]!, three[2]! + three[3]!],
  '5.2': [poissonPmf(2, 0), poissonPmf(2, 1), poissonTail(2, 1)],
  '5.3': [randomCoincidenceRate(1000, 500, 100e-9)],
  '6.1': [deadFraction(1e4, 10e-6)],
  '6.2': [measuredNonParalyzable(2000, 100e-6)],
  '6.3': [deadFractionTwoChannels(1000, 100e-6)],
};

const r43 = trueRate(4500, 10, 100e-6), r51 = trueRate(1500, 5, 1e-3), r52 = trueRate(10000, 100, 1e-3);
const wm = weightedMean([10, 11], [0.1, 0.2]);
const fit = linearFit([1, 2, 3, 4], [2, 4, 5, 8]);
const counts = [7, 9, 6, 10, 8, 8];
const SR2: Record<string, number[]> = {
  '1.1': [countRate(900, 60).rate, countRate(900, 60).sigma],
  '1.2': [timeForPrecision(50, 0.01).N, timeForPrecision(50, 0.01).t],
  '1.3': [netRate(1200, 100, 400, 100).rate, netRate(1200, 100, 400, 100).sigma],
  '2.1': [poissonTail(2, 1)],
  '2.2': [poissonTail(5 * 0.4, 3)],
  '2.3': [1 - poissonCdf(1, 1)],
  '3.1': [poissonPmf(5, 5)],
  '3.2': [poissonPmf(0.1 * 5, 1)],
  '3.3': [3, poissonPmf(3.5, 3)],
  '4.1': [zeroEventLimit(0.9) / 3600],
  '4.2': [deadFraction(50, 2e-3)],
  '4.3': [r43.rate, r43.sigma],
  '5.1': [r51.rate, r51.sigma],
  '5.2': [r52.rate, r52.sigma],
  '5.3': [measuredParalyzable(500, 200e-6) * 10],
  '6.1': [wm.mean, wm.sigma],
  '6.2': [fit.k, fit.b],
  '6.3': [counts.reduce((a, b) => a + b, 0) / counts.length, Math.sqrt(8 / counts.length)],
  '6.4': [mlePosition(30, 18)],
};

describe.each([
  ['src/content/exams/stats/sr1.mdx', SR1],
  ['src/content/exams/stats/sr2.mdx', SR2],
] as const)('%s', (path, expected) => {
  const found = tasks(path);
  it('все задачи на месте, номера не повторяются', () => {
    expect([...found.keys()].sort()).toEqual(Object.keys(expected).sort());
  });
  it.each(Object.entries(expected))('задача %s: ответ совпадает с пересчётом', (n, values) => {
    const got = found.get(n)!;
    expect(got).toHaveLength(values.length);
    // Эталон в листке может быть округлён, но не грубее чем на 0.5 %.
    got.forEach((v, i) => expect(Math.abs(v - values[i]!)).toBeLessThanOrEqual(0.005 * Math.abs(values[i]!) + 1e-9));
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
  it('допуск 2 % по умолчанию, «близко» — до 10 %', () => {
    expect(checkAnswer('0.857', 0.857375)).toBe('ok');
    expect(checkAnswer('0.83', 0.857375)).toBe('close');
    expect(checkAnswer('0.5', 0.857375)).toBe('wrong');
    expect(checkAnswer('x', 1)).toBe('unreadable');
    expect(checkAnswer('0', 0)).toBe('ok');
    expect(checkAnswer('0.01', 0)).toBe('ok');
    expect(checkAnswer('4550', 4524)).toBe('ok');
  });
});
