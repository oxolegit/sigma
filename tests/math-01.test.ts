import { describe, expect, it } from 'vitest';
import { fn, FUNCTIONS, secantSlope, tangent } from '../src/labs/math/derivative';

/** Урок 1 «Определение и смысл производной»: каждое утверждение с формулой или числом. */

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
/** Разностная производная (центральная, с экстраполяцией Ричардсона). */
const numDeriv = (f: (x: number) => number, x: number) => {
  const d = (h: number) => (f(x + h) - f(x - h)) / (2 * h);
  return (4 * d(5e-5) - d(1e-4)) / 3;
};

describe('лаборатория 1.1: производные по таблице', () => {
  for (const f of FUNCTIONS) {
    it(`${f.label}: f′ совпадает с разностной производной`, () => {
      for (let i = 1; i < 20; i++) {
        const x = f.dom[0] + ((f.dom[1] - f.dom[0]) * i) / 20;
        if (!Number.isFinite(f.df(x)) || Math.abs(x) < 1e-3) continue;
        expect(near(f.df(x), numDeriv(f.f, x), 1e-7), `${f.label} при x=${x}`).toBe(true);
      }
    });
  }

  it('наклон секущей стремится к f′(x₀), ошибка убывает пропорционально Δx', () => {
    for (const f of FUNCTIONS.filter((x) => x.id !== 'abs')) {
      const x0 = f.id === 'sqrt' ? 1 : 0.7;
      const e1 = Math.abs(secantSlope(f, x0, 0.1) - f.df(x0));
      const e2 = Math.abs(secantSlope(f, x0, 0.01) - f.df(x0));
      expect(e2, f.label).toBeLessThan(e1);
      expect(Math.abs(secantSlope(f, x0, 1e-6) - f.df(x0)), f.label).toBeLessThan(1e-5);
    }
  });

  it('касательная проходит через точку касания с наклоном f′(x₀)', () => {
    const f = fn('sin'), t = tangent(f, 1);
    expect(t(1)).toBeCloseTo(Math.sin(1), 14);
    expect(t(2) - t(1)).toBeCloseTo(Math.cos(1), 14);
  });
});

describe('текст урока', () => {
  it('(x²)′ по определению: Δy/Δx = 2x + Δx точно, предел 2x', () => {
    const f = fn('sq');
    for (const x of [-1.5, 0.3, 2]) {
      for (const dx of [0.5, 0.01, -0.2]) expect(secantSlope(f, x, dx)).toBeCloseTo(2 * x + dx, 12);
    }
  });

  it('|x| в нуле: справа Δy/Δx = 1, слева −1, производной нет', () => {
    const f = fn('abs');
    for (const dx of [1, 0.1, 1e-6]) {
      expect(secantSlope(f, 0, dx)).toBe(1);
      expect(secantSlope(f, 0, -dx)).toBe(-1);
    }
    expect(Number.isNaN(f.df(0))).toBe(true);
  });

  it('дифференцируемая функция непрерывна: Δy = (Δy/Δx)·Δx → 0', () => {
    const f = fn('cube');
    for (const dx of [1e-2, 1e-4, 1e-6]) expect(Math.abs(f.f(1 + dx) - f.f(1))).toBeLessThan(2 * Math.abs(f.df(1)) * dx + 10 * dx * dx);
  });

  it('замечательные пределы', () => {
    const x = 1e-5;
    expect(Math.sin(x) / x).toBeCloseTo(1, 9);
    expect((1 + 1 / 1e8) ** 1e8).toBeCloseTo(Math.E, 6);
    expect(Math.log1p(x) / x).toBeCloseTo(1, 4);
    expect(Math.expm1(x) / x).toBeCloseTo(1, 4);
    for (const a of [-1, 0.5, 3]) expect(((1 + x) ** a - 1) / x).toBeCloseTo(a, 4);
  });

  it('эквивалентности при x → 0: отношения к x (и 1 − cos x к x²/2) стремятся к 1', () => {
    const x = 1e-4;
    for (const v of [Math.sin(x), Math.tan(x), Math.asin(x), Math.expm1(x), Math.log1p(x)]) expect(v / x).toBeCloseTo(1, 3);
    expect((1 - Math.cos(x)) / (x * x / 2)).toBeCloseTo(1, 4);
  });

  it('пример в тексте: lim sin 3x / x = 3', () => {
    expect(Math.sin(3e-6) / 1e-6).toBeCloseTo(3, 9);
  });
});

describe('вопросы урока', () => {
  it('1: наклон касательной к x² в x₀ = 3 равен 6', () => {
    expect(fn('sq').df(3)).toBe(6);
  });
  it('3: lim (1 − cos 2x)/x² = 2', () => {
    const x = 1e-4;
    expect((1 - Math.cos(2 * x)) / (x * x)).toBeCloseTo(2, 5);
  });
});
