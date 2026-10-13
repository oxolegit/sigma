import { describe, expect, it } from 'vitest';
import { decadeLabel, decadeTicks, niceTicks, pow10Label } from '../src/lib/plot';

describe('decadeTicks', () => {
  it('степени десяти внутри диапазона', () => {
    expect(decadeTicks(1e-3, 1e2).map(decadeLabel)).toEqual(['10⁻³', '10⁻²', '10⁻¹', '1', '10¹', '10²']);
  });
  it('при многих декадах — через одну', () => {
    expect(decadeTicks(1e-5, 1e7, 7).map((v) => Math.round(Math.log10(v)))).toEqual([-5, -3, -1, 1, 3, 5, 7]);
  });
});

describe('niceTicks', () => {
  it('шаг 1–2–5 × 10ⁿ', () => {
    expect(niceTicks(0, 8, 5)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.5, 1]);
    expect(niceTicks(0, 20, 5)).toEqual([0, 5, 10, 15, 20]);
    expect(niceTicks(0, 2.5, 5)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
  });
  it('без накопления ошибки округления', () => {
    expect(niceTicks(0, 0.7, 7)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  });
  it('вырожденный диапазон', () => {
    expect(niceTicks(3, 3)).toEqual([3]);
  });
});

describe('pow10Label', () => {
  it('показатель надстрочными цифрами', () => {
    expect(pow10Label(0)).toBe('1');
    expect(pow10Label(-2)).toBe('10⁻²');
    expect(pow10Label(12)).toBe('10¹²');
  });
});
