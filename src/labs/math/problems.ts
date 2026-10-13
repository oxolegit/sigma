/**
 * Задачи тренажёра. Генератор получает Rng и возвращает условие, проверку и ответ.
 * Текст — с формулами в \( … \) и \[ … \]; рисует его MathText.
 *
 * Как задачи проверяются на верность (tests/problems.test.ts):
 * - в задачах «найти функцию» эталон считает mathjs (производная, подстановка) — ошибиться руками негде;
 * - в задачах «найти число» ответ записан формулой, поэтому в meta лежат исходные данные,
 *   и тест пересчитывает ответ независимо: численной производной, пределом, подстановкой.
 */
import type { Rng } from '../../lib/rng';
import { chkFunc, chkNum, cx, cxT, F, fT, lin, math, pick, ri, rnz, S, tex, type Check } from '../../lib/expr';

export interface Task {
  /** Условие: текст с формулами. */
  q: string;
  /** Подпись поля ответа (может содержать формулу). */
  label: string;
  placeholder: string;
  check: Check;
  /** Ответ — TeX для показа после «Показать ответ». */
  ans: string;
  hint: string;
  /** Разбор решения (HTML-текст с формулами), если есть. */
  sol?: string;
  /** Исходные данные для независимой проверки ответа в тестах. */
  meta?: Record<string, unknown>;
}

export interface ProblemType {
  id: string;
  topic: 'deriv' | 'integ' | 'ode' | 'series';
  name: string;
  level: 1 | 2 | 3;
  gen: (rng: Rng) => Task;
}

export const TYPES: ProblemType[] = [];
const add = (topic: ProblemType['topic'], id: string, name: string, level: ProblemType['level'], gen: ProblemType['gen']) => TYPES.push({ topic, id, name, level, gen });
export const problemType = (id: string) => TYPES.find((t) => t.id === id);

/** Задача из генератора: несколько попыток, если случайные параметры дали вырожденный случай. */
export function makeTask(type: ProblemType, rng: Rng): Task {
  for (let i = 0; ; i++) {
    try { return type.gen(rng); } catch (e) { if (i >= 11) throw e; }
  }
}

function numTask(q: string, val: number, valT: string, hint: string, sol = '', meta?: Record<string, unknown>): Task {
  const exact = /^-?\d+$/.test(valT.replace(/^.*=/, ''));
  const approx = Number.isFinite(val) && Math.abs(val - Math.round(val)) > 1e-9 && !exact ? ` \\approx ${(+val.toFixed(4)).toString()}` : '';
  return { q, label: 'Ответ', placeholder: 'число: 3/4, pi/2, e^2, sqrt(3), inf', check: chkNum(val), ans: `${valT}${approx}`, hint, sol, meta: { ...meta, value: val } };
}

/* =========================== ПРОИЗВОДНЫЕ =========================== */

function derivTask(f: string, o: { order?: 1 | 2; dom?: [number, number]; hint?: string } = {}): Task {
  const ord = o.order ?? 1, dom = o.dom ?? [0.3, 1.8];
  let d = math.parse(f);
  for (let i = 0; i < ord; i++) d = math.derivative(d, 'x');
  let s = d;
  try { s = math.simplify(d); } catch { /* оставляем как есть */ }
  const lab = ord === 1 ? "f'(x)" : "f''(x)";
  return {
    q: `Найдите ${ord === 1 ? 'производную' : 'вторую производную'} функции \\[ f(x)=${tex(f)} \\]`,
    label: `\\(${lab}\\)`, placeholder: 'например 3*x^2*cos(x) - 2/x',
    check: chkFunc(d.toString(), dom),
    ans: `${lab}=${tex(s)}`, hint: o.hint ?? '',
    meta: { f, order: ord, dom },
  };
}

add('deriv', 'd_poly', 'Многочлены', 1, (r) => {
  const n = ri(r, 3, 6), m = ri(r, 1, n - 1);
  const f = S([[rnz(r, -6, 6), `x^${n}`], [rnz(r, -8, 8), m === 1 ? 'x' : `x^${m}`], [ri(r, -9, 9), '']]);
  return derivTask(f, { hint: "Степень: \\((x^n)'=n\\,x^{n-1}\\). Постоянный множитель выносится, производная числа равна нулю, производная суммы — сумма производных." });
});

add('deriv', 'd_pow', 'Корни и отрицательные степени', 1, (r) => {
  const v = ri(r, 0, 2);
  let f: string;
  if (v === 0) f = S([[rnz(r, -6, 6), 'sqrt(x)'], [rnz(r, -5, 5), `1/x^${ri(r, 2, 3)}`], [rnz(r, -4, 4), 'x']]);
  else if (v === 1) { const [p, q] = pick(r, [[1, 3], [2, 3], [3, 2], [5, 2], [4, 3], [-1, 2]] as const); f = S([[rnz(r, -4, 4), `x^(${p}/${q})`], [rnz(r, -6, 6), 'x^2']]); }
  else f = S([[rnz(r, -5, 5), '1/sqrt(x)'], [rnz(r, -3, 3), `x^${ri(r, 2, 4)}`], [rnz(r, -4, 4), '1/x']]);
  return derivTask(f, { hint: "Перепишите корни и дроби как степени: \\(\\sqrt{x}=x^{1/2}\\), \\(\\dfrac{1}{x^k}=x^{-k}\\), \\(\\dfrac{1}{\\sqrt x}=x^{-1/2}\\). Затем \\((x^a)'=a\\,x^{a-1}\\)." });
});

add('deriv', 'd_elem', 'Табличные функции', 1, (r) => {
  const pool = ['sin(x)', 'cos(x)', 'e^x', 'log(x)', 'tan(x)', 'atan(x)', 'x^2', 'sqrt(x)'];
  const sel: string[] = [];
  while (sel.length < 3) { const b = pick(r, pool); if (!sel.includes(b)) sel.push(b); }
  return derivTask(S(sel.map((b) => [rnz(r, -5, 5), b])), { dom: [0.3, 1.4], hint: "Таблица: \\((\\sin x)'=\\cos x\\), \\((\\cos x)'=-\\sin x\\), \\((e^x)'=e^x\\), \\((\\ln x)'=\\frac1x\\), \\((\\operatorname{tg}x)'=\\frac{1}{\\cos^2x}\\), \\((\\operatorname{arctg}x)'=\\frac{1}{1+x^2}\\)." });
});

add('deriv', 'd_prod', 'Произведение', 2, (r) => {
  const n = ri(r, 1, 4), k = rnz(r, -3, 3), a = rnz(r, -2, 3), b = ri(r, 2, 3), c = rnz(r, -5, 5);
  const xn = n === 1 ? 'x' : `x^${n}`;
  const f = pick(r, [`${xn}*e^(${cx(k, 'x')})`, `${xn}*sin(${cx(k, 'x')})`, `${xn}*cos(${cx(k, 'x')})`, `${xn}*log(x)`, `e^(${cx(a, 'x')})*cos(${cx(b, 'x')})`, `(${S([[1, 'x^2'], [c, '']])})*e^x`, 'sqrt(x)*sin(x)']);
  return derivTask(f, { hint: "Правило произведения: \\((uv)'=u'v+uv'\\). Выделите \\(u\\) и \\(v\\), найдите их производные отдельно." });
});

add('deriv', 'd_quot', 'Частное', 2, (r) => {
  let a = rnz(r, -5, 5), b = rnz(r, -6, 6);
  const c = ri(r, 1, 4), d = ri(r, 1, 6);
  while (a * d === b * c) b = rnz(r, -6, 6);
  const n = ri(r, 1, 3), p = ri(r, 1, 5);
  const f = pick(r, [`(${S([[a, 'x'], [b, '']])})/(${S([[c, 'x'], [d, '']])})`, 'sin(x)/x', n === 1 ? 'log(x)/x' : `log(x)/x^${n}`, 'e^x/(x^2 + 1)', `x^2/(x + ${p})`, `(x^2 - ${p})/(x^2 + ${ri(r, 1, 5)})`, 'x/(e^x)']);
  return derivTask(f, { hint: "Правило частного: \\(\\left(\\dfrac uv\\right)'=\\dfrac{u'v-uv'}{v^2}\\). Следите за знаком «минус» в числителе." });
});

add('deriv', 'd_chain', 'Сложная функция', 2, (r) => {
  const a = ri(r, 1, 4), b = ri(r, 1, 5), n = ri(r, 2, 6), k = ri(r, 2, 3), s = pick(r, [1, -1]);
  const f = pick(r, [`(${cx(a, 'x')} + ${b})^${n}`, `sin(${cx(a, 'x^2')} + ${b})`, `e^(${cx(s * a, `x^${k}`)})`, `log(x^2 + ${b})`, `sqrt(${cx(a, 'x^2')} + ${b})`, `sin(x)^${n}`, `cos(x)^${n}`, `atan(${cx(a, 'x')})`, 'e^(sin(x))', 'log(sin(x))', `cos(e^(${cx(a, 'x')}))`, `(x^2 + ${b})^${n}`, `log(log(x + ${b}))`]);
  return derivTask(f, { dom: [0.3, 1.5], hint: "Цепное правило: \\(\\bigl(f(g(x))\\bigr)'=f'(g(x))\\cdot g'(x)\\). Дифференцируйте «снаружи внутрь»: каждый слой даёт множитель." });
});

add('deriv', 'd_point', 'Значение производной в точке', 2, (r) => {
  const a = ri(r, 1, 3), b = ri(r, 1, 4), n = ri(r, 2, 5), k = rnz(r, -2, 3), c = ri(r, 1, 6);
  const v = pick(r, [
    () => ({ f: `(${cx(a, 'x')} + ${b})^${n}`, x0: 0, v: F(n * a * b ** (n - 1)) }),
    () => ({ f: `x^${n}*e^(${cx(k, 'x')})`, x0: 1, vT: lin([[n + k, k === 1 ? 'e' : `e^{${k}}`]]), val: (n + k) * Math.exp(k) }),
    () => ({ f: `log(x^2 + ${c})`, x0: 1, v: F(2, 1 + c) }),
    () => ({ f: `(x^2 + ${c})/(x + ${b})`, x0: 0, v: F(-c, b * b) }),
    () => ({ f: `e^(${cx(a, 'x^2')} + ${cx(k, 'x')})`, x0: 0, v: F(k) }),
    () => ({ f: `sin(${cx(a, 'x')})*cos(${cx(b, 'x')})`, x0: 0, v: F(a) }),
    () => ({ f: `x^${n}*log(x)`, x0: 1, v: F(1) }),
    () => ({ f: `sqrt(x^2 + ${c * c})`, x0: 0, v: F(0) }),
  ] as (() => { f: string; x0: number; v?: ReturnType<typeof F>; vT?: string; val?: number })[])();
  const valT = v.vT ?? fT(v.v!), val = v.val ?? v.v!.valueOf();
  return numTask(`Найдите значение производной \\(f'(x_0)\\) при \\(x_0=${v.x0}\\): \\[ f(x)=${tex(v.f)} \\]`, val, `f'(${v.x0})=${valT}`,
    "Сначала найдите \\(f'(x)\\) в общем виде, потом подставьте точку. Упрощать удобно уже после подстановки.", '', { f: v.f, x0: v.x0 });
});

add('deriv', 'd_second', 'Вторая производная', 3, (r) => {
  const a = ri(r, 1, 3), b = ri(r, 1, 4), n = ri(r, 2, 4), k = rnz(r, -2, 3);
  const f = pick(r, [`x*e^(${cx(k, 'x')})`, `x^${n}*log(x)`, `x*sin(${cx(a, 'x')})`, `e^(${cx(k, 'x')})*cos(x)`, `1/(x + ${b})`, 'atan(x)', `log(x^2 + ${b})`, 'x^2*e^(-x)', 'e^(x^2)']);
  return derivTask(f, { order: 2, hint: "Вторая производная — производная от первой: \\(f''=(f')'\\). Найдите \\(f'\\), упростите, затем дифференцируйте ещё раз." });
});

add('deriv', 'd_logdiff', 'Логарифмическое дифференцирование', 3, (r) => {
  const a = ri(r, 2, 3);
  const f = pick(r, ['x^x', `x^(${a}*x)`, 'x^(sin(x))', 'sin(x)^x', 'x^(1/x)', '(x^2 + 1)^x', 'x^(log(x))', '(1 + x)^(1/x)']);
  return derivTask(f, { dom: [0.4, 1.5], hint: "Для \\(y=u^v\\) прологарифмируйте: \\(\\ln y=v\\ln u\\). Тогда \\(\\dfrac{y'}{y}=v'\\ln u+v\\dfrac{u'}{u}\\), и \\(y'=u^v\\Bigl(v'\\ln u+\\dfrac{v\\,u'}{u}\\Bigr)\\)." });
});

add('deriv', 'd_param', 'Параметрическая функция', 3, (r) => {
  if (r() < 0.5) {
    const a = ri(r, 1, 4), b = rnz(r, -5, 5), t0 = ri(r, 1, 2);
    const v = F(3 * t0 * t0 + b, 2 * t0 + a);
    return numTask(`Функция задана параметрически: \\[ x=t^2+${cxT(a, 't')},\\qquad y=${lin([[1, 't^3'], [b, 't']])}. \\] Найдите \\(y'_x\\) при \\(t=${t0}\\).`, v.valueOf(), `y'_x=${fT(v)}`,
      "\\(y'_x=\\dfrac{y'_t}{x'_t}\\).", `<p>\\(x'_t=2t+${a}\\), \\(y'_t=3t^2${b > 0 ? '+' : ''}${b}\\). При \\(t=${t0}\\): \\(\\dfrac{${3 * t0 * t0 + b}}{${2 * t0 + a}}\\).</p>`,
      { x: `t^2 + ${a}*t`, y: `t^3 + ${b}*t`, t0 });
  }
  const a = ri(r, 1, 5), b = ri(r, 1, 5), t = pick(r, [4, 6, 3]);
  const val = -(b / a) / Math.tan(Math.PI / t);
  const vT = t === 4 ? fT(F(-b, a)) : t === 6 ? `-\\frac{${b}\\sqrt3}{${a}}` : lin([[F(-b, 3 * a), '\\sqrt3']]);
  return numTask(`Эллипс задан параметрически: \\[ x=${a === 1 ? '' : a}\\cos t,\\qquad y=${b === 1 ? '' : b}\\sin t. \\] Найдите \\(y'_x\\) при \\(t=\\frac{\\pi}{${t}}\\).`, val, `y'_x=${vT}`,
    `\\(y'_x=\\dfrac{y'_t}{x'_t}=\\dfrac{${b}\\cos t}{-${a}\\sin t}=-\\dfrac{${b}}{${a}}\\operatorname{ctg}t\\).`, '',
    { x: `${a}*cos(t)`, y: `${b}*sin(t)`, t0: Math.PI / t });
});

add('deriv', 'd_impl', 'Неявная функция', 3, (r) => {
  let x0: number, y0: number, a: number, den: number;
  do { x0 = ri(r, -3, 3); y0 = ri(r, -3, 3); a = ri(r, 1, 3); den = a * x0 + 2 * y0; } while ((x0 === 0 && y0 === 0) || den === 0);
  const c = x0 * x0 + a * x0 * y0 + y0 * y0;
  const v = F(-(2 * x0 + a * y0), den);
  const ax = a === 1 ? '' : a;
  return numTask(`Функция \\(y(x)\\) задана неявно уравнением \\[ x^2+${ax}xy+y^2=${c}. \\] Найдите \\(y'\\) в точке \\((${x0};\\,${y0})\\).`, v.valueOf(), `y'=${fT(v)}`,
    `Продифференцируйте обе части по \\(x\\), считая \\(y=y(x)\\): \\(2x+${ax}(y+xy')+2yy'=0\\). Выразите \\(y'\\).`,
    `<p>\\(y'=-\\dfrac{2x+${ax}y}{${ax}x+2y}\\); подставляем точку.</p>`, { a, x0, y0, c });
});

add('deriv', 'd_lhop', 'Пределы по Лопиталю', 3, (r) => {
  const a = ri(r, 1, 4), b = ri(r, 1, 4), n = ri(r, 2, 4);
  // fn — та же функция в синтаксисе mathjs: по ней тест считает предел численно.
  const L = pick(r, [
    () => ({ t: `\\lim_{x\\to0}\\frac{e^{${cxT(a, 'x')}}-1}{\\sin ${cxT(b, 'x')}}`, v: F(a, b), fn: `(e^(${a}*x)-1)/sin(${b}*x)`, at: 0 }),
    () => ({ t: `\\lim_{x\\to0}\\frac{1-\\cos ${cxT(a, 'x')}}{x^2}`, v: F(a * a, 2), fn: `(1-cos(${a}*x))/x^2`, at: 0 }),
    () => ({ t: `\\lim_{x\\to0}\\frac{\\ln(1+${cxT(a, 'x')})}{${cxT(b, 'x')}}`, v: F(a, b), fn: `log(1+${a}*x)/(${b}*x)`, at: 0 }),
    () => ({ t: '\\lim_{x\\to0}\\frac{x-\\sin x}{x^3}', v: F(1, 6), fn: '(x-sin(x))/x^3', at: 0 }),
    () => ({ t: '\\lim_{x\\to0}\\frac{e^x-1-x}{x^2}', v: F(1, 2), fn: '(e^x-1-x)/x^2', at: 0 }),
    () => ({ t: `\\lim_{x\\to+\\infty}\\frac{x^{${n}}}{e^{x}}`, v: F(0), fn: `x^${n}/e^x`, at: Infinity }),
    () => ({ t: `\\lim_{x\\to0}\\frac{\\sin ${cxT(a, 'x')}-${cxT(a, 'x')}}{x^3}`, v: F(-(a ** 3), 6), fn: `(sin(${a}*x)-${a}*x)/x^3`, at: 0 }),
    () => ({ t: `\\lim_{x\\to0}\\frac{\\operatorname{tg}${cxT(a, 'x')}-${cxT(a, 'x')}}{x^3}`, v: F(a ** 3, 3), fn: `(tan(${a}*x)-${a}*x)/x^3`, at: 0 }),
    () => ({ t: `\\lim_{x\\to1}\\frac{x^{${n}}-1}{x-1}`, v: F(n), fn: `(x^${n}-1)/(x-1)`, at: 1 }),
    () => ({ t: '\\lim_{x\\to1}\\frac{\\ln x}{x-1}', v: F(1), fn: 'log(x)/(x-1)', at: 1 }),
  ])();
  return numTask(`Вычислите предел: \\[ ${L.t} \\]`, L.v.valueOf(), fT(L.v),
    "Неопределённость \\(\\frac00\\) или \\(\\frac\\infty\\infty\\): по правилу Лопиталя \\(\\lim\\frac fg=\\lim\\frac{f'}{g'}\\). Если снова неопределённость — применяйте ещё раз.", '',
    { fn: L.fn, at: L.at });
});
