/**
 * Производная как предел наклона секущей (Пискунов, гл. III «Производная и дифференциал»).
 * Производные здесь записаны по таблице; тесты сверяют их с разностной производной.
 */

export interface Fn {
  id: string;
  /** Подпись в выборе функции. */
  label: string;
  /** TeX функции и её производной. */
  tex: string;
  dtex: string;
  f: (x: number) => number;
  /** Производная по таблице; NaN — производной в точке нет. */
  df: (x: number) => number;
  /** Область рисунка по x и по y. */
  x: [number, number];
  y: [number, number];
  /** Область определения, где можно ставить точку касания. */
  dom: [number, number];
}

export const FUNCTIONS: Fn[] = [
  { id: 'sq', label: 'x²', tex: 'x^2', dtex: '2x', f: (x) => x * x, df: (x) => 2 * x, x: [-2.5, 2.5], y: [-1, 6], dom: [-2.4, 2.4] },
  { id: 'cube', label: 'x³ − 2x', tex: 'x^3-2x', dtex: '3x^2-2', f: (x) => x ** 3 - 2 * x, df: (x) => 3 * x * x - 2, x: [-2.2, 2.2], y: [-5, 5], dom: [-2.1, 2.1] },
  { id: 'sin', label: 'sin x', tex: '\\sin x', dtex: '\\cos x', f: Math.sin, df: Math.cos, x: [-4, 4], y: [-1.6, 1.6], dom: [-3.9, 3.9] },
  { id: 'exp', label: 'eˣ', tex: 'e^x', dtex: 'e^x', f: Math.exp, df: Math.exp, x: [-3, 2], y: [-0.5, 6], dom: [-2.9, 1.7] },
  { id: 'sqrt', label: '√x', tex: '\\sqrt x', dtex: '\\frac{1}{2\\sqrt x}', f: Math.sqrt, df: (x) => (x > 0 ? 1 / (2 * Math.sqrt(x)) : NaN), x: [-0.5, 4.5], y: [-0.5, 2.5], dom: [0, 4.4] },
  { id: 'abs', label: '|x|', tex: '|x|', dtex: '\\operatorname{sign} x', f: Math.abs, df: (x) => (x === 0 ? NaN : Math.sign(x)), x: [-2.5, 2.5], y: [-1, 3], dom: [-2.4, 2.4] },
];
export const fn = (id: string) => FUNCTIONS.find((f) => f.id === id) ?? FUNCTIONS[0]!;

/** Наклон секущей Δy/Δx через точки x₀ и x₀ + Δx. */
export const secantSlope = (f: Fn, x0: number, dx: number) => (f.f(x0 + dx) - f.f(x0)) / dx;

/** Касательная y = f(x₀) + f′(x₀)(x − x₀). */
export const tangent = (f: Fn, x0: number) => (x: number) => f.f(x0) + f.df(x0) * (x - x0);
