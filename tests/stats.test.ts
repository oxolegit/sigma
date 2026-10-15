import { describe, expect, it } from 'vitest';
import { distribution, median, moments, modes, parseSample, quantile, sampleMoments, tableStats } from '../src/labs/stats/core';
import { cauchy, erf, fwhm, gauss, normalize, probBetween, shape, simpson, uniformShape } from '../src/labs/stats/density';
import { coincidences, exactlyK, galaxyMeanDistance, galaxyWithin, lensArea, poissonTimes, randomCoincidenceRate, triangle, triangleMedian } from '../src/labs/stats/geometry';
import {
  countRate, deadFraction, deadFractionTwoChannels, measuredNonParalyzable, measuredParalyzable, netRate, paralyzableIterations,
  paralyzableRoots, poissonCdf, poissonInterval, poissonModes, poissonPmf, poissonTail, protonLifetime, samplePoisson,
  secondOrderRoots, simulateDeadTime, timeForPrecision, trueRate, trueRateNonParalyzable, zeroEventLimit,
} from '../src/labs/stats/poisson';
import { BAR, expected, linearFit, mlePosition, negLogL, poissonMleSigma, poissonNegLogL, ratioPosition, singlePositions, sumSquares, weightedMean } from '../src/labs/stats/fit';
import { mulberry32 } from '../src/lib/rng';

/** Курс «Математическая статистика»: каждое число из уроков и самостоятельных пересчитано здесь. */

const rel = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.abs(b);

describe('урок 1: дискретная случайная величина', () => {
  it('набор «10 1 4 3 9 8 1 7 2 9»: xᵢ, pᵢ, Σp = 1, μ₁ = 5.4, μ₂ = 40.6, σ ≈ 3.38', () => {
    const xs = parseSample('10 1 4 3 9 8 1 7 2 9');
    const d = distribution(xs);
    expect(d.x).toEqual([1, 2, 3, 4, 7, 8, 9, 10]);
    expect(d.p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const m = sampleMoments(xs);
    expect(m.mean).toBeCloseTo(5.4, 12);
    expect(m.mean2).toBeCloseTo(40.6, 12);
    expect(m.sigma).toBeCloseTo(Math.sqrt(40.6 - 5.4 ** 2), 12);
    expect(m.sigma).toBeCloseTo(3.38, 2);
    expect(m.sem).toBeCloseTo(m.sigma / Math.sqrt(10), 12);
  });

  it('пример 1.1 пособия: 8 измерений напряжения — 1403.375 В, σ = 3.28 В, медиана 1403.5 В', () => {
    const xs = [1403, 1407, 1399, 1404, 1403, 1398, 1408, 1405];
    const m = sampleMoments(xs);
    expect(m.mean).toBeCloseTo(1403.375, 9);
    expect(m.sigma).toBeCloseTo(3.28, 2);
    expect(median(xs)).toBe(1403.5);
  });

  it('монетка: строка без пробелов читается поцифренно', () => {
    expect(parseSample('10101100001100101011')).toHaveLength(20);
    expect(sampleMoments(parseSample('10101100001100101011')).mean).toBeCloseTo(0.5, 12);
  });

  it('время до сбоя: 1, 2, 4 ч с вероятностями 0.1, 0.3, 0.6 — среднее 3.1 ч, σ ≈ 1.14 ч', () => {
    const m = moments([1, 2, 4], [0.1, 0.3, 0.6]);
    expect(m.mean).toBeCloseTo(3.1, 12);
    expect(m.mean2).toBeCloseTo(10.9, 12);
    expect(m.sigma).toBeCloseTo(Math.sqrt(1.29), 12);
    expect(m.sigma).toBeCloseTo(1.136, 3);
  });

  it('СР 1, разбор: P(n) = C(n + 1), n = 0…3 — C = 0.1, n̄ = 2, σ = 1', () => {
    const p = [1, 2, 3, 4].map((v) => v / 10);
    const m = moments([0, 1, 2, 3], p);
    expect(m.mean).toBeCloseTo(2, 12);
    expect(m.mean2).toBeCloseTo(5, 12);
    expect(m.sigma).toBeCloseTo(1, 12);
  });

  it('СР 1, задачи: кость, (−1, 0, 2) и геометрическое P(n) = C/2ⁿ', () => {
    const die = moments([1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1]);
    expect(die.mean).toBeCloseTo(3.5, 12);
    expect(die.variance).toBeCloseTo(35 / 12, 12);
    const t = moments([-1, 0, 2], [0.3, 0.2, 0.5]);
    expect(t.mean).toBeCloseTo(0.7, 12);
    expect(t.variance).toBeCloseTo(1.81, 12);
    const n = Array.from({ length: 80 }, (_, i) => i);
    const g = moments(n, n.map((k) => 0.5 * 0.5 ** k));
    expect(g.mean).toBeCloseTo(1, 10);
    expect(g.variance).toBeCloseTo(2, 10);
  });
});

describe('урок 2: непрерывная случайная величина', () => {
  it('y = 0.5x и y = −0.5x + 3 на (1; 3): C = 1/2 и 1/4, средние 13/6 и 23/12', () => {
    const up = normalize(shape('up')), down = normalize(shape('down'));
    expect(up.c).toBeCloseTo(0.5, 6);
    expect(down.c).toBeCloseTo(0.25, 6);
    expect(up.mean).toBeCloseTo(13 / 6, 6);
    expect(down.mean).toBeCloseTo(23 / 12, 6);
    expect(up.mean2).toBeCloseTo(5, 6);
    expect(down.mean2).toBeCloseTo(4, 6);
    expect(up.sigma).toBeCloseTo(Math.sqrt(11) / 6, 6);
    expect(down.sigma).toBeCloseTo(Math.sqrt(47) / 12, 6);
  });

  it('равномерное на (a; b): среднее (a + b)/2, σ = (b − a)/√12', () => {
    const d = normalize(uniformShape(1, 4));
    expect(d.mean).toBeCloseTo(2.5, 4);
    expect(d.sigma).toBeCloseTo(3 / Math.sqrt(12), 3);
    expect(probBetween(d, 2, 3)).toBeCloseTo(1 / 3, 3);
  });

  it('СР 1, разбор: y = x(2 − x) — f = ¾x(2 − x), x̄ = 1, σ = 1/√5', () => {
    const d = normalize(shape('parab'));
    expect(d.c).toBeCloseTo(0.75, 8);
    expect(d.mean).toBeCloseTo(1, 8);
    expect(d.mean2).toBeCloseTo(1.2, 8);
    expect(d.sigma).toBeCloseTo(1 / Math.sqrt(5), 8);
  });

  it('СР 1, задачи: e^(−x/3) — x̄ = σ = 3; x²e^(−x) — x̄ = 3, σ = √3; y = x на [0; 2] — 4/3, σ² = 2/9', () => {
    const e = normalize(shape('exp'));
    expect(e.c).toBeCloseTo(1 / 3, 6);
    expect(e.mean).toBeCloseTo(3, 5);
    expect(e.sigma).toBeCloseTo(3, 4);
    const g = normalize(shape('gamma'));
    expect(g.c).toBeCloseTo(0.5, 6);
    expect(g.mean).toBeCloseTo(3, 5);
    expect(g.sigma).toBeCloseTo(Math.sqrt(3), 5);
    const lin = normalize({ ...shape('up'), y: (x) => (x >= 0 && x <= 2 ? x : 0), support: [0, 2] });
    expect(lin.mean).toBeCloseTo(4 / 3, 6);
    expect(lin.sigma ** 2).toBeCloseTo(2 / 9, 6);
  });

  it('F(x) возрастает от 0 до 1, медиана — F = ½', () => {
    const d = normalize(shape('up'));
    expect(d.F(1)).toBe(0);
    expect(d.F(3)).toBe(1);
    // f = x/4: ∫₁ᵐ x/4 dx = (m² − 1)/8 = ½ ⇒ m = √5.
    expect(d.quantile(0.5)).toBeCloseTo(Math.sqrt(5), 4);
  });
});

describe('урок 3: геометрическая вероятность, совпадения, события', () => {
  it('треугольник: a, h ~ U(0; 100) — ⟨S⟩ = 1250, плотность нормирована, медиана ≈ 934 < среднего', () => {
    const t = triangle(100);
    expect(t.mean).toBe(1250);
    expect(simpson(t.pdf, 1e-9, t.smax, 200000)).toBeCloseTo(1, 3);
    expect(simpson((s) => s * t.pdf(s), 1e-9, t.smax, 200000)).toBeCloseTo(1250, 0);
    expect(t.sigma).toBeCloseTo(Math.sqrt(10000 ** 2 / 9 / 4 - 1250 ** 2), 8);
    const med = triangleMedian(100);
    expect(t.cdf(med)).toBeCloseTo(0.5, 10);
    expect(med).toBeCloseTo(933.6, 0);
    // Монте-Карло сходится к тем же числам.
    const rng = mulberry32(7);
    const xs = Array.from({ length: 200000 }, () => (100 * rng() * 100 * rng()) / 2);
    expect(rel(xs.reduce((a, b) => a + b, 0) / xs.length, 1250, 0.01)).toBe(true);
    expect(xs.filter((s) => s < med).length / xs.length).toBeCloseTo(0.5, 2);
  });

  it('Галактика: площадь линзы и вероятность «ближе r»', () => {
    expect(lensArea(10, 50, 26)).toBeCloseTo(Math.PI * 100, 10);
    expect(galaxyWithin(80)).toBeCloseTo(1, 12);
    expect(galaxyWithin(0)).toBe(0);
    // Монте-Карло для r = 30.
    const rng = mulberry32(3);
    let hit = 0;
    const n = 200000;
    for (let i = 0; i < n; i++) {
      const r = 50 * Math.sqrt(rng()), phi = 2 * Math.PI * rng();
      if (Math.hypot(r * Math.cos(phi) - 26, r * Math.sin(phi)) < 30) hit++;
    }
    expect(hit / n).toBeCloseTo(galaxyWithin(30), 2);
    expect(galaxyMeanDistance()).toBeGreaterThan(26);
  });

  it('случайные совпадения: 2τν₁ν₂ — и формула, и имитация', () => {
    expect(randomCoincidenceRate(1000, 500, 100e-9)).toBeCloseTo(0.1, 12);
    const rng = mulberry32(11);
    const T = 20, nu = 2000, tau = 5e-6;
    const n = coincidences(poissonTimes(rng, nu, T), poissonTimes(rng, nu, T), tau).length;
    const expect_ = randomCoincidenceRate(nu, nu, tau) * T;
    expect(Math.abs(n - expect_)).toBeLessThan(4 * Math.sqrt(expect_));
  });

  it('СР 1: телескоп 0.9 и 0.8 — оба 0.72, хотя бы один 0.98, ровно один 0.26, ни один 0.02', () => {
    const [none, one, both] = exactlyK([0.9, 0.8]);
    expect(both).toBeCloseTo(0.72, 12);
    expect(one).toBeCloseTo(0.26, 12);
    expect(none).toBeCloseTo(0.02, 12);
    expect(1 - none!).toBeCloseTo(0.98, 12);
  });

  it('СР 1: три детектора по 0.95 — тройное 0.857, хотя бы два 0.993', () => {
    const d = exactlyK([0.95, 0.95, 0.95]);
    expect(d[3]).toBeCloseTo(0.857, 3);
    expect(d[2]! + d[3]!).toBeCloseTo(0.993, 3);
  });

  it('СР 1: детектор с мёртвой зоной, рамка, окно совпадений, стержень, y < x²', () => {
    expect(1 - (4 * Math.PI) / 100).toBeCloseTo(0.874, 3);
    expect((100 - 64) / 100).toBe(0.36);
    expect(1 - 0.95 ** 2).toBeCloseTo(0.0975, 12);
    // Меньший кусок короче L/3, если точка разлома в первой или последней трети.
    expect(2 / 3).toBeCloseTo(1 - 1 / 3, 12);
    expect(simpson((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 12);
  });
});

describe('урок 4: квантили, медиана, FWHM, Коши', () => {
  it('«1 2 4 5 7 1 1 3 5 4 1»: медиана 3, мода 1, квартили', () => {
    const xs = parseSample('1 2 4 5 7 1 1 3 5 4 1');
    expect(median(xs)).toBe(3);
    expect(quantile(xs, 0.5)).toBe(3);
    expect(modes(xs)).toEqual([1]);
    expect(quantile(xs, 0.25)).toBe(1);
    expect(quantile(xs, 0.75)).toBe(5);
  });

  it('Коши: медиана 0, FWHM = 2, квартили ±1, среднего нет', () => {
    expect(cauchy.quantile(0.5)).toBeCloseTo(0, 12);
    expect(cauchy.quantile(0.75)).toBeCloseTo(1, 12);
    expect(cauchy.quantile(0.25)).toBeCloseTo(-1, 12);
    const w = fwhm((x) => cauchy.pdf(x), -20, 20);
    expect(w.width).toBeCloseTo(2, 3);
    expect(w.max).toBeCloseTo(1 / Math.PI, 6);
    // ∫ x f dx на [−A; A] — ноль по симметрии, но ∫ |x| f растёт как ln A: среднего не существует.
    const absMoment = (A: number) => simpson((x) => Math.abs(x) * cauchy.pdf(x), -A, A, 20000);
    expect(absMoment(1e4) - absMoment(1e2)).toBeCloseTo((2 / Math.PI) * Math.log(100), 1);
  });

  it('Гаусс: erf, FWHM = 2.355σ, квантиль 0.8413 — это μ + σ', () => {
    expect(erf(1)).toBeCloseTo(0.8427007929, 9);
    expect(erf(3.5)).toBeCloseTo(0.9999992569, 9);
    expect(gauss.cdf(1) - gauss.cdf(-1)).toBeCloseTo(0.6827, 4);
    expect(gauss.quantile(0.841345)).toBeCloseTo(1, 4);
    expect(fwhm((x) => gauss.pdf(x, 0, 2), -20, 20).width).toBeCloseTo(2 * Math.sqrt(2 * Math.log(2)) * 2, 3);
  });

  it('СР 1, FWHM: e^(−(x−5)²/8) — 4.71; лоренциан с 9 — 6; e^(−|x|/2) — 4 ln 2; x²e^(−x) — 3.39', () => {
    expect(fwhm((x) => Math.exp(-((x - 5) ** 2) / 8), -10, 20).width).toBeCloseTo(2 * Math.sqrt(8 * Math.log(2)), 4);
    expect(fwhm((x) => 1 / (1 + (x - 2) ** 2 / 9), -40, 40).width).toBeCloseTo(6, 4);
    expect(fwhm((x) => Math.exp(-Math.abs(x) / 2), -20, 20).width).toBeCloseTo(4 * Math.log(2), 3);
    const g = fwhm((x) => x * x * Math.exp(-x), 0, 30);
    expect(g.mode).toBeCloseTo(2, 2);
    expect(g.left).toBeCloseTo(0.76, 2);
    expect(g.right).toBeCloseTo(4.16, 2);
    expect(g.width).toBeCloseTo(3.39, 2);
  });

  it('зарплаты: среднее 5740, медиана 3000; +100 человек со 150 млн — среднее ≈ 20 738, медиана та же', () => {
    const city = [[1000, 0.2], [3000, 0.31], [5000, 0.26], [7000, 0.13], [9000, 0.06], [12000, 0.03], [150000, 0.01]].map(([x, p]) => ({ x: x!, w: p! * 1e6 }));
    const base = tableStats(city);
    expect(base.mean).toBeCloseTo(5740, 6);
    expect(base.median).toBe(3000);
    const rich = tableStats([...city, { x: 150e6, w: 100 }]);
    expect(rich.mean).toBeCloseTo((5740e6 + 150e8) / 1000100, 6);
    expect(Math.round(rich.mean)).toBe(20738);
    expect(rich.median).toBe(3000);
    const poor = tableStats([...city, { x: 100, w: 100 }]);
    expect(poor.mean).toBeCloseTo(5739.4, 1);
    expect(poor.median).toBe(3000);
  });
});

describe('урок 5: распределение Пуассона', () => {
  it('нормировка, n̄ = λ, σ² = λ', () => {
    for (const l of [0.5, 3, 12.5]) {
      const n = Array.from({ length: 120 }, (_, i) => i);
      const p = n.map((k) => poissonPmf(l, k));
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      const m = moments(n, p);
      expect(m.mean).toBeCloseTo(l, 10);
      expect(m.variance).toBeCloseTo(l, 9);
    }
  });

  it('на слайде при λ = 1.845: 0.158, 0.292, 0.269, 0.165, 0.076, 0.028', () => {
    [0.158, 0.292, 0.269, 0.165, 0.076, 0.028].forEach((v, n) => expect(poissonPmf(1.845, n)).toBeCloseTo(v, 3));
  });

  it('наиболее вероятное n — целая часть λ; при целом λ — ещё и λ − 1', () => {
    expect(poissonModes(3.5)).toEqual([3]);
    expect(poissonPmf(3.5, 3)).toBeCloseTo(0.216, 3);
    expect(poissonPmf(3.5, 4)).toBeCloseTo(0.189, 3);
    expect(poissonModes(10)).toEqual([9, 10]);
    expect(poissonPmf(10, 9)).toBeCloseTo(poissonPmf(10, 10), 14);
  });

  it('СР 2: хвосты — λ = 3: P(N > 2) ≈ 0.577; λ = 2: P(N > 1) ≈ 0.594; ν = 5, t = 0.4: P(N > 3) ≈ 0.143; λ = 1: P(N ≥ 2) ≈ 0.264', () => {
    expect(poissonTail(3, 2)).toBeCloseTo(0.577, 3);
    expect(poissonTail(2, 1)).toBeCloseTo(0.594, 3);
    expect(poissonTail(5 * 0.4, 3)).toBeCloseTo(0.143, 3);
    expect(poissonTail(1, 1)).toBeCloseTo(0.264, 3);
    expect(poissonCdf(2, 1)).toBeCloseTo(3 * Math.exp(-2), 12);
  });

  it('СР 2: ровно n — P₃(λ = 2) ≈ 0.180, P₅(5) ≈ 0.175, P₁(0.5) ≈ 0.303; СР 1: λ = 2 — 0.135, 0.271, 0.594', () => {
    expect(poissonPmf(4 * 0.5, 3)).toBeCloseTo(0.180, 3);
    expect(poissonPmf(5, 5)).toBeCloseTo(0.175, 3);
    expect(poissonPmf(0.1 * 5, 1)).toBeCloseTo(0.303, 3);
    expect(poissonPmf(2, 0)).toBeCloseTo(0.135, 3);
    expect(poissonPmf(2, 1)).toBeCloseTo(0.271, 3);
    expect(poissonTail(2, 1)).toBeCloseTo(0.594, 3);
  });

  it('ноль событий: λ < 1.84 (84 %), 2.30 (90 %), 3.00 (95 %); пособие для 68 % — 1.845', () => {
    expect(zeroEventLimit(0.842)).toBeCloseTo(1.845, 3);
    expect(zeroEventLimit(0.9)).toBeCloseTo(2.303, 3);
    expect(zeroEventLimit(0.95)).toBeCloseTo(2.996, 3);
    expect(zeroEventLimit(0.975)).toBeCloseTo(3.689, 3);
  });

  it('табл. 3.1 пособия: границы при k = 0, 1, 2, 10', () => {
    expect(poissonInterval(0).right).toBeCloseTo(1.845, 3);
    const k1 = poissonInterval(1), k2 = poissonInterval(2), k10 = poissonInterval(10);
    expect(k1.left).toBeCloseTo(0.172, 3);
    expect(k1.right).toBeCloseTo(3.305, 2);
    expect(k2.left).toBeCloseTo(0.706, 2);
    expect(k2.right).toBeCloseTo(4.644, 2);
    expect(k10.left).toBeCloseTo(6.885, 2);
    expect(k10.right).toBeCloseTo(14.278, 2);
  });

  it('протон: 10⁶ кг воды за год — 3.3·10³² протонов; τ > 1.5·10³² лет (90 %), 1.8·10³² при λ = 1.84', () => {
    const p = protonLifetime(1e6, 1, 2.303);
    expect(rel(p.protons, 3.35e32, 0.01)).toBe(true);
    expect(rel(p.tau, 1.45e32, 0.02)).toBe(true);
    expect(rel(protonLifetime(1e6, 1, 1.845).tau, 1.8e32, 0.02)).toBe(true);
  });

  it('скорость счёта: 204 за 10 с — 20.4 ± 1.4; 141 за 10 с — 14.1 ± 1.2; СР 2 — 350/25 и 900/60', () => {
    const a = countRate(204, 10);
    expect(a.rate).toBeCloseTo(20.4, 12);
    expect(a.sigma).toBeCloseTo(1.43, 2);
    expect(countRate(141, 10).sigma).toBeCloseTo(1.19, 2);
    expect(countRate(350, 25).sigma).toBeCloseTo(0.748, 3);
    expect(countRate(900, 60).sigma).toBeCloseTo(0.5, 12);
    expect(timeForPrecision(50, 0.01).N).toBeCloseTo(1e4, 6);
    expect(timeForPrecision(50, 0.01).t).toBeCloseTo(200, 6);
    const s = netRate(1200, 100, 400, 100);
    expect(s.rate).toBeCloseTo(8, 12);
    expect(s.sigma).toBeCloseTo(0.4, 12);
  });

  it('розыгрыш Пуассона: среднее и дисперсия ≈ λ', () => {
    const rng = mulberry32(5);
    const xs = Array.from({ length: 50000 }, () => samplePoisson(4.2, rng));
    const m = sampleMoments(xs);
    expect(m.mean).toBeCloseTo(4.2, 1);
    expect(m.variance).toBeCloseTo(4.2, 1);
  });
});

describe('урок 6: мёртвое время', () => {
  it('пример 3.3: τ = 3.3 мс, ν = 20 с⁻¹ — теряется 6.4 %', () => {
    expect(deadFraction(20, 3.3e-3)).toBeCloseTo(0.0639, 4);
  });

  it('пример 3.4 и СР: «пинг-понг» при ντ = 0.1 — 0.47 % вместо 9.5 %', () => {
    expect(deadFraction(2000, 50e-6)).toBeCloseTo(0.095, 3);
    expect(deadFractionTwoChannels(2000, 50e-6)).toBeCloseTo(0.0047, 4);
    expect(deadFractionTwoChannels(1000, 100e-6)).toBeCloseTo(0.0047, 4);
  });

  it('имитация даёт те же доли потерь', () => {
    const rng = mulberry32(21);
    const times = poissonTimes(rng, 2000, 100);
    for (const [ch, theory] of [[1, deadFraction(2000, 50e-6)], [2, deadFractionTwoChannels(2000, 50e-6)]] as const) {
      const reg = simulateDeadTime(times, 50e-6, ch);
      const lost = reg.filter((r) => !r).length / reg.length;
      expect(Math.abs(lost - theory)).toBeLessThan(4 * Math.sqrt(theory / times.length) + 1e-4);
    }
  });

  it('лекция: 2370 нейтронов за 10 с, τ = 500 мкс — 269 с⁻¹ в первом приближении, 271 — во втором и точно', () => {
    const r = trueRate(2370, 10, 500e-6);
    expect(r.measured).toBe(237);
    expect(r.rate).toBeCloseTo(268.9, 1);
    expect(secondOrderRoots(237, 500e-6)[0]).toBeCloseTo(271, 0);
    expect(secondOrderRoots(237, 500e-6)[1]).toBeCloseTo(29484, -1);
    const roots = paralyzableRoots(237, 500e-6)!;
    expect(roots[0]).toBeCloseTo(271.45, 2);
    expect(measuredParalyzable(roots[0], 500e-6)).toBeCloseTo(237, 9);
    const it = paralyzableIterations(237, 500e-6, 30);
    expect(it[it.length - 1]).toBeCloseTo(roots[0], 6);
  });

  it('СР 1, бонус: m = 5000 с⁻¹, 60 с, τ = 20 мкс — n = 5556 ± 11', () => {
    expect(trueRateNonParalyzable(5000, 20e-6)).toBeCloseTo(5555.6, 1);
    const sm = Math.sqrt(5000 * 60) / 60;
    expect(sm).toBeCloseTo(9.13, 2);
    expect(sm / (1 - 5000 * 20e-6) ** 2).toBeCloseTo(11.3, 1);
    expect(measuredNonParalyzable(2000, 100e-6)).toBeCloseTo(1666.7, 1);
    expect(deadFraction(1e4, 10e-6)).toBeCloseTo(0.095, 3);
  });

  it('СР 2: 6000 за 20 с, τ = 400 мкс — 341 ± 5; 1500 за 5 с, 1 мс — 429 ± 16; 10⁴ за 100 с — 111.1 ± 1.2; 4500 за 10 с — 471 ± 7', () => {
    const a = trueRate(6000, 20, 400e-6);
    expect(a.rate).toBeCloseTo(340.9, 1);
    expect(a.sigma).toBeCloseTo(5.0, 1);
    const b = trueRate(1500, 5, 1e-3);
    expect(b.rate).toBeCloseTo(428.6, 1);
    expect(b.sigma).toBeCloseTo(15.8, 1);
    const c = trueRate(10000, 100, 1e-3);
    expect(c.rate).toBeCloseTo(111.1, 1);
    expect(c.sigma).toBeCloseTo(1.23, 2);
    const d = trueRate(4500, 10, 100e-6);
    expect(d.rate).toBeCloseTo(471.2, 1);
    expect(d.sigma).toBeCloseTo(7.4, 1);
    expect(measuredParalyzable(500, 200e-6) * 10).toBeCloseTo(4524, 0);
  });
});

describe('урок 7: взвешенное среднее и МНК', () => {
  it('3.05 ± 0.07, 2.98 ± 0.05, 3.09 ± 0.11 — 3.014 ± 0.038', () => {
    const w = weightedMean([3.05, 2.98, 3.09], [0.07, 0.05, 0.11]);
    expect(w.mean).toBeCloseTo(3.0140, 4);
    expect(w.sigma).toBeCloseTo(0.0382, 4);
    expect(w.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('трек: (0; 19), (10; 31), (20; 38), (30; 47) — y = 0.91x + 20.1', () => {
    const f = linearFit([0, 10, 20, 30], [19, 31, 38, 47]);
    expect(f.k).toBeCloseTo(0.91, 12);
    expect(f.b).toBeCloseTo(20.1, 12);
    // Остатки −1.1, 1.8, −0.3, −0.4.
    expect(f.S).toBeCloseTo(4.7, 9);
    // Минимум: малый сдвиг любого параметра увеличивает S.
    for (const [dk, db] of [[0.01, 0], [-0.01, 0], [0, 0.1], [0, -0.1]]) {
      expect(sumSquares([0, 10, 20, 30], [19, 31, 38, 47], f.k + dk!, f.b + db!)).toBeGreaterThan(f.S);
    }
  });
});

describe('урок 8: метод максимального правдоподобия', () => {
  it('два ФЭУ: A₁ = 18, A₂ = 30 — минимум L при x ≈ 4.03 м, там λ₁ − λ₂ = A₁ − A₂', () => {
    const x = mlePosition(18, 30);
    expect(x).toBeCloseTo(4.03, 2);
    const [l1, l2] = expected(x);
    expect(l1 - l2).toBeCloseTo(18 - 30, 9);
    for (const dx of [-0.05, 0.05]) expect(negLogL(x + dx, 18, 30)).toBeGreaterThan(negLogL(x, 18, 30));
    expect(ratioPosition(18, 30)).toBeCloseTo(3.51, 2);
    const [s1, s2] = singlePositions(18, 30);
    expect(s1).toBeCloseTo(2.04, 2);
    expect(s2).toBeCloseTo(4.98, 2);
    expect(BAR.length).toBe(6);
  });

  it('согласованные амплитуды: все оценки совпадают с истинным x', () => {
    const [a1, a2] = expected(1.7);
    expect(mlePosition(a1, a2)).toBeCloseTo(1.7, 9);
    expect(ratioPosition(a1, a2)).toBeCloseTo(1.7, 9);
  });

  it('Пуассон: минимум −ln L в λ = n̄, σ = √(n̄/N) — там L выросла на ½', () => {
    const ns = [3, 5, 2, 4, 6, 3, 4];
    const m = ns.reduce((a, b) => a + b, 0) / ns.length;
    for (const d of [-0.01, 0.01]) expect(poissonNegLogL(m + d, ns)).toBeGreaterThan(poissonNegLogL(m, ns));
    const s = poissonMleSigma(ns);
    // Кривая несимметрична: справа подъём чуть меньше ½, слева — чуть больше; в среднем ½.
    const up = (poissonNegLogL(m + s, ns) + poissonNegLogL(m - s, ns)) / 2 - poissonNegLogL(m, ns);
    expect(up).toBeCloseTo(0.5, 1);
  });
});
