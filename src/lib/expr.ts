/**
 * Ядро тренажёра: разбор ответа студента, сравнение выражений, TeX.
 * Ответ проверяется численно — сравнением значений в нескольких точках, поэтому
 * 2x, x*2 и x+x считаются одним ответом, а эталон берётся из mathjs, а не пишется руками.
 */
import {
  absDependencies, acosDependencies, acotDependencies, addDependencies, asinDependencies, atanDependencies, compileDependencies,
  cosDependencies, coshDependencies, cotDependencies, create, derivativeDependencies, divideDependencies,
  eDependencies, evaluateDependencies, expDependencies, fractionDependencies, InfinityDependencies, log10Dependencies,
  logDependencies, multiplyDependencies, parseDependencies, piDependencies, powDependencies, simplifyDependencies,
  secDependencies, cscDependencies, sechDependencies, cschDependencies, signDependencies,
  sinDependencies, sinhDependencies, sqrtDependencies, subtractDependencies, tanDependencies, tanhDependencies,
  unaryMinusDependencies, unaryPlusDependencies,
  type EvalFunction, type Fraction, type MathNode,
} from 'mathjs';
import type { Rng } from './rng';

/**
 * mathjs только с тем, что нужно тренажёру: разбор, вычисление, производная, упрощение, дроби,
 * элементарные функции и константы (sec, csc, sech, csch, sign нужны производным tg, ctg, th и модуля).
 * Полная сборка весит ~660 КБ, эта — почти вдвое меньше. Недостающую функцию сразу покажет tests/problems.test.ts.
 */
export const math = create({
  parseDependencies, compileDependencies, evaluateDependencies, derivativeDependencies, simplifyDependencies, fractionDependencies,
  addDependencies, subtractDependencies, multiplyDependencies, divideDependencies, powDependencies, unaryMinusDependencies, unaryPlusDependencies,
  sinDependencies, cosDependencies, tanDependencies, cotDependencies, asinDependencies, acosDependencies, atanDependencies, acotDependencies,
  secDependencies, cscDependencies, sechDependencies, cschDependencies, signDependencies,
  sinhDependencies, coshDependencies, tanhDependencies, expDependencies, logDependencies, log10Dependencies, sqrtDependencies, absDependencies,
  eDependencies, piDependencies, InfinityDependencies,
}, {});

/** Результат проверки ответа. */
export type Verdict = { ok: boolean; msg?: string };
export type Check = (input: string) => Verdict;

/* ---------- случайные числа для генераторов ---------- */

export const ri = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
export const rnz = (rng: Rng, a: number, b: number) => { let v; do { v = ri(rng, a, b); } while (v === 0); return v; };
export const pick = <T>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng() * a.length)]!;

/* ---------- дроби и линейные комбинации ---------- */

export const F = (n: number | Fraction, d = 1): Fraction => (typeof n === 'object' ? n : math.fraction(n, d) as Fraction);
const sgn = (f: Fraction) => Number(f.s) < 0;
const nn = (f: Fraction) => Number(f.n);
const dd = (f: Fraction) => Number(f.d);
/** Дробь в TeX: −3, \frac{1}{2}. */
export const fT = (f0: number | Fraction) => { const f = F(f0); const s = sgn(f) ? '-' : ''; return dd(f) === 1 ? s + nn(f) : `${s}\\frac{${nn(f)}}{${dd(f)}}`; };
/** Дробь в синтаксисе mathjs: −3, (1/2). */
export const fS = (f0: number | Fraction) => { const f = F(f0); const s = sgn(f) ? '-' : ''; return dd(f) === 1 ? s + nn(f) : `(${s}${nn(f)}/${dd(f)})`; };
/** c·b в синтаксисе mathjs без лишней единицы. */
export const cx = (c: number, b: string) => (c === 1 ? b : c === -1 ? `-${b}` : `${c}*${b}`);
/** c·b в TeX без лишней единицы. */
export const cxT = (c: number, b: string) => (c === 1 ? b : c === -1 ? `-${b}` : `${c}${b}`);

type Term = [number | Fraction, string];
/** Линейная комбинация в синтаксисе mathjs: [[3, 'x^2'], [-1, '']] → «3*x^2 - 1». */
export function S(terms: Term[]): string {
  let out = '';
  for (const [c0, b] of terms) {
    const c = F(c0);
    if (nn(c) === 0) continue;
    const neg = sgn(c), n = nn(c), d = dd(c), one = n === 1 && d === 1;
    const cs = d === 1 ? String(n) : `(${n}/${d})`;
    const p = !b ? cs : one ? b : b.startsWith('1/') && d === 1 ? cs + b.slice(1) : `${cs}*${b}`;
    out += out === '' ? (neg ? '-' : '') + p : (neg ? ' - ' : ' + ') + p;
  }
  return out || '0';
}
/** Линейная комбинация в TeX. */
export function lin(terms: Term[]): string {
  let out = '';
  for (const [c0, b] of terms) {
    const c = F(c0);
    if (nn(c) === 0) continue;
    const neg = sgn(c), n = nn(c), d = dd(c), one = n === 1 && d === 1;
    const cs = d === 1 ? String(n) : `\\frac{${n}}{${d}}`;
    const p = !b ? cs : one ? b : `${cs} ${b}`;
    out += out === '' ? (neg ? '-' : '') + p : (neg ? ' - ' : ' + ') + p;
  }
  return out || '0';
}

/* ---------- TeX в российской записи: tg, ctg, arctg, sh, ch ---------- */

function clean(t: string): string {
  return t
    // −(20x³) → −20x³: mathjs оставляет скобки после унарного минуса и вокруг одного одночлена.
    .replace(/-\\left\(([^()+\-\\]*(?:\\[a-z]+[^()+\-\\]*)*)\\right\)/g, '-$1')
    .replace(/\{ /g, '{').replace(/\( /g, '(').replace(/^ +/, '').replace(/([+\-=]) +/g, '$1')
    .replace(/\\mathrm\{([A-Z])(\d)\}/g, '$1_{$2}')
    .replace(/\\tan\^\{-1\}/g, '\\operatorname{arctg}').replace(/\\cot\^\{-1\}/g, '\\operatorname{arcctg}')
    .replace(/\\sin\^\{-1\}/g, '\\arcsin').replace(/\\cos\^\{-1\}/g, '\\arccos')
    .replace(/\\tan(?![a-z])/g, '\\operatorname{tg}').replace(/\\cot(?![a-z])/g, '\\operatorname{ctg}')
    .replace(/\\sinh(?![a-z])/g, '\\operatorname{sh}').replace(/\\cosh(?![a-z])/g, '\\operatorname{ch}')
    .replace(/(\d)\s*\\cdot\s*(?=[a-zA-Z{(]|\\(?!frac)[a-zA-Z])/g, '$1')
    .replace(/\s*\\cdot\s*(?=[a-zA-Z{(]|\\(?!frac)[a-zA-Z])/g, '\\,')
    .replace(/(^|[^\\a-zA-Z])([A-Z])(\d)(?![\d}])/g, '$1$2_{$3}');
}
/** Выражение mathjs (строка или узел) → TeX. */
export function tex(x: string | MathNode, parenthesis: 'keep' | 'auto' = 'auto'): string {
  const node = typeof x === 'string' ? math.parse(x) : x;
  return clean(node.toTex({ parenthesis, implicit: 'hide' }));
}

/* ---------- ввод студента ---------- */

const FN_MAP: Record<string, string> = { arcctg: 'acot', arctg: 'atan', arcsin: 'asin', arccos: 'acos', tg: 'tan', ctg: 'cot', ln: 'log', lg: 'log10', sh: 'sinh', ch: 'cosh', th: 'tanh' };

/** Привести привычную запись к синтаксису mathjs: tg → tan, ln → log, |x| → abs(x), «y = …» → «…», «+ C» убрать. */
export function prep(s0: string): string {
  let s = String(s0);
  s = s.replace(/[−–—]/g, '-').replace(/[·×]/g, '*').replace(/π/g, 'pi').replace(/∞/g, 'Infinity').replace(/√/g, 'sqrt').replace(/²/g, '^2').replace(/³/g, '^3');
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/^\s*[a-zA-Z]{1,2}'*\s*(\(\s*[a-z]\s*\))?\s*=(?!=)/, '');
  s = s.replace(/\+\s*const\b/gi, '');
  s = s.replace(/\b(arcctg|arctg|arcsin|arccos|tg|ctg|ln|lg|sh|ch|th)\b/g, (m) => FN_MAP[m]!);
  s = s.replace(/\|([^|]+)\|/g, '(abs($1))');
  s = s.replace(/\b(sin|cos|tan|cot|log)\^(\d+)\s*(\([^()]*\)|[a-z0-9.]+)/g, (_, f: string, p: string, a: string) => `(${f}(${a.replace(/^\((.*)\)$/, '$1')}))^${p}`);
  s = s.replace(/\b(sin|cos|tan|cot|log|sqrt|exp|atan|asin|acos|acot|sinh|cosh|tanh|abs)\s+([a-z0-9.]+)/g, '$1($2)');
  s = s.replace(/\bC_\{?(\d)\}?/g, 'C$1');
  s = s.replace(/\binf(inity)?\b/gi, 'Infinity');
  return s;
}

export function parseUser(s: string): MathNode {
  const p = prep(s);
  if (!p.trim()) throw new Error('Введите ответ.');
  return math.parse(p);
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const o = v as { isFraction?: boolean; isBigNumber?: boolean; re?: number; im?: number; valueOf(): number; toNumber?(): number };
  if (o?.isFraction) return o.valueOf();
  if (o?.isBigNumber) return o.toNumber!();
  if (o && typeof o.re === 'number') return Math.abs(o.im!) < 1e-9 * (1 + Math.abs(o.re)) ? o.re : NaN;
  return NaN;
}
export function evalAt(code: EvalFunction, scope: Record<string, number>): number {
  try { return num(code.evaluate({ ...scope })); } catch { return NaN; }
}
export function close(a: number, b: number, tol = 1e-6): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= tol * (1 + Math.abs(b));
}
/** n точек внутри [lo, hi] — с небольшим разбросом, чтобы случайные совпадения не проходили. */
function points([lo, hi]: [number, number], n = 8): number[] {
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * (i + 0.2 + 0.6 * ((i * 0.618034) % 1))) / n);
}

const KNOWN = new Set(['x', 'e', 'pi', 'E', 'i', 'Infinity', 'PI', 'NaN']);
/** Свободные обозначения выражения, кроме x и констант: C1, a… */
export function freeSyms(node: MathNode): string[] {
  const s = new Set<string>();
  node.traverse((n, path, parent) => {
    const sym = n as MathNode & { isSymbolNode?: boolean; name?: string };
    if (sym.isSymbolNode && !((parent as { isFunctionNode?: boolean } | null)?.isFunctionNode && path === 'fn') && !KNOWN.has(sym.name!)) s.add(sym.name!);
  });
  return [...s];
}

/** Совпадает ли выражение с функцией fn на области dom (в 8 точках). */
export function cmpFunc(node: MathNode, fn: (x: number) => number, dom: [number, number], scope: Record<string, number> = {}): Verdict {
  const c = node.compile();
  let good = 0;
  for (const x of points(dom)) {
    const t = fn(x);
    if (!Number.isFinite(t)) continue;
    const u = evalAt(c, { ...scope, x });
    if (!Number.isFinite(u)) return { ok: false, msg: `Ваше выражение не определено при x ≈ ${x.toFixed(2)}. Проверьте скобки и запись функций.` };
    if (!close(u, t)) return { ok: false, msg: 'Неверно.' };
    good++;
  }
  return good >= 4 ? { ok: true } : { ok: false, msg: 'Не удалось проверить ответ на этой области.' };
}

/** Ответ — функция, совпадающая с exact. */
export function chkFunc(exact: string, dom: [number, number]): Check {
  const ec = math.parse(exact).compile();
  return (inp) => {
    const u = parseUser(inp);
    const extra = freeSyms(u);
    if (extra.length) return { ok: false, msg: `В ответе лишние обозначения: ${extra.join(', ')}.` };
    return cmpFunc(u, (x) => evalAt(ec, { x }), dom);
  };
}

/** Ответ — первообразная f: её производная совпадает с f (постоянная C не важна). */
export function chkAnti(f: string, dom: [number, number]): Check {
  const fc = math.parse(f).compile();
  return (inp) => {
    const u = parseUser(inp);
    let d: MathNode;
    try { d = math.derivative(u, 'x'); } catch { return { ok: false, msg: 'Не получилось продифференцировать ваш ответ. Проверьте запись функций.' }; }
    const sc: Record<string, number> = {};
    freeSyms(u).forEach((s) => { sc[s] = 1.3; });
    const r = cmpFunc(d, (x) => evalAt(fc, { x }), dom, sc);
    if (!r.ok && r.msg === 'Неверно.') r.msg = 'Неверно: производная вашего ответа не совпадает с подынтегральной функцией.';
    return r;
  };
}

/** Число: 3/4, pi/2, e^2, sqrt(3), inf. */
export function parseNum(s: string): number {
  const t = String(s).trim().toLowerCase();
  if (/^(\+?\s*(inf|∞|бесконеч)|расход|div)/.test(t)) return Infinity;
  if (/^-\s*(inf|∞|бесконеч)/.test(t)) return -Infinity;
  const node = parseUser(s);
  const fs = freeSyms(node);
  if (fs.length) throw new Error(`Ответ должен быть числом, а в нём есть ${fs.join(', ')}.`);
  return evalAt(node.compile(), {});
}
export function chkNum(val: number): Check {
  return (inp) => {
    const u = parseNum(inp);
    if (Number.isNaN(u)) return { ok: false, msg: 'Не удалось прочитать число.' };
    if (!Number.isFinite(val) || !Number.isFinite(u)) return u === val ? { ok: true } : { ok: false, msg: 'Неверно.' };
    if (close(u, val, 1e-6)) return { ok: true };
    if (close(u, val, 1e-2)) return { ok: false, msg: 'Почти. Введите точное значение: дробью (1/3) или через pi, e, sqrt(…).' };
    return { ok: false, msg: 'Неверно.' };
  };
}

/** Проверка, не бросающая исключений: ошибки разбора — понятным сообщением. */
export function safeCheck(check: Check, input: string): Verdict {
  try { return check(input); } catch (e) { return { ok: false, msg: e instanceof Error && /[а-я]/i.test(e.message) ? e.message : 'Не удалось разобрать запись. Проверьте скобки и знаки умножения.' }; }
}

/** Предпросмотр ввода в TeX. */
export function previewTex(input: string): string {
  const v = input.trim();
  if (/^(inf|infinity|расх)/i.test(v)) return '\\infty';
  return tex(math.parse(prep(v)), 'keep');
}
