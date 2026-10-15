/**
 * Варианты контрольной по ядерной физике — по структуре, которую дали на семинаре 7:
 * 1) λ, T, E, pc, γ — одно через другое (ħc ≈ 200 МэВ·фм помнить);
 * 2) свойства ядер: R, S, V, W, ε, εα, εn, εp — по таблице масс, а.е.м. помнить;
 * 3) капельная модель — формула Вайцзеккера дана в справочных данных;
 * 4) спин, чётность и магнитный момент по оболочечной модели;
 * 5) любая задача 1–7 недель.
 * Числа в условии — те же, что даст справочный листок: массы нуклидов, параметры формулы.
 * В meta — исходные данные: tests/nuclear-kr.test.ts пересчитывает по ним каждый ответ.
 */
import { fmt, pick, ri, type Gen, type Slot, type Works } from '../../lib/variants';
import type { Rng } from '../../lib/rng';
import { NUCLIDES, nucTex } from './nuclides';
import {
  AMU, E2, HBARC_ROUND, MATERIALS, ME, MP, M_H, M_HE4, M_N, PARTICLES, R0, atomMass, bethe, binding, coulombBarrier, deformation,
  fermiGas, fissionQ, hasNuclide, intrinsicQ, kin, levelTex, mirrorRadius, radius, rMinHeadOn, sepAlpha, sepN, sepP, shellModel,
  thresholdT, twoBody, weizsacker, zOpt, type MaterialKey, type ParticleKey,
} from './physics';

/** Округление до d значащих цифр — числа условия «как на бумаге». */
const sig = (v: number, d = 2) => Number(v.toPrecision(d));
/** Энергия в удобных единицах: 0.25 МэВ → «250 кэВ», 3400 МэВ → «3.4 ГэВ». */
function energyText(T: number): string {
  if (T < 1) return `${sig(T * 1000, 3)}\u00a0кэВ`;
  if (T >= 1000) return `${sig(T / 1000, 3)}\u00a0ГэВ`;
  return `${sig(T, 3)}\u00a0МэВ`;
}
const massLine = (items: [number, number][]) =>
  items.map(([A, Z]) => `$M(${nucTex(A, Z)}) = ${A === 1 && Z === 0 ? M_N : atomMass(A, Z)}$`).join(', ');
const MASS_NOTE = 'массы атомов — в а.е.м.';

/* ===================== 1. Кинематика ===================== */

const KIN_PARTICLES: ParticleKey[] = ['e', 'mu', 'pi', 'p', 'alpha'];
/** Кинетическая энергия частицы: от T ≪ mc² до T ≫ mc². */
const randomT = (rng: Rng, m: number) => sig(m * 10 ** (-2 + 3.5 * rng()), 2);

const kinGens: Gen[] = [
  (rng) => {
    const key = pick(rng, KIN_PARTICLES), P = PARTICLES[key];
    const T = randomT(rng, P.m);
    const k = kin(P.m, 'T', T, HBARC_ROUND);
    return {
      topic: '', q: `Кинетическая энергия ${P.gen} $T = $ ${energyText(T)}. Найти её импульс $pc$ и приведённую длину волны де Бройля $\\bar\\lambda$.`,
      answers: [{ label: '$pc$', value: k.pc, unit: 'МэВ' }, { label: '$\\bar\\lambda$', value: k.lambdaBar, unit: 'фм', tol: 0.025 }],
      answer: `$pc = \\sqrt{T(T + 2mc^2)} = ${fmt(k.pc)}$ МэВ, $\\bar\\lambda = \\hbar c/pc = 200/${fmt(k.pc)} = ${fmt(k.lambdaBar)}$ фм ($mc^2 = ${fmt(P.m)}$ МэВ).`,
      hint: 'Сначала сравните T с энергией покоя: какая формула нужна — релятивистская или классическая? pc = √(T(T + 2mc²)) верна всегда.',
      meta: { kind: 'T→pc,ƛ', m: P.m, T },
    };
  },
  (rng) => {
    const key = pick(rng, KIN_PARTICLES), P = PARTICLES[key];
    const lb = sig(kin(P.m, 'T', randomT(rng, P.m), HBARC_ROUND).lambdaBar, 2);
    const k = kin(P.m, 'lambdaBar', lb, HBARC_ROUND);
    return {
      topic: '', q: `Приведённая длина волны де Бройля ${P.gen} $\\bar\\lambda = ${fmt(lb)}$ фм. Найти её кинетическую энергию $T$ и лоренц-фактор $\\gamma$.`,
      answers: [{ label: '$T$', value: k.T, unit: 'МэВ', tol: 0.03 }, { label: '$\\gamma$', value: k.gamma, tol: 0.02, abs: 0.002 }],
      answer: `$pc = \\hbar c/\\bar\\lambda = 200/${fmt(lb)} = ${fmt(k.pc)}$ МэВ, $E = \\sqrt{(pc)^2 + (mc^2)^2} = ${fmt(k.E)}$ МэВ, $T = E - mc^2 = ${fmt(k.T)}$ МэВ, $\\gamma = E/mc^2 = ${fmt(k.gamma)}$.`,
      hint: 'ƛ → pc → E → T и γ. ħc ≈ 200 МэВ·фм.',
      meta: { kind: 'ƛ→T,γ', m: P.m, lb },
    };
  },
  (rng) => {
    const key = pick(rng, KIN_PARTICLES), P = PARTICLES[key];
    const gamma = sig(1.05 + 20 * rng() ** 2, 3);
    const k = kin(P.m, 'gamma', gamma);
    return {
      topic: '', q: `Полная энергия ${P.gen} в $\\gamma = ${fmt(gamma)}$ раз больше энергии покоя. Найти кинетическую энергию $T$, импульс $pc$ и скорость $\\beta = v/c$.`,
      answers: [{ label: '$T$', value: k.T, unit: 'МэВ' }, { label: '$pc$', value: k.pc, unit: 'МэВ' }, { label: '$\\beta$', value: k.beta, tol: 0.005 }],
      answer: `$T = (\\gamma - 1)mc^2 = ${fmt(k.T)}$ МэВ, $pc = mc^2\\sqrt{\\gamma^2 - 1} = ${fmt(k.pc)}$ МэВ, $\\beta = \\sqrt{1 - 1/\\gamma^2} = ${fmt(k.beta, 5)}$.`,
      hint: 'E = γmc², pc = βγmc².',
      meta: { kind: 'γ→T,pc,β', m: P.m, gamma },
    };
  },
  (rng) => {
    const key = pick(rng, ['mu', 'pi'] as const), P = PARTICLES[key];
    const tau0 = key === 'mu' ? 2.2e-6 : 2.6e-8;
    const T = sig(P.m * (0.3 + 30 * rng() ** 2), 2);
    const k = kin(P.m, 'T', T);
    const tau = k.gamma * tau0, L = k.beta * 299792458 * tau;
    return {
      topic: '', q: `${P.name === 'мюон' ? 'Мюон' : 'π±-мезон'} ($\\tau_0 = ${fmt(tau0)}$ с) летит с кинетической энергией $T = $ ${energyText(T)}. Во сколько раз растягивается его время жизни и какое расстояние $L$ он в среднем пролетает до распада?`,
      answers: [{ label: '$\\gamma$', value: k.gamma, tol: 0.01 }, { label: '$L$', value: L, unit: 'м' }],
      answer: `$\\gamma = 1 + T/mc^2 = ${fmt(k.gamma)}$; $L = \\beta\\gamma c\\tau_0 = \\dfrac{pc}{mc^2}\\,c\\tau_0 = ${fmt(k.betaGamma)}\\cdot ${fmt(299792458 * tau0)} = ${fmt(L)}$ м.`,
      hint: 'τ = γτ₀, L = vτ = βγcτ₀, а βγ = pc/mc².',
      meta: { kind: 'τ,L', m: P.m, T, tau0 },
    };
  },
];

/* ===================== 2. Свойства ядер ===================== */

const real = NUCLIDES.filter((x) => x.A >= 4 && x.Z > 0);
const withN = real.filter((x) => hasNuclide(x.A - 1, x.Z));
const withP = real.filter((x) => hasNuclide(x.A - 1, x.Z - 1));
const withAlpha = real.filter((x) => x.A > 8 && hasNuclide(x.A - 4, x.Z - 2));
const nucleus = (A: number, Z: number) => `$${nucTex(A, Z)}$`;

const propGens: Gen[] = [
  (rng) => {
    const x = pick(rng, real);
    const W = binding(x.A, x.Z);
    return {
      topic: '', q: `Найти энергию связи $W$ и удельную энергию связи $\\varepsilon$ ядра ${nucleus(x.A, x.Z)}. Данные (${MASS_NOTE}): ${massLine([[x.A, x.Z], [1, 1], [1, 0]])}.`,
      answers: [{ label: '$W$', value: W, unit: 'МэВ', tol: 0.01 }, { label: '$\\varepsilon$', value: W / x.A, unit: 'МэВ/нуклон', tol: 0.01 }],
      answer: `$W = [Z M(^1\\text{H}) + (A - Z)m_n - M]\\cdot 931.5 = ${fmt(W)}$ МэВ, $\\varepsilon = W/A = ${fmt(W / x.A)}$ МэВ.`,
      hint: 'Берите массу атома водорода, а не протона: электроны атома сокращаются. 1 а.е.м. = 931.5 МэВ.',
      meta: { kind: 'W', A: x.A, Z: x.Z },
    };
  },
  (rng) => {
    const x = pick(rng, withN);
    const v = sepN(x.A, x.Z);
    return {
      topic: '', q: `Найти энергию отделения нейтрона $\\varepsilon_n$ от ядра ${nucleus(x.A, x.Z)}. Данные (${MASS_NOTE}): ${massLine([[x.A, x.Z], [x.A - 1, x.Z], [1, 0]])}.`,
      answers: [{ label: '$\\varepsilon_n$', value: v, unit: 'МэВ', tol: 0.02, abs: 0.05 }],
      answer: `$\\varepsilon_n = [m_n + M(A - 1, Z) - M(A, Z)]\\cdot 931.5 = ${fmt(v)}$ МэВ.${v < 0 ? ' Отрицательная — ядро нестабильно к вылету нейтрона.' : ''}`,
      hint: 'Энергия отделения — разность масс «после» и «до»: продукт плюс нейтрон минус исходное ядро.',
      meta: { kind: 'εn', A: x.A, Z: x.Z },
    };
  },
  (rng) => {
    const x = pick(rng, withP);
    const v = sepP(x.A, x.Z);
    return {
      topic: '', q: `Найти энергию отделения протона $\\varepsilon_p$ от ядра ${nucleus(x.A, x.Z)}. Данные (${MASS_NOTE}): ${massLine([[x.A, x.Z], [x.A - 1, x.Z - 1], [1, 1]])}.`,
      answers: [{ label: '$\\varepsilon_p$', value: v, unit: 'МэВ', tol: 0.02, abs: 0.05 }],
      answer: `$\\varepsilon_p = [M(^1\\text{H}) + M(A - 1, Z - 1) - M(A, Z)]\\cdot 931.5 = ${fmt(v)}$ МэВ.`,
      hint: 'Протон уходит вместе с одним электроном атома — поэтому масса атома водорода.',
      meta: { kind: 'εp', A: x.A, Z: x.Z },
    };
  },
  (rng) => {
    const x = pick(rng, withAlpha);
    const v = sepAlpha(x.A, x.Z);
    return {
      topic: '', q: `Найти энергию отделения α-частицы $\\varepsilon_\\alpha$ от ядра ${nucleus(x.A, x.Z)}. Данные (${MASS_NOTE}): ${massLine([[x.A, x.Z], [x.A - 4, x.Z - 2], [4, 2]])}.`,
      answers: [{ label: '$\\varepsilon_\\alpha$', value: v, unit: 'МэВ', tol: 0.02, abs: 0.05 }],
      answer: `$\\varepsilon_\\alpha = [M(^4\\text{He}) + M(A - 4, Z - 2) - M(A, Z)]\\cdot 931.5 = ${fmt(v)}$ МэВ.${v < 0 ? ' Отрицательная — α-распад энергетически разрешён.' : ''}`,
      hint: 'α-частица — ядро ⁴He; атомные массы, электроны сокращаются.',
      meta: { kind: 'εα', A: x.A, Z: x.Z },
    };
  },
  (rng) => {
    const x = pick(rng, real);
    const R = radius(x.A), S = 4 * Math.PI * R * R, V = (4 / 3) * Math.PI * R ** 3;
    return {
      topic: '', q: `Оценить радиус $R$, площадь поверхности $S$ и объём $V$ ядра ${nucleus(x.A, x.Z)}, считая его шаром ($r_0 = 1.4$ фм).`,
      answers: [{ label: '$R$', value: R, unit: 'фм' }, { label: '$S$', value: S, unit: 'фм²' }, { label: '$V$', value: V, unit: 'фм³' }],
      answer: `$R = r_0A^{1/3} = 1.4\\cdot${x.A}^{1/3} = ${fmt(R)}$ фм, $S = 4\\pi R^2 = ${fmt(S)}$ фм², $V = \\tfrac43\\pi R^3 = ${fmt(V)}$ фм³.`,
      hint: 'R = r₀A^{1/3}; объём растёт как A — плотность ядер одинакова.',
      meta: { kind: 'RSV', A: x.A },
    };
  },
];

/* ===================== 3. Капельная модель ===================== */

/** Массовое число на дорожке стабильности для заряда Z: наименьшее A с Z_opt(A) ≥ Z. */
function stableA(Z: number): number {
  let A = 2 * Z;
  while (zOpt(A) < Z) A++;
  return A;
}

/** Ядро около дорожки стабильности: A в диапазоне, Z = Z_opt ± 2. */
function nearStable(rng: Rng, lo: number, hi: number) {
  const A = ri(rng, lo, hi);
  const Z = Math.round(zOpt(A)) + ri(rng, -2, 2);
  return { A, Z };
}
const WEIZ_NOTE = 'по формуле Вайцзеккера';

const MIRRORS = ([[11, 5], [13, 6], [15, 7], [23, 11]] as const).filter(([A, Z]) => hasNuclide(A, Z) && hasNuclide(A, Z + 1));

const dropGens: Gen[] = [
  (rng) => {
    const { A, Z } = nearStable(rng, 20, 240);
    const W = weizsacker(A, Z);
    return {
      topic: '', q: `Найти ${WEIZ_NOTE} энергию связи $W$ и удельную энергию связи $\\varepsilon$ ядра ${nucleus(A, Z)}.`,
      answers: [{ label: '$W$', value: W, unit: 'МэВ', tol: 0.01 }, { label: '$\\varepsilon$', value: W / A, unit: 'МэВ/нуклон', tol: 0.01 }],
      answer: `Ядро ${Z % 2 === 0 && (A - Z) % 2 === 0 ? 'чётно-чётное' : Z % 2 === 1 && (A - Z) % 2 === 1 ? 'нечётно-нечётное' : 'нечётное'}; $W = ${fmt(W)}$ МэВ, $\\varepsilon = ${fmt(W / A)}$ МэВ.`,
      hint: 'Пять слагаемых: объём, поверхность, кулон Z(Z − 1)/A^{1/3}, асимметрия (A − 2Z)²/A и спаривание — его знак по чётности Z и N.',
      meta: { kind: 'Wweiz', A, Z },
    };
  },
  (rng) => {
    let A: number;
    do A = ri(rng, 20, 240); while (Math.abs(zOpt(A) - Math.round(zOpt(A))) > 0.4);
    const z = zOpt(A);
    return {
      topic: '', q: `Найти заряд $Z$ наиболее устойчивого изобара с массовым числом $A = ${A}$. Пренебречь единицей в кулоновском слагаемом.`,
      answers: [{ label: '$Z_{\\text{опт}}$', value: Math.round(z), abs: 0.01 }],
      answer: `Из $\\partial M/\\partial Z = 0$: $Z = \\dfrac{A}{0.015A^{2/3} + 1.973} = ${fmt(z)} \\approx ${Math.round(z)}$.`,
      hint: 'Масса ядра M = Z·m_p + N·m_n − W. Продифференцируйте по Z при постоянном A и приравняйте нулю.',
      meta: { kind: 'Zopt', A },
    };
  },
  (rng) => {
    const Z = 2 * ri(rng, 40, 48);
    const A = stableA(Z) + (stableA(Z) % 2);
    const Q = fissionQ(A, Z);
    return {
      topic: '', q: `Найти ${WEIZ_NOTE} энергию, выделяющуюся при делении ядра ${nucleus(A, Z)} на два одинаковых осколка.`,
      answers: [{ label: '$Q$', value: Q, unit: 'МэВ', tol: 0.02 }],
      answer: `Осколки — $${nucTex(A / 2, Z / 2)}$. $Q = 2W(${A / 2}, ${Z / 2}) - W(${A}, ${Z}) = 2\\cdot${fmt(weizsacker(A / 2, Z / 2))} - ${fmt(weizsacker(A, Z))} = ${fmt(Q)}$ МэВ.`,
      hint: 'Энергия выделяется, если связь осколков сильнее: Q = ΣW(осколков) − W(ядра). Объёмное слагаемое сокращается.',
      meta: { kind: 'fission', A, Z },
    };
  },
  (rng) => {
    const { A, Z } = nearStable(rng, 30, 220);
    const v = weizsacker(A, Z) - weizsacker(A - 1, Z);
    return {
      topic: '', q: `Найти ${WEIZ_NOTE} энергию отделения нейтрона от ядра ${nucleus(A, Z)}.`,
      answers: [{ label: '$\\varepsilon_n$', value: v, unit: 'МэВ', tol: 0.03, abs: 0.2 }],
      answer: `$\\varepsilon_n = W(${A}, ${Z}) - W(${A - 1}, ${Z}) = ${fmt(weizsacker(A, Z))} - ${fmt(weizsacker(A - 1, Z))} = ${fmt(v)}$ МэВ.`,
      hint: 'Энергия отделения — разность энергий связи ядра и остатка. Не забудьте, что слагаемое спаривания у них разное.',
      meta: { kind: 'εnWeiz', A, Z },
    };
  },
  (rng) => {
    const [A, Z] = pick(rng, MIRRORS);
    const R = mirrorRadius(A, Z);
    return {
      topic: '', q: `Зеркальные ядра ${nucleus(A, Z)} и ${nucleus(A, Z + 1)}. Считая, что разность их энергий связи — это только разность кулоновских энергий $\\tfrac35 Z^2e^2/R$, найти радиус $R$. Данные (${MASS_NOTE}): ${massLine([[A, Z], [A, Z + 1], [1, 1], [1, 0]])}.`,
      answers: [{ label: '$R$', value: R, unit: 'фм', tol: 0.03 }],
      answer: `$\\Delta W = W(${A}, ${Z}) - W(${A}, ${Z + 1}) = ${fmt(binding(A, Z) - binding(A, Z + 1))}$ МэВ; $R = \\dfrac{3}{5}\\dfrac{e^2}{4\\pi\\varepsilon_0}\\dfrac{(Z+1)^2 - Z^2}{\\Delta W} = \\dfrac{0.6\\cdot1.44\\cdot${2 * Z + 1}}{${fmt(binding(A, Z) - binding(A, Z + 1))}} = ${fmt(R)}$ фм.`,
      hint: 'e²/4πε₀ = 1.44 МэВ·фм. Ядерные силы зарядово-независимы: в зеркальных ядрах отличается только кулон.',
      meta: { kind: 'mirror', A, Z },
    };
  },
];

/* ===================== 4. Спин, чётность, магнитный момент ===================== */

/** Ядро с заданной чётностью Z и N около дорожки стабильности, Z ≤ 50, N ≤ 82. */
function shellNucleus(rng: Rng, oddZ: boolean, oddN: boolean) {
  for (;;) {
    const Z = ri(rng, 3, 50);
    if (Z % 2 !== (oddZ ? 1 : 0)) continue;
    // N — ближайшее к дорожке стабильности с нужной чётностью.
    let N = stableA(Z) - Z;
    if (N % 2 !== (oddN ? 1 : 0)) N += pick(rng, [-1, 1]);
    if (N < 1 || N > 82 || (Z < 8 && Math.abs(N - Z) > 2)) continue;
    return { A: Z + N, Z, N };
  }
}

const shellGens: Gen[] = [
  ...[true, false].map((oddProton): Gen => (rng) => {
    const { A, Z, N } = shellNucleus(rng, oddProton, !oddProton);
    const r = shellModel(A, Z);
    if (r.kind !== 'odd') throw new Error('ожидалось нечётное ядро');
    const who = oddProton ? 'протон' : 'нейтрон';
    return {
      topic: '', q: `По оболочечной модели найти спин $J$, чётность $P$ и магнитный момент $\\mu$ (в ядерных магнетонах) основного состояния ядра ${nucleus(A, Z)}. Для протона $g_s = 5.586$, $g_l = 1$; для нейтрона $g_s = -3.826$, $g_l = 0$. Чётность вводите как $+1$ или $-1$.`,
      answers: [{ label: '$J$', value: r.J, abs: 0.01 }, { label: '$P$', value: r.P, abs: 0.01 }, { label: '$\\mu$', value: r.mu, unit: 'μN', tol: 0.02, abs: 0.01 }],
      answer: `$Z = ${Z}$, $N = ${N}$: неспаренный ${who}, ${oddProton ? Z : N}-й по счёту — на уровне $${levelTex(r.level)}$ ($l = ${r.level.l}$). $J^P = ${r.J * 2}/2^{${r.P > 0 ? '+' : '-'}}$, $g = g_l ${r.level.j > r.level.l ? '+' : '-'} \\dfrac{g_s - g_l}{2l + 1}$, $\\mu = gJ = ${fmt(r.mu)}\\,\\mu_N$.`,
      hint: 'Заполняйте уровни по схеме: 1s1/2 | 1p3/2 1p1/2 | 1d5/2 2s1/2 1d3/2 | 1f7/2 | 2p3/2 1f5/2 2p1/2 1g9/2 | … Спин даёт непарный нуклон: J = j, P = (−1)^l.',
      meta: { kind: 'shell', A, Z },
    };
  }),
  (rng) => {
    const { A, Z, N } = shellNucleus(rng, true, true);
    const r = shellModel(A, Z);
    if (r.kind !== 'oddodd') throw new Error('ожидалось нечётно-нечётное');
    return {
      topic: '', q: `По оболочечной модели найти возможные значения спина $J$ ядра ${nucleus(A, Z)} (наименьшее и наибольшее) и его чётность $P$ ($+1$ или $-1$).`,
      answers: [{ label: '$J_{\\min}$', value: r.Jmin, abs: 0.01 }, { label: '$J_{\\max}$', value: r.Jmax, abs: 0.01 }, { label: '$P$', value: r.P, abs: 0.01 }],
      answer: `$Z = ${Z}$: протон на $${levelTex(r.p)}$; $N = ${N}$: нейтрон на $${levelTex(r.n)}$. $|j_p - j_n| \\le J \\le j_p + j_n$: $${r.Jmin} \\le J \\le ${r.Jmax}$; $P = (-1)^{l_p + l_n} = ${r.P > 0 ? '+1' : '-1'}$.`,
      hint: 'У нечётно-нечётного ядра непарных два — протон и нейтрон; их моменты складываются по правилам сложения моментов.',
      meta: { kind: 'oddodd', A, Z },
    };
  },
];

/* ===================== 5. Любая задача 1–7 недель ===================== */

const TARGETS = [[197, 79], [107, 47], [63, 29], [208, 82], [27, 13], [56, 26]] as const;
const LOSS_MATERIALS: MaterialKey[] = ['Al', 'Fe', 'Cu', 'Pb'];
const DECAYS = [
  { title: '$\\pi^+ \\to \\mu^+ + \\nu_\\mu$', M: PARTICLES.pi.m, m1: PARTICLES.mu.m, m2: 0, n1: '\\mu', n2: '\\nu' },
  { title: '$K^+ \\to \\mu^+ + \\nu_\\mu$', M: PARTICLES.K.m, m1: PARTICLES.mu.m, m2: 0, n1: '\\mu', n2: '\\nu' },
  { title: '$K^- \\to \\pi^- + \\pi^0$', M: PARTICLES.K.m, m1: PARTICLES.pi.m, m2: PARTICLES.pi0.m, n1: '\\pi^-', n2: '\\pi^0' },
  { title: '$\\Lambda \\to p + \\pi^-$ ($m_\\Lambda c^2 = 1115.7$ МэВ)', M: 1115.683, m1: MP, m2: PARTICLES.pi.m, n1: 'p', n2: '\\pi^-' },
];
const THRESHOLDS = [
  { title: '$p + p \\to p + p + \\pi^0$', m1: MP, m2: MP, final: 2 * MP + PARTICLES.pi0.m },
  { title: '$\\gamma + p \\to p + \\pi^0$', m1: 0, m2: MP, final: MP + PARTICLES.pi0.m },
  { title: '$\\pi^- + p \\to K^0 + \\Lambda$ ($m_{K^0}c^2 = 497.6$, $m_\\Lambda c^2 = 1115.7$ МэВ)', m1: PARTICLES.pi.m, m2: MP, final: 497.611 + 1115.683 },
  { title: '$p + p \\to p + p + p + \\bar p$', m1: MP, m2: MP, final: 4 * MP },
];

const anyGens: Gen[] = [
  (rng) => {
    const J = pick(rng, [1, 1.5, 2, 2.5, 3.5]);
    const A = ri(rng, 25, 180), Z = Math.round(zOpt(A));
    const Q = sig((rng() < 0.5 ? -1 : 1) * (0.03 + 1.2 * rng()), 2);
    const Q0 = intrinsicQ(Q, J), b = deformation(Q0, Z, A);
    return {
      topic: '', q: `Наблюдаемый квадрупольный момент ядра ${nucleus(A, Z)} со спином $J = ${J}$ равен $\\langle Q\\rangle = ${Q}$ б. Найти собственный квадрупольный момент $Q_0$ и параметр деформации $\\beta$ ($r_0 = 1.4$ фм).`,
      answers: [{ label: '$Q_0$', value: Q0, unit: 'б' }, { label: '$\\beta$', value: b, tol: 0.03 }],
      answer: `$Q_0 = \\langle Q\\rangle\\dfrac{(J + 1)(2J + 3)}{J(2J - 1)} = ${fmt(Q0)}$ б; $\\bar R = r_0A^{1/3} = ${fmt(radius(A))}$ фм; $\\beta = \\dfrac{5Q_0}{4Z\\bar R^2} = ${fmt(b)}$ — ядро ${Q > 0 ? 'вытянуто' : 'сплюснуто'} вдоль оси симметрии.`,
      hint: '1 б = 100 фм². Знак Q: плюс — вытянутое ядро (огурец), минус — сплюснутое (диск).',
      meta: { kind: 'quad', A, Z, J, Q },
    };
  },
  (rng) => {
    const r0 = sig(1.1 + 0.4 * rng(), 2);
    const f = fermiGas(r0);
    return {
      topic: '', q: `В модели ферми-газа ($N = Z = A/2$, $R = r_0A^{1/3}$, $r_0 = ${r0}$ фм) найти импульс Ферми $p_Fc$ и максимальную кинетическую энергию нуклона $T_F$.`,
      answers: [{ label: '$p_Fc$', value: f.pc, unit: 'МэВ' }, { label: '$T_F$', value: f.T, unit: 'МэВ' }],
      answer: `$p_F c = \\dfrac{\\hbar c}{r_0}\\left(\\dfrac{9\\pi}{8}\\right)^{1/3} = ${fmt(f.pc)}$ МэВ, $T_F = \\dfrac{(p_Fc)^2}{2m_Nc^2} = ${fmt(f.T)}$ МэВ.`,
      hint: 'Число состояний одного сорта нуклонов (с учётом двух проекций спина) до p_F равно A/2.',
      meta: { kind: 'fermi', r0 },
    };
  },
  (rng) => {
    const [A, Z] = pick(rng, TARGETS);
    const T = sig(4 + 6 * rng(), 2);
    const theta = pick(rng, [30, 60, 90, 120]);
    const r = rMinHeadOn(2, Z, T), b = (r / 2) / Math.tan((theta * Math.PI) / 360);
    return {
      topic: '', q: `α-частица с $T = ${T}$ МэВ рассеивается на ядре ${nucleus(A, Z)}. Найти минимальное расстояние сближения при лобовом ударе $r_{\\min}$ и прицельный параметр $b$, при котором она отклонится на $\\theta = ${theta}°$.`,
      answers: [{ label: '$r_{\\min}$', value: r, unit: 'фм' }, { label: '$b$', value: b, unit: 'фм' }],
      answer: `$r_{\\min} = \\dfrac{zZe^2}{4\\pi\\varepsilon_0T} = \\dfrac{2\\cdot${Z}\\cdot1.44}{${T}} = ${fmt(r)}$ фм; $b = \\dfrac{r_{\\min}}{2}\\operatorname{ctg}\\dfrac{\\theta}{2} = ${fmt(b)}$ фм.`,
      hint: 'e²/4πε₀ = 1.44 МэВ·фм. При лобовом ударе вся кинетическая энергия переходит в потенциальную.',
      meta: { kind: 'ruth', Z, T, theta },
    };
  },
  (rng) => {
    const [A, Z] = pick(rng, TARGETS);
    const proj = pick(rng, [{ z: 1, a: 1, name: 'протона', tex: 'p' }, { z: 2, a: 4, name: 'α-частицы', tex: '\\alpha' }]);
    const B = coulombBarrier(proj.z, proj.a, Z, A);
    return {
      topic: '', q: `Оценить высоту кулоновского барьера для ${proj.name} и ядра ${nucleus(A, Z)}. Расстояние касания $R = r_0(a^{1/3} + A^{1/3})$, $r_0 = 1.4$ фм.`,
      answers: [{ label: '$B$', value: B, unit: 'МэВ' }],
      answer: `$R = 1.4(${proj.a}^{1/3} + ${A}^{1/3}) = ${fmt(1.4 * (Math.cbrt(proj.a) + Math.cbrt(A)))}$ фм; $B = \\dfrac{zZe^2}{4\\pi\\varepsilon_0R} = \\dfrac{${proj.z}\\cdot${Z}\\cdot1.44}{${fmt(1.4 * (Math.cbrt(proj.a) + Math.cbrt(A)))}} = ${fmt(B)}$ МэВ.`,
      hint: 'Барьер — кулоновская энергия двух зарядов на расстоянии, где начинают действовать ядерные силы.',
      meta: { kind: 'barrier', A, Z, z: proj.z, a: proj.a },
    };
  },
  (rng) => {
    const key = pick(rng, ['p', 'alpha'] as const), P = PARTICLES[key];
    const mk = pick(rng, LOSS_MATERIALS), mat = MATERIALS[mk];
    const T = sig(P.m * (0.03 + 0.4 * rng()), 2);
    const v = bethe(T, P.m, P.z, mat.Z, mat.A, mat.I);
    return {
      topic: '', q: `Вычислить удельные ионизационные потери ${P.gen} с кинетической энергией $T = ${T}$ МэВ в ${mat.loc} ($Z = ${mat.Z}$, $A = ${mat.A}$, $I = ${mat.I}$ эВ, $\\rho = ${mat.rho}$ г/см³) — в МэВ/(г/см²) и в МэВ/см. $K/A = 0.307$ МэВ·см²/г при $A = 1$ г/моль.`,
      answers: [{ label: '$-dE/dx$', value: v, unit: 'МэВ/(г/см²)' }, { label: '$-dE/dx$', value: v * mat.rho, unit: 'МэВ/см' }],
      answer: `$\\beta^2 = 1 - 1/\\gamma^2 = ${fmt(kin(P.m, 'T', T).beta ** 2)}$; $-\\dfrac{dE}{dx} = \\dfrac{Kz^2Z}{A\\beta^2}\\ln\\dfrac{2m_ec^2\\beta^2}{I} = ${fmt(v)}$ МэВ/(г/см²) $= ${fmt(v * mat.rho)}$ МэВ/см.`,
      hint: 'β² из γ = 1 + T/mc²; m_ec² = 0.511 МэВ = 511 000 эВ — в логарифме те же единицы, что у I.',
      meta: { kind: 'bethe', m: P.m, z: P.z, T, mk },
    };
  },
  (rng) => {
    const mk = pick(rng, LOSS_MATERIALS), mat = MATERIALS[mk];
    const l = sig(1 / (((4 / 137.036) * (2.8179403227e-13) ** 2 * 6.022140857e23 / mat.A) * mat.Z * (mat.Z + 1) * Math.log(183 / Math.cbrt(mat.Z))), 3);
    const x = sig((0.2 + 1.5 * rng()) * (l / mat.rho), 2);
    const T0 = sig(200 + 1800 * rng(), 2);
    const T = T0 * Math.exp((-x * mat.rho) / l);
    return {
      topic: '', q: `Электроны с энергией $T_0 = ${T0}$ МэВ проходят пластину из ${mat.gen} толщиной $x = ${x}$ см ($\\rho = ${mat.rho}$ г/см³, радиационная длина $l_{\\text{рад}} = ${l}$ г/см²). Считая потери радиационными, найти энергию на выходе и критическую энергию ${mat.gen} ($Z = ${mat.Z}$).`,
      answers: [{ label: '$T$', value: T, unit: 'МэВ' }, { label: '$T_{\\text{крит}}$', value: 800 / mat.Z, unit: 'МэВ' }],
      answer: `$T = T_0e^{-\\rho x/l_{\\text{рад}}} = ${T0}\\,e^{-${fmt((x * mat.rho) / l)}} = ${fmt(T)}$ МэВ; $T_{\\text{крит}} \\approx 800/Z = ${fmt(800 / mat.Z)}$ МэВ.`,
      hint: 'Толщину переведите в г/см²: ρx. Критическая энергия — где радиационные потери равны ионизационным: TZ/800 = 1.',
      meta: { kind: 'rad', mk, l, x, T0 },
    };
  },
  (rng) => {
    const d = pick(rng, DECAYS);
    const r = twoBody(d.M, d.m1, d.m2);
    return {
      topic: '', q: `Найти кинетические энергии продуктов распада покоящейся частицы: ${d.title}.`,
      answers: [{ label: `$T_{${d.n1}}$`, value: r.T1, unit: 'МэВ' }, { label: `$T_{${d.n2}}$`, value: r.T2, unit: 'МэВ' }],
      answer: `Импульсы продуктов равны: $pc = ${fmt(r.pc)}$ МэВ. $E_1 = \\dfrac{M^2 + m_1^2 - m_2^2}{2M}c^2 = ${fmt(r.E1)}$ МэВ, $T_{${d.n1}} = ${fmt(r.T1)}$ МэВ; $T_{${d.n2}} = ${fmt(r.T2)}$ МэВ. Сумма — $(M - m_1 - m_2)c^2 = ${fmt(r.T1 + r.T2)}$ МэВ.`,
      hint: 'Закон сохранения импульса: p₁ = p₂; энергии: E₁ + E₂ = Mc². Массы — из таблицы частиц.',
      meta: { kind: 'decay', M: d.M, m1: d.m1, m2: d.m2 },
    };
  },
  (rng) => {
    const t = pick(rng, THRESHOLDS);
    const T = thresholdT(t.m1, t.m2, t.final);
    return {
      topic: '', q: `Найти порог реакции ${t.title} — кинетическую энергию налетающей частицы, вторая покоится.`,
      answers: [{ label: '$T_{\\text{пор}}$', value: T, unit: 'МэВ' }],
      answer: `Инвариант $(E_1 + m_2c^2)^2 - (p_1c)^2 = (\\textstyle\\sum m_f c^2)^2$ на пороге: $T_{\\text{пор}} = \\dfrac{(\\sum m_f)^2 - (m_1 + m_2)^2}{2m_2}c^2 = ${fmt(T)}$ МэВ.`,
      hint: 'На пороге продукты рождаются покоящимися в с.ц.м.: инвариантная масса системы равна сумме масс продуктов.',
      meta: { kind: 'threshold', m1: t.m1, m2: t.m2, final: t.final },
    };
  },
];

/** Справочные данные, которые даны в условии: масса водорода и нейтрона — для теста и подписи. */
export const GIVEN = { M_H, M_N, M_HE4, AMU, E2, R0, ME };

export const WORKS: Works = {
  1: [
    { topic: 'Кинематика: λ, T, E, pc, γ', gens: kinGens },
    { topic: 'Свойства ядер', gens: propGens },
    { topic: 'Капельная модель', gens: dropGens },
    { topic: 'Спин, чётность, магнитный момент', gens: shellGens },
    { topic: 'Задача 1–7 недель', gens: anyGens },
  ] satisfies Slot[],
};
