/**
 * Варианты самостоятельных: в каждом — по одной задаче на тему листка подготовки.
 * У темы несколько типов задач; числа разыгрываются от зерна варианта, ответ считается здесь же.
 * Варианты 1–4 фиксированы (одинаковы у всех), остальные зёрна — «случайный вариант».
 *
 * В meta лежат исходные данные: tests/stats-variants.test.ts пересчитывает по ним каждый ответ
 * другим путём — численными интегралами, таблицами моментов, функциями урока — на сотнях зёрен.
 */
import { mulberry32, type Rng } from '../../lib/rng';
import { deadFraction, deadFractionTwoChannels, measuredNonParalyzable, measuredParalyzable, poissonCdf, poissonPmf, protonLifetime, trueRate, zeroEventLimit } from './poisson';
import { linearFit, mlePosition, weightedMean } from './fit';

export interface VariantAnswer {
  /** Что ввести: «$\bar n$». */
  label: string;
  value: number;
  /** Относительный допуск; по умолчанию 2 %. */
  tol?: number;
  /** Абсолютный допуск — для ответов около нуля. */
  abs?: number;
  unit?: string;
}

export interface VariantTask {
  /** Тема — заголовок задачи. */
  topic: string;
  q: string;
  answers: VariantAnswer[];
  answer: string;
  hint?: string;
  meta: { kind: string } & Record<string, unknown>;
}

type Gen = (rng: Rng) => VariantTask;
interface Slot { topic: string; gens: Gen[] }

/* ---------- случайные числа и запись чисел ---------- */

const ri = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;

const SUP: Record<string, string> = { '-': '-' };
/** Число для TeX: 4 значащие цифры, 1.5·10^{32} для больших и маленьких. */
export function fmt(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = Number((v / 10 ** e).toPrecision(3));
    return `${m}\\cdot10^{${String(e).split('').map((c) => SUP[c] ?? c).join('')}}`;
  }
  return String(Number(v.toPrecision(digits)));
}
/** Число в тексте условия без TeX. */
const n = (v: number) => String(Number(v.toPrecision(6)));
/** Доля в процентах для подсказки: 0.0952 → «9.52 %». */
const pct = (v: number) => `${Number((100 * v).toPrecision(3))}\u00a0%`;

const moments = (x: readonly number[], p: readonly number[]) => {
  let m1 = 0, m2 = 0;
  x.forEach((v, i) => { m1 += v * p[i]!; m2 += v * v * p[i]!; });
  return { mean: m1, mean2: m2, sigma: Math.sqrt(Math.max(0, m2 - m1 * m1)) };
};

/* ===================== Самостоятельная 1 ===================== */

const SR1: Slot[] = [
  {
    topic: 'Среднее и σ дискретной величины',
    gens: [
      (rng) => {
        const pool = [-2, -1, 0, 1, 2, 3, 4, 5, 6];
        const x: number[] = [];
        while (x.length < 3) { const v = pick(rng, pool); if (!x.includes(v)) x.push(v); }
        x.sort((a, b) => a - b);
        const p1 = pick(rng, [0.1, 0.2, 0.3]), p2 = pick(rng, [0.2, 0.3, 0.4]);
        const p = [p1, p2, Number((1 - p1 - p2).toFixed(1))];
        const m = moments(x, p);
        return {
          topic: '', meta: { kind: 'table', x, p },
          q: `Величина принимает значения $${x.join(',\\ ')}$ с вероятностями $${p.join(';\\ ')}$. Найти $\\bar x$ и $\\sigma$.`,
          answers: [{ label: '$\\bar x$', value: m.mean, abs: 0.01 }, { label: '$\\sigma$', value: m.sigma }],
          hint: `$\\overline{x^2} = \\sum x_i^2 p_i = ${fmt(m.mean2)}$.`,
          answer: `$\\bar x = ${fmt(m.mean)}$, $\\overline{x^2} = ${fmt(m.mean2)}$, $\\sigma = \\sqrt{\\overline{x^2} - \\bar x^2} \\approx ${fmt(m.sigma, 3)}$.`,
        };
      },
      (rng) => {
        const K = ri(rng, 2, 5);
        const ns = Array.from({ length: K + 1 }, (_, i) => i);
        const C = 2 / ((K + 1) * (K + 2));
        const m = moments(ns, ns.map((k) => C * (k + 1)));
        return {
          topic: '', meta: { kind: 'linear', K },
          q: `Величина $n$ принимает значения $0, 1, \\ldots, ${K}$ с вероятностями $P(n) = C(n+1)$. Найти $C$, $\\bar n$, $\\sigma$.`,
          answers: [{ label: '$C$', value: C }, { label: '$\\bar n$', value: m.mean }, { label: '$\\sigma$', value: m.sigma }],
          hint: `Нормировка: $C(1 + 2 + \\ldots + ${K + 1}) = 1$.`,
          answer: `$C = 1/${(K + 1) * (K + 2) / 2}$, $\\bar n = ${fmt(m.mean)}$, $\\sigma \\approx ${fmt(m.sigma, 3)}$.`,
        };
      },
      (rng) => {
        const k = pick(rng, [2, 3, 4, 5]);
        const q = 1 / k, C = 1 - q, mean = q / (1 - q), sigma = Math.sqrt(q) / (1 - q);
        return {
          topic: '', meta: { kind: 'geom', k },
          q: `$P(n) = C/${k}^n$, $n = 0, 1, 2, \\ldots$ (до бесконечности). Найти $C$, $\\bar n$, $\\sigma$.`,
          answers: [{ label: '$C$', value: C }, { label: '$\\bar n$', value: mean }, { label: '$\\sigma$', value: sigma }],
          hint: 'С $q = 1/' + k + '$: $\\sum q^n = \\frac{1}{1-q}$, $\\sum nq^n = \\frac{q}{(1-q)^2}$, $\\sum n^2q^n = \\frac{q(1+q)}{(1-q)^3}$.',
          answer: `$C = ${fmt(C)}$, $\\bar n = ${fmt(mean)}$, $\\sigma^2 = ${fmt(sigma ** 2)}$, $\\sigma \\approx ${fmt(sigma, 3)}$.`,
        };
      },
      (rng) => {
        const k = pick(rng, [4, 6, 8, 10, 12, 20]);
        const mean = (k + 1) / 2, sigma = Math.sqrt((k * k - 1) / 12);
        return {
          topic: '', meta: { kind: 'die', k },
          q: `Кубик с ${k} гранями: $n = 1, \\ldots, ${k}$ равновероятно. Найти $\\bar n$ и $\\sigma$.`,
          answers: [{ label: '$\\bar n$', value: mean }, { label: '$\\sigma$', value: sigma }],
          hint: `$\\sum_{n=1}^{k} n^2 = \\frac{k(k+1)(2k+1)}{6}$.`,
          answer: `$\\bar n = ${fmt(mean)}$, $\\sigma^2 = \\frac{k^2 - 1}{12} = ${fmt(sigma ** 2)}$, $\\sigma \\approx ${fmt(sigma, 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Непрерывная величина: y(x) → f(x) → x̄, σ',
    gens: [
      (rng) => {
        const m = ri(rng, 1, 3), b = ri(rng, 1, 3);
        const C = (m + 1) / b ** (m + 1), mean = ((m + 1) * b) / (m + 2), mean2 = ((m + 1) * b * b) / (m + 3);
        const sigma = Math.sqrt(mean2 - mean * mean);
        const y = m === 1 ? 'x' : `x^${m}`;
        return {
          topic: '', meta: { kind: 'pow', m, b },
          q: `$y(x) = ${y}$ на $[0; ${b}]$, вне отрезка ноль. Найти константу нормировки $C$, $\\bar x$, $\\sigma$.`,
          answers: [{ label: '$C$', value: C }, { label: '$\\bar x$', value: mean }, { label: '$\\sigma$', value: sigma }],
          hint: `$\\int_0^{${b}} ${y}\\,dx = \\frac{${b}^{${m + 1}}}{${m + 1}}$.`,
          answer: `$f = ${fmt(C)}\\,${y}$, $\\bar x = ${fmt(mean)}$, $\\overline{x^2} = ${fmt(mean2)}$, $\\sigma \\approx ${fmt(sigma, 3)}$.`,
        };
      },
      (rng) => {
        const a = ri(rng, 2, 6);
        return {
          topic: '', meta: { kind: 'exp', a },
          q: `$y(x) = e^{-x/${a}}$ при $x \\ge 0$. Найти $C$, $\\bar x$, $\\sigma$.`,
          answers: [{ label: '$C$', value: 1 / a }, { label: '$\\bar x$', value: a }, { label: '$\\sigma$', value: a }],
          hint: 'Замена $t = x/a$ и $\\int_0^\\infty t^n e^{-t}dt = n!$.',
          answer: `$f = \\frac{1}{${a}}e^{-x/${a}}$, $\\bar x = ${a}$, $\\overline{x^2} = ${2 * a * a}$, $\\sigma = ${a}$.`,
        };
      },
      (rng) => {
        const b = ri(rng, 1, 4);
        const C = 6 / b ** 3, sigma = b / Math.sqrt(20);
        return {
          topic: '', meta: { kind: 'parab', b },
          q: `$y(x) = x(${b} - x)$ на $[0; ${b}]$, вне отрезка ноль. Найти $C$, $\\bar x$, $\\sigma$.`,
          answers: [{ label: '$C$', value: C }, { label: '$\\bar x$', value: b / 2 }, { label: '$\\sigma$', value: sigma }],
          hint: `Функция симметрична относительно $x = ${n(b / 2)}$ — среднее там.`,
          answer: `$C = 6/${b ** 3} = ${fmt(C)}$, $\\bar x = ${n(b / 2)}$, $\\sigma^2 = b^2/20 = ${fmt(sigma ** 2)}$, $\\sigma \\approx ${fmt(sigma, 3)}$.`,
        };
      },
      (rng) => {
        const a = ri(rng, 1, 3);
        const sigma = a * Math.SQRT2;
        return {
          topic: '', meta: { kind: 'xexp', a },
          q: `$y(x) = x\\,e^{-x/${a}}$ при $x \\ge 0$. Найти $C$, $\\bar x$, $\\sigma$.`,
          answers: [{ label: '$C$', value: 1 / (a * a) }, { label: '$\\bar x$', value: 2 * a }, { label: '$\\sigma$', value: sigma }],
          hint: `$\\int_0^\\infty x^n e^{-x/a}dx = n!\\,a^{n+1}$.`,
          answer: `$C = 1/${a * a}$, $\\bar x = ${2 * a}$, $\\overline{x^2} = ${6 * a * a}$, $\\sigma = ${a === 1 ? '' : a}\\sqrt2 \\approx ${fmt(sigma, 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'FWHM',
    gens: [
      (rng) => {
        const mu = ri(rng, 1, 9), k = pick(rng, [2, 4, 8, 18, 32, 50]);
        const w = 2 * Math.sqrt(k * Math.log(2));
        return {
          topic: '', meta: { kind: 'gauss', mu, k },
          q: `Найти FWHM функции $f(x) = e^{-(x-${mu})^2/${k}}$.`,
          answers: [{ label: 'FWHM', value: w }],
          hint: `$f_{\\max} = 1$ при $x = ${mu}$; решите $e^{-(x-${mu})^2/${k}} = \\tfrac12$.`,
          answer: `$(x - ${mu})^2 = ${k}\\ln2$, $\\text{FWHM} = 2\\sqrt{${k}\\ln 2} \\approx ${fmt(w, 3)}$.`,
        };
      },
      (rng) => {
        const mu = ri(rng, -3, 5), g = ri(rng, 1, 5);
        return {
          topic: '', meta: { kind: 'lorentz', mu, g },
          q: `Найти FWHM функции $f(x) = \\dfrac{1}{1 + (x - ${mu})^2/${g * g}}$.`.replace('- -', '+ '),
          answers: [{ label: 'FWHM', value: 2 * g }],
          hint: `Половина высоты: $(x - x_0)^2/${g * g} = 1$.`,
          answer: `$x = x_0 \\pm ${g}$, $\\text{FWHM} = ${2 * g}$.`,
        };
      },
      (rng) => {
        const a = pick(rng, [1, 2, 3, 5]);
        const w = 2 * a * Math.log(2);
        return {
          topic: '', meta: { kind: 'laplace', a },
          q: `Найти FWHM функции $f(x) = e^{-|x|/${a}}$.`,
          answers: [{ label: 'FWHM', value: w }],
          answer: `$|x| = ${a}\\ln 2$, $\\text{FWHM} = ${2 * a}\\ln2 \\approx ${fmt(w, 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Геометрическая вероятность',
    gens: [
      (rng) => {
        const L = pick(rng, [8, 10, 12, 20]), r = ri(rng, 1, 3);
        const P = 1 - (Math.PI * r * r) / (L * L);
        return {
          topic: '', meta: { kind: 'dead', L, r },
          q: `Частицы равномерно падают на квадратный детектор ${L} × ${L} см. В центре — нечувствительный круг радиусом ${r} см. Найти вероятность, что частица будет зарегистрирована.`,
          answers: [{ label: '$P$', value: P }],
          answer: `$P = 1 - \\frac{\\pi\\cdot${r}^2}{${L * L}} \\approx ${fmt(P, 3)}$.`,
        };
      },
      (rng) => {
        const L = pick(rng, [10, 12, 20]), d = ri(rng, 1, 2);
        const P = 1 - (L - 2 * d) ** 2 / (L * L);
        return {
          topic: '', meta: { kind: 'frame', L, d },
          q: `Частицы равномерно падают на квадратный детектор ${L} × ${L} см. Найти вероятность, что частица попадёт ближе ${d} см к краю.`,
          answers: [{ label: '$P$', value: P }],
          hint: `Дальше ${d} см от всех краёв — квадрат ${L - 2 * d} × ${L - 2 * d}.`,
          answer: `$P = \\frac{${L * L} - ${(L - 2 * d) ** 2}}{${L * L}} = ${fmt(P)}$.`,
        };
      },
      (rng) => {
        const T = pick(rng, [1, 2, 5]), tau = pick(rng, [20, 50, 100, 200]);
        const P = 1 - (1 - tau / (1000 * T)) ** 2;
        return {
          topic: '', meta: { kind: 'window', T, tau },
          q: `Две частицы приходят в случайные моменты внутри окна $T = ${T}$ мкс. Схема совпадений срабатывает, если интервал между ними меньше $\\tau = ${tau}$ нс. Найти вероятность срабатывания.`,
          answers: [{ label: '$P$', value: P }],
          hint: 'Пара моментов — точка в квадрате $T \\times T$; не срабатывает в двух треугольниках с катетом $T - \\tau$.',
          answer: `$P = 1 - (1 - \\tau/T)^2 = 1 - ${n(1 - tau / (1000 * T))}^2 \\approx ${fmt(P, 3)}$.`,
        };
      },
      (rng) => {
        const k = pick(rng, [3, 4, 5, 10]);
        return {
          topic: '', meta: { kind: 'rod', k },
          q: `Стержень длины $L$ ломают в случайной точке. Найти вероятность, что меньший кусок короче $L/${k}$.`,
          answers: [{ label: '$P$', value: 2 / k }],
          answer: `Точка разлома должна попасть в отрезок длины $L/${k}$ у одного из концов: $P = 2/${k} = ${fmt(2 / k)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Комбинации событий',
    gens: [
      (rng) => {
        const p1 = pick(rng, [0.7, 0.75, 0.8, 0.85, 0.9, 0.95]), p2 = pick(rng, [0.6, 0.7, 0.8, 0.9]);
        const any = 1 - (1 - p1) * (1 - p2), one = p1 * (1 - p2) + p2 * (1 - p1);
        return {
          topic: '', meta: { kind: 'two', p1, p2 },
          q: `Два независимых детектора с эффективностями ${p1} и ${p2}. Найти вероятность, что частицу зарегистрирует хотя бы один и что ровно один.`,
          answers: [{ label: 'хотя бы один', value: any }, { label: 'ровно один', value: one }],
          hint: '«Хотя бы один» = 1 − «ни одного».',
          answer: `$1 - ${n(1 - p1)}\\cdot${n(1 - p2)} = ${fmt(any)}$; $${p1}\\cdot${n(1 - p2)} + ${p2}\\cdot${n(1 - p1)} = ${fmt(one)}$.`,
        };
      },
      (rng) => {
        const p = pick(rng, [0.8, 0.85, 0.9, 0.95]);
        const all = p ** 3, two = 3 * p * p * (1 - p) + all;
        return {
          topic: '', meta: { kind: 'three', p },
          q: `Три независимых детектора с эффективностью ${p} каждый. Найти вероятность тройного совпадения и срабатывания хотя бы двух из трёх.`,
          answers: [{ label: 'тройное', value: all }, { label: 'хотя бы два', value: two }],
          hint: `Ровно два: $3\\cdot${p}^2\\cdot${n(1 - p)}$.`,
          answer: `$${p}^3 \\approx ${fmt(all)}$; $${fmt(all)} + 3\\cdot${p}^2\\cdot${n(1 - p)} \\approx ${fmt(two)}$.`,
        };
      },
      (rng) => {
        const nu1 = pick(rng, [500, 1000, 2000, 5000]), nu2 = pick(rng, [200, 500, 1000, 3000]), tau = pick(rng, [50, 100, 200, 500]);
        const r = 2 * tau * 1e-9 * nu1 * nu2;
        return {
          topic: '', meta: { kind: 'coinc', nu1, nu2, tau },
          q: `Два канала со скоростями $\\nu_1 = ${nu1}$ с⁻¹ и $\\nu_2 = ${nu2}$ с⁻¹, окно совпадений $\\tau = ${tau}$ нс. Найти скорость случайных совпадений.`,
          answers: [{ label: '$\\nu_{\\text{сл}}$', value: r, unit: 'с⁻¹' }],
          answer: `$2\\tau\\nu_1\\nu_2 = 2\\cdot${tau}\\cdot10^{-9}\\cdot${nu1}\\cdot${nu2} = ${fmt(r)}$ с⁻¹.`,
        };
      },
      (rng) => {
        const l = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3]);
        const p0 = Math.exp(-l), ge2 = 1 - Math.exp(-l) * (1 + l);
        return {
          topic: '', meta: { kind: 'pois', l },
          q: `Число отсчётов распределено по Пуассону с $\\lambda = ${l}$. Найти $P_0$ и $P(n \\ge 2)$.`,
          answers: [{ label: '$P_0$', value: p0 }, { label: '$P(n \\ge 2)$', value: ge2 }],
          answer: `$P_0 = e^{-${l}} \\approx ${fmt(p0, 3)}$, $P(n \\ge 2) = 1 - e^{-${l}}(1 + ${l}) \\approx ${fmt(ge2, 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Мёртвое время',
    gens: [
      (rng) => {
        const tau = pick(rng, [5, 10, 20, 50, 100]), nu = pick(rng, [500, 1000, 2000, 5000, 10000]);
        const f = deadFraction(nu, tau * 1e-6);
        return {
          topic: '', meta: { kind: 'frac', tau, nu },
          q: `$\\tau = ${tau}$ мкс, $\\nu = ${nu}$ с⁻¹. Какая доля событий попадает в мёртвое время?`,
          answers: [{ label: 'доля', value: f }],
          answer: `$x = \\nu\\tau = ${n(nu * tau * 1e-6)}$, $1 - e^{-x} \\approx ${fmt(f, 3)}$ (${pct(f)}).`,
        };
      },
      (rng) => {
        const tau = pick(rng, [50, 100, 200]), nu = pick(rng, [500, 1000, 2000]);
        const f = deadFractionTwoChannels(nu, tau * 1e-6);
        return {
          topic: '', meta: { kind: 'two-ch', tau, nu },
          q: `$\\nu = ${nu}$ с⁻¹, $\\tau = ${tau}$ мкс, есть дополнительный канал. Какая доля событий теряется?`,
          answers: [{ label: 'доля', value: f }],
          hint: 'Теряем, только если за τ пришло два события и больше: $1 - P_0 - P_1$.',
          answer: `$x = ${n(nu * tau * 1e-6)}$, $1 - e^{-x}(1 + x) \\approx ${fmt(f, 3)}$.`,
        };
      },
      (rng) => {
        const nTrue = pick(rng, [1000, 2000, 3000, 5000]), tau = pick(rng, [20, 50, 100]);
        const m = measuredNonParalyzable(nTrue, tau * 1e-6);
        return {
          topic: '', meta: { kind: 'nonpar', nTrue, tau },
          q: `Истинная скорость $n = ${nTrue}$ с⁻¹, $\\tau = ${tau}$ мкс (непродлевающийся тип). Какую скорость покажет счётчик?`,
          answers: [{ label: '$m$', value: m, unit: 'с⁻¹' }],
          answer: `$m = \\frac{n}{1 + n\\tau} = \\frac{${nTrue}}{${n(1 + nTrue * tau * 1e-6)}} \\approx ${fmt(m)}$ с⁻¹.`,
        };
      },
      (rng) => {
        const m = pick(rng, [1000, 2000, 4000, 5000]), t = pick(rng, [10, 30, 60]), tau = pick(rng, [10, 20, 40]);
        const k = 1 - m * tau * 1e-6;
        const nTrue = m / k, sn = Math.sqrt(m * t) / t / (k * k);
        return {
          topic: '', meta: { kind: 'nonpar-true', m, t, tau },
          q: `Счётчик показал $m = ${m}$ с⁻¹ за $t = ${t}$ с; мёртвое время непродлевающегося типа $\\tau = ${tau}$ мкс. Найти истинную скорость и её погрешность.`,
          answers: [{ label: '$n$', value: nTrue, unit: 'с⁻¹' }, { label: '$\\sigma_n$', value: sn, unit: 'с⁻¹', tol: 0.05 }],
          hint: '$\\sigma_m = \\sqrt{mt}/t$, $\\sigma_n = \\sigma_m/(1 - m\\tau)^2$.',
          answer: `$n = ${m}/${n(k)} \\approx ${fmt(nTrue)}$ с⁻¹, $\\sigma_n \\approx ${fmt(sn, 3)}$ с⁻¹.`,
        };
      },
    ],
  },
];

/* ===================== Самостоятельная 2 ===================== */

const SR2: Slot[] = [
  {
    topic: 'Скорость счёта и её погрешность',
    gens: [
      (rng) => {
        const t = pick(rng, [10, 20, 25, 50, 60, 100]), N = ri(rng, 10, 200) * 10;
        return {
          topic: '', meta: { kind: 'rate', N, t },
          q: `Детектор за $t = ${t}$ с зарегистрировал $N = ${N}$ событий. Найти скорость счёта и её погрешность.`,
          answers: [{ label: '$\\nu$', value: N / t, unit: 'с⁻¹' }, { label: '$\\sigma_\\nu$', value: Math.sqrt(N) / t, unit: 'с⁻¹' }],
          answer: `$\\nu = ${fmt(N / t)}$ с⁻¹, $\\sigma_\\nu = \\sqrt{${N}}/${t} \\approx ${fmt(Math.sqrt(N) / t, 3)}$ с⁻¹.`,
        };
      },
      (rng) => {
        const t = pick(rng, [50, 100, 200]), N = ri(rng, 80, 300) * 10, Nb = ri(rng, 10, 60) * 10;
        const r = N / t - Nb / t, s = Math.sqrt(N + Nb) / t;
        return {
          topic: '', meta: { kind: 'bg', N, Nb, t },
          q: `С источником за ${t} с набрано ${N} событий, фон без источника дал ${Nb} событий за ${t} с. Найти скорость счёта от источника и её погрешность.`,
          answers: [{ label: '$\\nu_s$', value: r, unit: 'с⁻¹' }, { label: '$\\sigma$', value: s, unit: 'с⁻¹' }],
          hint: 'Погрешности складываются в квадратах.',
          answer: `$\\nu_s = ${fmt(N / t)} - ${fmt(Nb / t)} = ${fmt(r)}$ с⁻¹, $\\sigma = \\sqrt{${N} + ${Nb}}/${t} \\approx ${fmt(s, 3)}$ с⁻¹.`,
        };
      },
      (rng) => {
        const nu = pick(rng, [10, 20, 50, 100, 200]), d = pick(rng, [1, 2, 5]);
        const N = 1 / (d / 100) ** 2;
        return {
          topic: '', meta: { kind: 'precision', nu, d },
          q: `Скорость счёта $\\nu \\approx ${nu}$ с⁻¹. Сколько отсчётов набрать и сколько времени мерить, чтобы относительная погрешность была ${d} %?`,
          answers: [{ label: '$N$', value: N }, { label: '$t$', value: N / nu, unit: 'с' }],
          hint: `$1/\\sqrt N = ${d / 100}$.`,
          answer: `$N = ${n(N)}$, $t = N/\\nu = ${fmt(N / nu)}$ с.`,
        };
      },
    ],
  },
  {
    topic: 'Вероятность больше n событий',
    gens: [
      (rng) => {
        const l = pick(rng, [1, 1.5, 2, 2.5, 3, 4]), k = ri(rng, 1, 3);
        const P = 1 - poissonCdf(l, k);
        return {
          topic: '', meta: { kind: 'gt', l, k },
          q: `$\\lambda = ${l}$. Найти $P(N > ${k})$.`,
          answers: [{ label: `$P(N > ${k})$`, value: P }],
          hint: `$P(N > ${k}) = 1 - (P_0 + \\ldots + P_${k})$.`,
          answer: `$1 - P(N \\le ${k}) \\approx ${fmt(P, 3)}$.`,
        };
      },
      (rng) => {
        const l = pick(rng, [0.5, 1, 1.5, 2, 3]), k = ri(rng, 2, 3);
        const P = 1 - poissonCdf(l, k - 1);
        return {
          topic: '', meta: { kind: 'ge', l, k },
          q: `$\\lambda = ${l}$. Найти вероятность не менее ${k} событий.`,
          answers: [{ label: `$P(N \\ge ${k})$`, value: P }],
          hint: `$P(N \\ge ${k}) = 1 - (P_0 + \\ldots + P_${k - 1})$ — на один член меньше, чем в «больше ${k}».`,
          answer: `$\\approx ${fmt(P, 3)}$.`,
        };
      },
      (rng) => {
        const nu = pick(rng, [2, 4, 5, 8, 10]), t = pick(rng, [0.2, 0.25, 0.5]), k = ri(rng, 1, 3);
        const l = nu * t, P = 1 - poissonCdf(l, k);
        return {
          topic: '', meta: { kind: 'gt-window', nu, t, k },
          q: `Скорость счёта $\\nu = ${nu}$ с⁻¹, окно $t = ${t}$ с. Найти вероятность больше ${k} событий в окне.`,
          answers: [{ label: `$P(N > ${k})$`, value: P }],
          hint: 'Сначала $\\lambda = \\nu t$.',
          answer: `$\\lambda = ${n(l)}$; $P(N > ${k}) \\approx ${fmt(P, 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Вероятность ровно n событий',
    gens: [
      (rng) => {
        const nu = pick(rng, [2, 3, 4, 6, 8]), t = pick(rng, [0.25, 0.5, 1]), k = ri(rng, 1, 4);
        const l = nu * t, P = poissonPmf(l, k);
        return {
          topic: '', meta: { kind: 'exact', nu, t, k },
          q: `Скорость счёта $\\nu = ${nu}$ с⁻¹. Какова вероятность зарегистрировать ровно ${k} событи${k === 1 ? 'е' : 'я'} за ${t} с?`,
          answers: [{ label: `$P_${k}$`, value: P }],
          answer: `$\\lambda = ${n(l)}$, $P_${k} = \\frac{${n(l)}^${k}}{${k}!}e^{-${n(l)}} \\approx ${fmt(P, 3)}$.`,
        };
      },
      (rng) => {
        const l = ri(rng, 2, 7) + 0.5;
        const k = Math.floor(l), P = poissonPmf(l, k);
        return {
          topic: '', meta: { kind: 'mode', l },
          q: `$\\lambda = ${l}$. Какое число событий наиболее вероятно и какова его вероятность?`,
          answers: [{ label: '$n$', value: k, abs: 0.01 }, { label: '$P_n$', value: P }],
          hint: 'Наиболее вероятное $n$ — целая часть $\\lambda$.',
          answer: `$n = ${k}$, $P_${k} \\approx ${fmt(P, 3)}$ (у соседей меньше: $P_${k - 1} \\approx ${fmt(poissonPmf(l, k - 1), 3)}$, $P_${k + 1} \\approx ${fmt(poissonPmf(l, k + 1), 3)}$).`,
        };
      },
      (rng) => {
        const l = pick(rng, [1, 2, 3, 4, 5]), k = ri(rng, 0, 5);
        const P = poissonPmf(l, k);
        return {
          topic: '', meta: { kind: 'pmf', l, k },
          q: `$\\lambda = ${l}$. Найти $P_${k}$.`,
          answers: [{ label: `$P_${k}$`, value: P }],
          answer: `$\\frac{${l}^${k}}{${k}!}e^{-${l}} \\approx ${fmt(P, 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Ноль событий',
    gens: [
      (rng) => {
        const T = pick(rng, [1, 2, 5, 10]), cl = pick(rng, [0.9, 0.95]);
        const v = zeroEventLimit(cl) / (T * 3600);
        return {
          topic: '', meta: { kind: 'zero-rate', T, cl },
          q: `За ${T} ч измерения не зарегистрировано ни одного события. Оценить сверху скорость счёта с уровнем доверия ${cl * 100} %.`,
          answers: [{ label: '$\\nu_{\\max}$', value: v, unit: 'с⁻¹' }],
          hint: '$e^{-\\lambda} = 1 - \\text{CL}$.',
          answer: `$\\lambda < -\\ln ${n(1 - cl)} = ${fmt(zeroEventLimit(cl), 3)}$, $\\nu < ${fmt(zeroEventLimit(cl), 3)}/${T * 3600} \\approx ${fmt(v, 3)}$ с⁻¹.`,
        };
      },
      (rng) => {
        const M = pick(rng, [1e5, 2e5, 5e5, 1e6, 2e6, 5e6]), yrs = ri(rng, 1, 5), cl = pick(rng, [0.9, 0.95]);
        const p = protonLifetime(M, yrs, zeroEventLimit(cl));
        return {
          topic: '', meta: { kind: 'proton', M, yrs, cl },
          q: `Водный детектор массой $${fmt(M)}$ кг за ${yrs} ${yrs === 1 ? 'год' : yrs < 5 ? 'года' : 'лет'} не зарегистрировал ни одного распада протона. Оценить снизу время жизни протона с уровнем доверия ${cl * 100} %.`,
          answers: [{ label: '$\\tau_p$', value: p.tau, unit: 'лет' }],
          hint: 'В молекуле H₂O 10 протонов, 18 г/моль; $\\lambda = N_p t/\\tau_p < -\\ln(1 - \\text{CL})$.',
          answer: `$N_p \\approx ${fmt(p.protons, 3)}$, $\\tau_p > ${fmt(p.tau, 3)}$ лет.`,
        };
      },
      (rng) => {
        const cl = pick(rng, [0.8, 0.9, 0.95, 0.99]);
        return {
          topic: '', meta: { kind: 'zero-l', cl },
          q: `Не зарегистрировано ни одного события. Найти верхний предел среднего $\\lambda$ с уровнем доверия ${cl * 100} %.`,
          answers: [{ label: '$\\lambda_{\\max}$', value: zeroEventLimit(cl) }],
          answer: `$\\lambda_{\\max} = -\\ln ${n(1 - cl)} \\approx ${fmt(zeroEventLimit(cl), 3)}$.`,
        };
      },
    ],
  },
  {
    topic: 'Мёртвое время и истинная скорость',
    gens: [
      (rng) => {
        const t = pick(rng, [5, 10, 20, 50]), N = ri(rng, 10, 60) * 100 * (t / 10), tau = pick(rng, [100, 200, 400, 500]);
        const r = trueRate(N, t, tau * 1e-6);
        return {
          topic: '', meta: { kind: 'true', N, t, tau },
          q: `Детектор зарегистрировал $N = ${N}$ событий за $t = ${t}$ с. Мёртвое время $\\tau = ${tau}$ мкс. Найти истинную скорость счёта и её погрешность.`,
          answers: [{ label: '$\\nu_{\\text{и}}$', value: r.rate, unit: 'с⁻¹' }, { label: '$\\sigma$', value: r.sigma, unit: 'с⁻¹', tol: 0.05 }],
          hint: '$\\nu_{\\text{и}} = \\frac{N}{t - N\\tau}$, $\\sigma = \\sqrt N\\frac{t}{(t - N\\tau)^2}$.',
          answer: `$\\nu_{\\text{д}} = ${fmt(r.measured)}$ с⁻¹, $\\nu_{\\text{и}} \\approx ${fmt(r.rate)} \\pm ${fmt(r.sigma, 2)}$ с⁻¹.`,
        };
      },
      (rng) => {
        const v = pick(rng, [200, 300, 500, 800, 1000]), tau = pick(rng, [100, 200, 300]), t = pick(rng, [5, 10, 20]);
        const N = measuredParalyzable(v, tau * 1e-6) * t;
        return {
          topic: '', meta: { kind: 'count', v, tau, t },
          q: `Истинная скорость источника ${v} с⁻¹, $\\tau = ${tau}$ мкс. Сколько событий детектор насчитает за ${t} с?`,
          answers: [{ label: '$N$', value: N }],
          hint: '$\\nu_{\\text{д}} = \\nu_{\\text{и}}e^{-\\nu_{\\text{и}}\\tau}$.',
          answer: `$\\nu_{\\text{д}} = ${v}e^{-${n(v * tau * 1e-6)}} \\approx ${fmt(N / t)}$ с⁻¹, $N \\approx ${fmt(N)}$.`,
        };
      },
      (rng) => {
        const tau = pick(rng, [1, 2, 3.3, 5]), nu = pick(rng, [10, 20, 50]);
        const f = deadFraction(nu, tau * 1e-3);
        return {
          topic: '', meta: { kind: 'frac-ms', tau, nu },
          q: `Мёртвое время $\\tau = ${tau}$ мс, скорость счёта $\\nu = ${nu}$ с⁻¹. Какая доля событий попадает в мёртвое время?`,
          answers: [{ label: 'доля', value: f }],
          answer: `$1 - e^{-${n(nu * tau * 1e-3)}} \\approx ${fmt(f, 3)}$ (${pct(f)}).`,
        };
      },
    ],
  },
  {
    topic: 'МНК и правдоподобие',
    gens: [
      (rng) => {
        const a = [ri(rng, 95, 105) / 10, ri(rng, 95, 105) / 10], s = [pick(rng, [0.1, 0.2]), pick(rng, [0.2, 0.3, 0.4])];
        const w = weightedMean(a, s);
        return {
          topic: '', meta: { kind: 'wmean', a, s },
          q: `Два измерения: $${a[0]} \\pm ${s[0]}$ и $${a[1]} \\pm ${s[1]}$. Найти взвешенное среднее и его погрешность.`,
          answers: [{ label: '$\\bar a$', value: w.mean, abs: 0.005 }, { label: '$\\sigma_{\\bar a}$', value: w.sigma }],
          hint: 'Веса $1/\\sigma_i^2$.',
          answer: `Веса ${n(1 / s[0]! ** 2)} и ${n(1 / s[1]! ** 2)}: $\\bar a \\approx ${fmt(w.mean)}$, $\\sigma \\approx ${fmt(w.sigma, 2)}$.`,
        };
      },
      (rng) => {
        const x = [0, 1, 2, 3], k0 = ri(rng, 1, 4), b0 = ri(rng, 0, 5);
        const y = x.map((v) => k0 * v + b0 + ri(rng, -1, 1));
        const f = linearFit(x, y);
        return {
          topic: '', meta: { kind: 'line', x, y },
          q: `Точки $(${x.map((v, i) => `${v};\\ ${y[i]}`).join('),\\ (')})$. Найти прямую $y = kx + b$ методом наименьших квадратов.`,
          answers: [{ label: '$k$', value: f.k, abs: 0.01 }, { label: '$b$', value: f.b, abs: 0.02 }],
          hint: `$\\bar x = 1.5$, $\\sum(x_i - \\bar x)^2 = 5$; $k = \\sum(x_i - \\bar x)(y_i - \\bar y)/5$, $b = \\bar y - k\\bar x$.`,
          answer: `$\\bar y = ${fmt(f.my)}$, $k = ${fmt(f.k)}$, $b = ${fmt(f.b)}$.`,
        };
      },
      (rng) => {
        const len = ri(rng, 4, 7), l = ri(rng, 3, 9);
        const c = Array.from({ length: len }, () => Math.max(0, l + ri(rng, -3, 3)));
        const mean = c.reduce((a, b) => a + b, 0) / len;
        return {
          topic: '', meta: { kind: 'pmle', c },
          q: `Детектор ${len} раз считал события за одинаковое время: ${c.join(', ')}. Найти оценку максимального правдоподобия для $\\lambda$ и её погрешность.`,
          answers: [{ label: '$\\hat\\lambda$', value: mean }, { label: '$\\sigma$', value: Math.sqrt(mean / len) }],
          hint: '$\\partial L/\\partial\\lambda = \\sum(1 - n_i/\\lambda) = 0$.',
          answer: `$\\hat\\lambda = \\bar n = ${fmt(mean)}$, $\\sigma = \\sqrt{\\bar n/N} \\approx ${fmt(Math.sqrt(mean / len), 3)}$.`,
        };
      },
      (rng) => {
        let a1 = 0, a2 = 0;
        do { a1 = ri(rng, 6, 40); a2 = ri(rng, 6, 40); } while (a1 === a2);
        const x = mlePosition(a1, a2);
        return {
          topic: '', meta: { kind: 'pmt', a1, a2 },
          q: `Сцинтиллятор 6 м с ФЭУ на концах, $A(x) = A_0e^{-x/d}$, $A_0 = 50$ ф.э., $d = 2$ м, амплитуды пуассоновские. Первый ФЭУ дал ${a1} ф.э., второй — ${a2} ф.э. На каком расстоянии от первого ФЭУ прошла частица (метод максимального правдоподобия)?`,
          answers: [{ label: '$x$', value: x, unit: 'м', abs: 0.03 }],
          hint: `Минимум $L$: $\\lambda_1 - \\lambda_2 = A_1 - A_2$; с $u = e^{-x/2}$ — квадратное уравнение $50u^2 - (A_1 - A_2)u - 50e^{-3} = 0$.`,
          answer: `$x \\approx ${fmt(x, 3)}$ м.`,
        };
      },
    ],
  },
];

const WORKS: Record<number, Slot[]> = { 1: SR1, 2: SR2 };

/** Сколько задач в варианте самостоятельной. */
export const variantSize = (work: number) => WORKS[work]?.length ?? 0;
/** Темы варианта — для подписи. */
export const variantTopics = (work: number) => (WORKS[work] ?? []).map((s) => s.topic);
/** Фиксированных вариантов — как на настоящей самостоятельной. */
export const FIXED_VARIANTS = 4;

/**
 * Вариант: для фиксированных (1–4) тип задачи в теме — по кругу, чтобы варианты различались;
 * для случайных — тип тоже случайный. Числа — от зерна варианта и номера темы.
 */
export function makeVariant(work: number, variant: number): VariantTask[] {
  const slots = WORKS[work];
  if (!slots) throw new Error(`Нет самостоятельной ${work}`);
  return slots.map((slot, i) => {
    const rng = mulberry32(variant * 7919 + i * 104729 + work * 15485863);
    const gen = variant <= FIXED_VARIANTS ? slot.gens[(variant - 1 + i) % slot.gens.length]! : pick(rng, slot.gens);
    return { ...gen(rng), topic: slot.topic };
  });
}

/** Все генераторы темы — для тестов. */
export const generators = (work: number) => (WORKS[work] ?? []).map((s) => s.gens);
