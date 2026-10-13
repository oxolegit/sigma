import { describe, expect, it } from 'vitest';
import { math, safeCheck } from '../src/lib/expr';
import { mulberry32 } from '../src/lib/rng';
import { makeTask, problemType, TYPES, type Task } from '../src/labs/math/problems';

/** Сколько случайных вариантов каждого типа проверяется. mathjs.simplify медленный — 80 хватает, чтобы пройти все ветки генераторов. */
const RUNS = 80;
const SLOW = 60_000;

const compile = (s: string) => math.parse(s).compile();
const at = (code: ReturnType<typeof compile>, scope: Record<string, number>) => Number(code.evaluate({ ...scope }));
/** Центральная разностная производная порядка 1 или 2. Ошибка схемы O(h²); экстраполяция Ричардсона
 *  (4·D(h/2) − D(h))/3 убирает её главный член, остаётся O(h⁴). */
function numDeriv(f: (x: number) => number, x: number, order: 1 | 2): number {
  const d = (h: number) => (order === 1 ? (f(x + h) - f(x - h)) / (2 * h) : (f(x + h) - 2 * f(x) + f(x - h)) / (h * h));
  const h = order === 1 ? 1e-4 : 1e-2;
  return (4 * d(h / 2) - d(h)) / 3;
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * (1 + Math.abs(b));

function tasks(id: string): Task[] {
  const type = problemType(id)!;
  const rng = mulberry32(id.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
  return Array.from({ length: RUNS }, () => makeTask(type, rng));
}

describe('тренажёр: все типы задач', () => {
  it('у каждого типа есть генератор, условие, ответ и подсказка', () => {
    expect(TYPES.length).toBeGreaterThan(0);
    for (const t of TYPES) {
      const task = makeTask(t, mulberry32(1));
      expect(task.q.length, t.id).toBeGreaterThan(10);
      expect(task.ans.length, t.id).toBeGreaterThan(0);
      expect(task.hint.length, t.id).toBeGreaterThan(10);
    }
  });
});

describe('производные: эталон совпадает с численной производной', () => {
  for (const id of ['d_poly', 'd_pow', 'd_elem', 'd_prod', 'd_quot', 'd_chain', 'd_second', 'd_logdiff']) {
    it(id, { timeout: SLOW }, () => {
      for (const task of tasks(id)) {
        const { f, order, dom } = task.meta as { f: string; order: 1 | 2; dom: [number, number] };
        const fc = compile(f);
        const fx = (x: number) => at(fc, { x });
        // Эталон mathjs, который принимает проверка, — против разностной производной.
        let d = math.parse(f);
        for (let i = 0; i < order; i++) d = math.derivative(d, 'x');
        const dc = d.compile();
        for (const x of [dom[0] + 0.1, (dom[0] + dom[1]) / 2, dom[1] - 0.1]) {
          expect(near(at(dc, { x }), numDeriv(fx, x, order), order === 1 ? 1e-6 : 1e-5), `${f} при x=${x}`).toBe(true);
        }
        // Правильный ответ принимается, сама функция вместо производной — нет.
        expect(safeCheck(task.check, d.toString()).ok, f).toBe(true);
        expect(safeCheck(task.check, f).ok, f).toBe(false);
      }
    });
  }
});

describe('производные: числовые ответы пересчитаны независимо', () => {
  it('d_point — разностная производная в точке', { timeout: SLOW }, () => {
    for (const task of tasks('d_point')) {
      const { f, x0, value } = task.meta as { f: string; x0: number; value: number };
      const fc = compile(f);
      expect(near(value, numDeriv((x) => at(fc, { x }), x0, 1), 1e-6), `${f} в ${x0}`).toBe(true);
      expect(safeCheck(task.check, String(value)).ok).toBe(true);
    }
  });

  it('d_param — y′ₜ / x′ₜ разностями по t', () => {
    for (const task of tasks('d_param')) {
      const { x, y, t0, value } = task.meta as { x: string; y: string; t0: number; value: number };
      const xc = compile(x), yc = compile(y);
      const dy = numDeriv((t) => at(yc, { t }), t0, 1), dx = numDeriv((t) => at(xc, { t }), t0, 1);
      expect(near(value, dy / dx, 1e-6), `${x}, ${y} при t=${t0}`).toBe(true);
    }
  });

  it('d_impl — точка лежит на кривой, y′ = −F′ₓ / F′ᵧ', () => {
    for (const task of tasks('d_impl')) {
      const { a, x0, y0, c, value } = task.meta as { a: number; x0: number; y0: number; c: number; value: number };
      const Fn = (x: number, y: number) => x * x + a * x * y + y * y - c;
      expect(Fn(x0, y0)).toBe(0);
      const Fx = numDeriv((x) => Fn(x, y0), x0, 1), Fy = numDeriv((y) => Fn(x0, y), y0, 1);
      expect(near(value, -Fx / Fy, 1e-6)).toBe(true);
    }
  });

  it('d_lhop — предел, посчитанный приближением к точке', () => {
    for (const task of tasks('d_lhop')) {
      const { fn, at: a, value } = task.meta as { fn: string; at: number; value: number };
      const c = compile(fn);
      if (a === Infinity) {
        expect(at(c, { x: 80 })).toBeLessThan(1e-25);
        expect(value).toBe(0);
        continue;
      }
      const h = 1e-3;
      const est = (at(c, { x: a + h }) + at(c, { x: a - h })) / 2;
      expect(near(value, est, 1e-4), `${fn} при x→${a}`).toBe(true);
    }
  });
});
