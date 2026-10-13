import { describe, expect, it } from 'vitest';
import { plural } from '../src/lib/plural';

const p = (n: number) => plural(n, 'урок', 'урока', 'уроков');

describe('plural', () => {
  it('один', () => {
    for (const n of [1, 21, 101, 1001]) expect(p(n)).toBe('урок');
  });
  it('несколько', () => {
    for (const n of [2, 3, 4, 22, 34, 102]) expect(p(n)).toBe('урока');
  });
  it('много', () => {
    for (const n of [0, 5, 10, 11, 12, 14, 19, 25, 111, 112, 114]) expect(p(n)).toBe('уроков');
  });
  it('отрицательные числа склоняются по модулю', () => {
    expect(p(-1)).toBe('урок');
    expect(p(-3)).toBe('урока');
  });
});
