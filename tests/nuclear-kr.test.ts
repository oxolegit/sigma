import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../src/lib/answer';
import { mulberry32 } from '../src/lib/rng';
import { FIXED_VARIANTS, type VariantTask } from '../src/lib/variants';
import { generators, makeVariant, variantSize } from '../src/labs/variants';
import { NUCLIDES } from '../src/labs/nuclear/nuclides';
import { MATERIALS, PARTICLES, type MaterialKey } from '../src/labs/nuclear/physics';

/**
 * Каждый ответ варианта пересчитывается здесь другим путём: энергии отделения — через разности
 * энергий связи, Z_opt — численным минимумом массы, распады — подбором импульса, оболочки — своим заполнением.
 */
const u = 931.4940954, mH = 1.007825, mn = 1.008665, MP = 938.2720813, MN = 939.565379, e2 = 1.44, c = 299792458;
const M = (A: number, Z: number) => (A === 1 && Z === 0 ? mn : NUCLIDES.find((x) => x.A === A && x.Z === Z)!.M);
const W = (A: number, Z: number) => (Z * mH + (A - Z) * mn - M(A, Z)) * u;
const weiz = (A: number, Z: number) => {
  const N = A - Z, ee = Z % 2 === 0 && N % 2 === 0, oo = Z % 2 === 1 && N % 2 === 1;
  return 15.6 * A - 17.2 * A ** (2 / 3) - (0.72 * Z * (Z - 1)) / A ** (1 / 3) - (23.6 * (A - 2 * Z) ** 2) / A + (ee ? 34 : oo ? -34 : 0) / A ** 0.75;
};
/** Минимум массы изобары по Z — золотым сечением (кулон Z², как в задаче 3.1). */
function zMin(A: number): number {
  const f = (Z: number) => Z * (MP - MN) + (0.72 * Z * Z) / A ** (1 / 3) + (23.6 * (A - 2 * Z) ** 2) / A;
  let a = 0, b = A;
  for (let i = 0; i < 200; i++) { const m1 = a + (b - a) * 0.382, m2 = a + (b - a) * 0.618; if (f(m1) < f(m2)) b = m2; else a = m1; }
  return (a + b) / 2;
}
const ORDER = '1s1 1p3 1p1 1d5 2s1 1d3 1f7 2p3 1f5 2p1 1g9 1g7 2d5 2d3 3s1 1h11 1h9 2f7 2f5 3p3 3p1 1i13'.split(' ')
  .map((s) => ({ l: 'spdfghi'.indexOf(s[1]!), j: Number(s.slice(2)) / 2 }));
function last(k: number) { let n = 0; for (const o of ORDER) { n += 2 * o.j + 1; if (k <= n) return o; } throw new Error('k'); }
const gs = { p: 5.586, n: -3.826 }, gl = { p: 1, n: 0 };
const schmidt = (t: 'p' | 'n', l: number, j: number) => j * (gl[t] + (j > l ? 1 : -1) * (gs[t] - gl[t]) / (2 * l + 1));
/** Импульс распада подбором: E₁(p) + E₂(p) = M. */
function decayT(Mm: number, m1: number, m2: number) {
  let lo = 0, hi = Mm;
  for (let i = 0; i < 200; i++) { const p = (lo + hi) / 2; if (Math.hypot(p, m1) + Math.hypot(p, m2) < Mm) lo = p; else hi = p; }
  return [Math.hypot(lo, m1) - m1, Math.hypot(lo, m2) - m2];
}

function expected(t: VariantTask): number[] {
  const m = t.meta as Record<string, number> & { kind: string; mk: MaterialKey };
  switch (m.kind) {
    case 'T→pc,ƛ': { const g = 1 + m.T / m.m, pc = m.m * Math.sqrt(g * g - 1); return [pc, 200 / pc]; }
    case 'ƛ→T,γ': { const pc = 200 / m.lb; return [Math.sqrt(pc * pc + m.m * m.m) - m.m, Math.sqrt(1 + (pc / m.m) ** 2)]; }
    case 'γ→T,pc,β': return [(m.gamma - 1) * m.m, m.m * Math.sqrt(m.gamma ** 2 - 1), Math.sqrt(1 - 1 / m.gamma ** 2)];
    case 'τ,L': { const g = 1 + m.T / m.m; return [g, Math.sqrt(g * g - 1) * c * m.tau0]; }
    case 'W': return [W(m.A, m.Z), W(m.A, m.Z) / m.A];
    case 'εn': return [W(m.A, m.Z) - W(m.A - 1, m.Z)];
    case 'εp': return [W(m.A, m.Z) - W(m.A - 1, m.Z - 1)];
    case 'εα': return [W(m.A, m.Z) - W(m.A - 4, m.Z - 2) - W(4, 2)];
    case 'RSV': { const R = 1.4 * m.A ** (1 / 3); return [R, 4 * Math.PI * R * R, (4 * Math.PI * R ** 3) / 3]; }
    case 'Wweiz': return [weiz(m.A, m.Z), weiz(m.A, m.Z) / m.A];
    case 'Zopt': return [Math.round(zMin(m.A))];
    case 'fission': return [2 * weiz(m.A / 2, m.Z / 2) - weiz(m.A, m.Z)];
    case 'εnWeiz': return [weiz(m.A, m.Z) - weiz(m.A - 1, m.Z)];
    case 'mirror': return [(0.6 * 1.43996 * (2 * m.Z + 1)) / (W(m.A, m.Z) - W(m.A, m.Z + 1))];
    case 'shell': {
      const oddP = m.Z % 2 === 1, o = last(oddP ? m.Z : m.A - m.Z);
      return [o.j, o.l % 2 ? -1 : 1, schmidt(oddP ? 'p' : 'n', o.l, o.j)];
    }
    case 'oddodd': { const p = last(m.Z), n = last(m.A - m.Z); return [Math.abs(p.j - n.j), p.j + n.j, (p.l + n.l) % 2 ? -1 : 1]; }
    case 'quad': {
      const Q0 = (m.Q * (m.J + 1) * (2 * m.J + 3)) / (m.J * (2 * m.J - 1));
      return [Q0, (5 * Q0 * 100) / (4 * m.Z * (1.4 * m.A ** (1 / 3)) ** 2)];
    }
    case 'fermi': { const pc = (197.327 / m.r0) * Math.cbrt((9 * Math.PI) / 8); return [pc, (pc * pc) / (MP + MN)]; }
    case 'ruth': { const r = (2 * m.Z * e2) / m.T; return [r, (r / 2) / Math.tan((m.theta * Math.PI) / 360)]; }
    case 'barrier': return [(m.z * m.Z * e2) / (1.4 * (Math.cbrt(m.a) + Math.cbrt(m.A)))];
    case 'bethe': {
      const mat = MATERIALS[m.mk], g = 1 + m.T / m.m, b2 = 1 - 1 / (g * g);
      const v = ((0.307075 * m.z * m.z * mat.Z) / (mat.A * b2)) * Math.log((2 * 511000 * b2) / mat.I);
      return [v, v * mat.rho];
    }
    case 'rad': { const mat = MATERIALS[m.mk]; return [m.T0 * Math.exp((-m.x * mat.rho) / m.l), 800 / mat.Z]; }
    case 'decay': return decayT(m.M, m.m1, m.m2);
    case 'threshold': return [(m.final ** 2 - m.m1 ** 2 - m.m2 ** 2) / (2 * m.m2) - m.m1];
    default: throw new Error(`Нет пересчёта для ${m.kind}`);
  }
}
const close = (a: number, b: number, rel: number, abs: number) => Math.abs(a - b) <= Math.max(rel * Math.abs(b), abs);

describe('К/Р по ядерной физике: генераторы вариантов', () => {
  it('пять тем по структуре с семинара, в каждой несколько типов задач', () => {
    expect(variantSize('nuclear', 1)).toBe(5);
    for (const gens of generators('nuclear', 1)) expect(gens.length).toBeGreaterThanOrEqual(3);
  });

  it('каждый ответ на 300 зёрнах совпадает с независимым пересчётом', { timeout: 120_000 }, () => {
    generators('nuclear', 1).forEach((gens, slot) => gens.forEach((gen, g) => {
      for (let seed = 1; seed <= 300; seed++) {
        const t = gen(mulberry32(seed * 31 + slot * 1009 + g));
        const exp = expected(t);
        expect(t.answers, t.meta.kind).toHaveLength(exp.length);
        t.answers.forEach((a, i) => {
          expect(Number.isFinite(a.value), `${t.meta.kind} seed ${seed}`).toBe(true);
          // ħc: генераторы берут 197.33 там, где оно не дано в условии, тест — 197.327 или 200 по условию.
          expect(close(a.value, exp[i]!, 3e-3, 1e-6), `${t.meta.kind} seed ${seed}: ${a.value} vs ${exp[i]}`).toBe(true);
        });
        expect(t.q).not.toMatch(/NaN|undefined|Infinity/);
        expect(t.answer).not.toMatch(/NaN|undefined|Infinity/);
      }
    }));
  });

  it('оболочки: у ядер из таблицы предсказание совпадает с табличным спином там, где модель работает', () => {
    for (const [A, Z, J] of [[39, 19, 1.5], [45, 21, 3.5], [63, 29, 1.5], [17, 8, 2.5], [29, 14, 0.5]] as const) {
      const o = last(Z % 2 ? Z : A - Z);
      expect(o.j).toBe(J);
    }
  });

  it('варианты 1–4 одинаковы при каждом открытии и различаются между собой', () => {
    const qs = Array.from({ length: FIXED_VARIANTS }, (_, i) => makeVariant('nuclear', 1, i + 1).map((t) => t.q).join('|'));
    expect(new Set(qs).size).toBe(FIXED_VARIANTS);
    expect(makeVariant('nuclear', 1, 2).map((t) => t.q)).toEqual(makeVariant('nuclear', 1, 2).map((t) => t.q));
    const kinds = Array.from({ length: FIXED_VARIANTS }, (_, i) => makeVariant('nuclear', 1, i + 1)[0]!.meta.kind);
    expect(new Set(kinds).size).toBe(4);
  });

  it('эталонный ответ засчитывается, грубо неверный — нет; J вводится дробью, чётность — знаком', () => {
    for (let v = 1; v <= 80; v++) for (const t of makeVariant('nuclear', 1, v)) for (const a of t.answers) {
      expect(checkAnswer(String(a.value), a.value, a.tol, a.abs)).toBe('ok');
      expect(checkAnswer(String(a.value * 1.5 + 1), a.value, a.tol, a.abs)).not.toBe('ok');
    }
    expect(checkAnswer('5/2', 2.5, 0.02, 0.01)).toBe('ok');
    expect(checkAnswer('−1', -1, 0.02, 0.01)).toBe('ok');
    expect(checkAnswer('-', -1, 0.02, 0.01)).toBe('ok');
    expect(checkAnswer('+', 1, 0.02, 0.01)).toBe('ok');
  });

  it('страница К/Р показывает вариант', () => {
    const src = readFileSync('src/content/exams/nuclear/sr1.mdx', 'utf8');
    expect(src).toContain('<SrVariant client:load course="nuclear" work={1} />');
  });

  it('частицы для кинематики — из таблицы П.1.5', () => {
    expect(PARTICLES.mu.m).toBe(105.658);
    expect(PARTICLES.pi.m).toBe(139.57);
  });
});
