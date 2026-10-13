import { describe, expect, it } from 'vitest';
import {
  chain, degeneracy, densitySpectrum, extinctFraction, extinction, fissionProbability, fluxSpectrum, gasCurrents, kT,
  makeGas, NU_MEAN, oneOverVAverage, poissonPmf, samplePoisson, sampleStats, SLOWER_THAN_VT, stepGas, T0,
  thermalLength, vMean, vT,
} from '../src/labs/tpn/ensemble';
import { mulberry32 } from '../src/lib/rng';

/** Интеграл трапециями. */
const integrate = (f: (x: number) => number, a: number, b: number, n = 20000) => {
  const h = (b - a) / n;
  let s = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) s += f(a + i * h);
  return s * h;
};

describe('пуассоновский счёт', () => {
  it('P(N) нормировано, среднее и дисперсия равны μ', () => {
    for (const mu of [0.5, 4, 120]) {
      let s = 0, m = 0, m2 = 0;
      for (let N = 0; N < mu + 20 * Math.sqrt(mu) + 20; N++) { const p = poissonPmf(mu, N); s += p; m += N * p; m2 += N * N * p; }
      expect(s).toBeCloseTo(1, 9);
      expect(m).toBeCloseTo(mu, 6);
      expect(m2 - m * m).toBeCloseTo(mu, 5);
    }
  });

  it('выборка из 20 000 измерений: среднее μ, σ ≈ √μ — и в точном, и в нормальном режиме', () => {
    for (const mu of [3, 400]) {
      const rng = mulberry32(42);
      const xs = Array.from({ length: 20000 }, () => samplePoisson(mu, rng));
      const st = sampleStats(xs);
      expect(Math.abs(st.mean - mu) / Math.sqrt(mu)).toBeLessThan(0.05);
      expect(st.sd / Math.sqrt(mu)).toBeGreaterThan(0.97);
      expect(st.sd / Math.sqrt(mu)).toBeLessThan(1.03);
    }
  });

  it('вопрос урока: 400 отсчётов — относительная ошибка 5 %', () => {
    expect(1 / Math.sqrt(400)).toBe(0.05);
  });
});

describe('тепловые нейтроны', () => {
  it('тепловая точка: kT = 0.0253 эВ, V_T = 2200 м/с', () => {
    expect(kT(T0)).toBeCloseTo(0.0253, 4);
    expect(vT(T0)).toBeGreaterThan(2195);
    expect(vT(T0)).toBeLessThan(2205);
    expect(vMean(T0) / vT(T0)).toBeCloseTo(2 / Math.sqrt(Math.PI), 12);
  });

  it('Λ ≈ 1.0·10⁻⁸ см, при n = 10⁸ см⁻³ газ невырожден: nΛ³ ~ 10⁻¹⁶', () => {
    expect(thermalLength(T0)).toBeCloseTo(1.01e-8, 10);
    expect(degeneracy(1e8, T0)).toBeGreaterThan(0.9e-16);
    expect(degeneracy(1e8, T0)).toBeLessThan(1.2e-16);
  });

  it('спектры нормированы; максимумы kT/2 и kT, средние 3kT/2 и 2kT', () => {
    const th = 1;
    for (const [f, mode, mean] of [[densitySpectrum, 0.5, 1.5], [fluxSpectrum, 1, 2]] as const) {
      expect(integrate((E) => f(E, th), 0, 40)).toBeCloseTo(1, 4);
      expect(integrate((E) => E * f(E, th), 0, 40)).toBeCloseTo(mean, 4);
      expect(f(mode, th)).toBeGreaterThan(f(mode * 0.98, th));
      expect(f(mode, th)).toBeGreaterThan(f(mode * 1.02, th));
    }
  });

  it('σ̄ 1/V-поглотителя по потоку: √π/2·σ₀ при T₀, ∝ 1/√T', () => {
    expect(oneOverVAverage(T0)).toBeCloseTo(0.8862, 4);
    expect(oneOverVAverage(4 * T0)).toBeCloseTo(0.8862 / 2, 4);
  });

  it('медленнее V_T около 43 % нейтронов', () => {
    expect(SLOWER_THAN_VT).toBeCloseTo(0.4276, 4);
  });
});

describe('нейтронный газ в ящике', () => {
  it('скорости по Максвеллу: среднее 2V_T/√π, доля медленнее V_T', () => {
    const gas = makeGas(20000, 1, mulberry32(7));
    const speeds: number[] = [];
    for (let i = 0; i < gas.v.length; i += 3) speeds.push(Math.hypot(gas.v[i]!, gas.v[i + 1]!, gas.v[i + 2]!));
    expect(sampleStats(speeds).mean).toBeCloseTo(2 / Math.sqrt(Math.PI), 1);
    expect(speeds.filter((s) => s < 1).length / speeds.length).toBeCloseTo(SLOWER_THAN_VT, 1);
  });

  it('односторонние токи через площадку стремятся к Φ/4 с обеих сторон', () => {
    const gas = makeGas(3000, 0.9, mulberry32(11));
    for (let i = 0; i < 1500; i++) stepGas(gas, 1 / 60);
    const { plus, minus } = gasCurrents(gas, 0.9);
    expect(plus).toBeGreaterThan(0.23);
    expect(plus).toBeLessThan(0.27);
    expect(minus).toBeGreaterThan(0.23);
    expect(minus).toBeLessThan(0.27);
  });
});

describe('цепочки деления', () => {
  it('p = k/ν̄; при k ≤ 1 цепочка угасает наверняка', () => {
    expect(fissionProbability(NU_MEAN)).toBeCloseTo(1, 12);
    expect(extinction(0.9)).toBe(1);
    expect(extinction(1)).toBe(1);
  });

  it('при k = 1.05 угасает около 95 % цепочек, q — корень уравнения и убывает с k', () => {
    const q = extinction(1.05);
    expect(q).toBeGreaterThan(0.93);
    expect(q).toBeLessThan(0.97);
    expect(extinction(1.3)).toBeLessThan(q);
  });

  it('Монте-Карло совпадает с теорией', () => {
    for (const k of [1.1, 1.3]) {
      const mc = extinctFraction(k, 4000, 200, 400, mulberry32(3));
      expect(Math.abs(mc - extinction(k))).toBeLessThan(0.025);
    }
  });

  it('цепочка начинается с одного нейтрона, угасшая остаётся нулём, выше порога растёт как k', () => {
    const rng = mulberry32(5);
    for (let r = 0; r < 50; r++) {
      const h = chain(1.2, 40, 1e4, rng);
      expect(h[0]).toBe(1);
      expect(h).toHaveLength(41);
      const z = h.indexOf(0);
      if (z >= 0) expect(h.slice(z).every((n) => n === 0)).toBe(true);
      for (let g = 1; g < h.length; g++) if (h[g - 1]! > 1e4) expect(h[g]).toBe(Math.round(h[g - 1]! * 1.2));
    }
  });
});
