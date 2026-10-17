import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../src/lib/answer';
import { mulberry32 } from '../src/lib/rng';
import { FIXED_VARIANTS, type VariantTask } from '../src/lib/variants';
import { generators, makeVariant, variantSize } from '../src/labs/variants';

/**
 * Каждый ответ варианта СР по ТПН пересчитывается здесь от констант: kT — через постоянную Больцмана в эВ/К,
 * скорости — через энергию, ƛ — через импульс в СИ.
 */
const kEV = 8.617333e-5, k = 1.380649e-23, mn = 1.67492750e-27, eV = 1.602176634e-19, h = 6.62607015e-34, hbar = h / (2 * Math.PI), NA = 6.02214076e23;
const vT = (T: number) => Math.sqrt((2 * k * T) / mn);
const N = (rho: number, M: number) => (rho * NA) / M;

function expected(t: VariantTask): number[] {
  const m = t.meta as Record<string, number> & { kind: string };
  switch (m.kind) {
    case 'Rσ': { const R = m.r0 * m.A ** (1 / 3); return [R, (Math.PI * R * R) / 100]; }
    case 'E(ƛ=R)': { const R = m.r0 * m.A ** (1 / 3) * 1e-15, p = hbar / R; return [R * 1e15, (p * p) / (2 * mn) / eV / 1e6]; }
    case 'ƛ,kR': { const lb = (hbar / Math.sqrt(2 * mn * m.E * 1e6 * eV)) * 1e15; return [lb, (1.2 * m.A ** (1 / 3)) / lb]; }
    case 'ΣU': { const s = m.c * m.s5 + (1 - m.c) * m.s8; return [s, N(m.rho, 238) * s * 1e-24]; }
    case 'ΣH2O': { const S = N(m.rho, 18) * (2 * m.sH + m.sO) * 1e-24; return [S, 1 / S]; }
    case 'Nλ': { const n = N(m.rho, m.M), S = n * m.s * 1e-24; return [n, S, 1 / S]; }
    case 'x(k)': return [Math.log(m.k) / m.S];
    case 'e^-Σx': return [Math.exp(-m.S * m.x), m.S * m.x];
    case 'Σ→x': { const S = N(m.rho, m.M) * m.s * 1e-24; return [S, Math.log(m.k) / S]; }
    case 'x½': return [1 / m.S, Math.log(2) / m.S];
    case 'kT,VT': return [kEV * m.T, vT(m.T)];
    case 'means': return [kEV * m.T / 2, 1.5 * kEV * m.T, 2 * kEV * m.T];
    case '1/V': return [0.886227 * m.s0 * Math.sqrt(293.6 / m.T)];
    case 'V→E,T': { const E = (mn * m.v * m.v) / 2; return [E / eV, E / k]; }
    case 'n,p': { const n = m.F / (vT(m.T) * 100); return [n, n * 1e6 * k * m.T]; }
    case 'nΛ³': { const n = m.F / (vT(m.T) * 100), L = (h / Math.sqrt(2 * Math.PI * mn * k * m.T)) * 100; return [n, n * L ** 3]; }
    case 'Φ,w': return [m.n * vT(m.T) * 100, 1.5 * m.n * 1e6 * k * m.T];
    default: throw new Error(`Нет пересчёта для ${m.kind}`);
  }
}
const close = (a: number, b: number) => Math.abs(a - b) <= 3e-3 * Math.abs(b);

describe('СР по ТПН: генераторы вариантов', () => {
  it('пять тем семинара, в каждой несколько типов задач', () => {
    expect(variantSize('tpn', 1)).toBe(5);
    for (const gens of generators('tpn', 1)) expect(gens.length).toBeGreaterThanOrEqual(3);
  });

  it('каждый ответ на 300 зёрнах совпадает с независимым пересчётом', () => {
    generators('tpn', 1).forEach((gens, slot) => gens.forEach((gen, g) => {
      for (let seed = 1; seed <= 300; seed++) {
        const t = gen(mulberry32(seed * 31 + slot * 1009 + g));
        const exp = expected(t);
        expect(t.answers, t.meta.kind).toHaveLength(exp.length);
        t.answers.forEach((a, i) => {
          expect(close(a.value, exp[i]!), `${t.meta.kind} seed ${seed}: ${a.value} vs ${exp[i]}`).toBe(true);
        });
        expect(t.q).not.toMatch(/NaN|undefined|Infinity/);
        expect(t.answer).not.toMatch(/NaN|undefined|Infinity/);
      }
    }));
  });

  it('задачи семинара: Fe-56, природный уран, свинец 2 МэВ', () => {
    const R = 1.2 * 56 ** (1 / 3);
    expect(R).toBeCloseTo(4.59, 2);
    expect((Math.PI * R * R) / 100).toBeCloseTo(0.662, 2);
    expect(N(19, 238) * (0.0072 * 600 + 0.9928 * 2.7) * 1e-24).toBeCloseTo(0.336, 2);
    expect(Math.log(10) / 0.12).toBeCloseTo(19.2, 1);
  });

  it('при 293.6 К — kT = 0.0253 эВ и V_T = 2200 м/с', () => {
    const t = makeVariant('tpn', 1, 1).find((x) => x.meta.kind === 'kT,VT');
    expect(kEV * 293.6).toBeCloseTo(0.0253, 4);
    expect(vT(293.6)).toBeCloseTo(2200, -1);
    if (t) expect(t.answers[0]!.value).toBeCloseTo(kEV * (t.meta.T as number), 6);
  });

  it('варианты 1–4 различаются, эталон засчитывается, грубо неверный — нет', () => {
    const qs = Array.from({ length: FIXED_VARIANTS }, (_, i) => makeVariant('tpn', 1, i + 1).map((t) => t.q).join('|'));
    expect(new Set(qs).size).toBe(FIXED_VARIANTS);
    for (let v = 1; v <= 80; v++) for (const t of makeVariant('tpn', 1, v)) for (const a of t.answers) {
      expect(checkAnswer(String(a.value), a.value, a.tol, a.abs)).toBe('ok');
      expect(checkAnswer(String(a.value * 1.5 + 1), a.value, a.tol, a.abs)).not.toBe('ok');
    }
  });

  it('страница СР показывает вариант', () => {
    const src = readFileSync('src/content/exams/tpn/sr1.mdx', 'utf8');
    expect(src).toContain('<SrVariant client:load course="tpn" work={1} />');
  });
});
