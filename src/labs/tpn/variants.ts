/**
 * Вариант самостоятельной по ТПН — по задачам семинара: размер ядра и сечение, макросечение смеси,
 * ослабление пучка в защите, распределение Максвелла и нейтронный газ (n, kT, p = nkT).
 * В meta — исходные данные: tests/tpn-sr.test.ts пересчитывает по ним каждый ответ.
 */
import { fmt, pick, ri, type Gen, type Slot, type Works } from '../../lib/variants';
import { T0, kT, thermalLength, vT } from './ensemble';

/** ħc, МэВ·фм; mₙc², МэВ; число Авогадро; k, Дж/К; эВ, Дж. */
export const HBARC = 197.327;
export const MNC2 = 939.565;
export const NA = 6.02214e23;
const K_B = 1.380649e-23;
const EV = 1.602176634e-19;

const sig = (v: number, d = 2) => Number(v.toPrecision(d));

/* ===================== 1. Размер ядра и сечение ===================== */

const NUCLEI = [
  { tex: '^{12}\\text{C}', A: 12 }, { tex: '^{16}\\text{O}', A: 16 }, { tex: '^{27}\\text{Al}', A: 27 },
  { tex: '^{56}\\text{Fe}', A: 56 }, { tex: '^{63}\\text{Cu}', A: 63 }, { tex: '^{91}\\text{Zr}', A: 91 },
  { tex: '^{208}\\text{Pb}', A: 208 }, { tex: '^{238}\\text{U}', A: 238 },
] as const;

export const nucRadius = (r0: number, A: number) => r0 * Math.cbrt(A);
/** Приведённая длина волны нейтрона, фм; E в МэВ. */
export const lambdaBar = (E: number) => HBARC / Math.sqrt(2 * MNC2 * E);
/** Энергия, при которой ƛ = R, МэВ. */
export const energyAtLambda = (R: number) => (HBARC / R) ** 2 / (2 * MNC2);

const sizeGens: Gen[] = [
  (rng) => {
    const n = pick(rng, NUCLEI), r0 = pick(rng, [1.2, 1.3, 1.4]);
    const R = nucRadius(r0, n.A), s = (Math.PI * R * R) / 100;
    return {
      topic: '', q: `Оцените радиус ядра $${n.tex}$ по формуле $R = r_0A^{1/3}$, $r_0 = ${r0}$ фм, и его геометрическое сечение $\\pi R^2$ в барнах.`,
      answers: [{ label: '$R$', value: R, unit: 'фм' }, { label: '$\\pi R^2$', value: s, unit: 'б' }],
      answer: `$R = ${r0}\\cdot${n.A}^{1/3} = ${fmt(R, 3)}$ фм, $\\pi R^2 = ${fmt(Math.PI * R * R, 3)}$ фм² $= ${fmt(s, 3)}$ б (1 б = 100 фм²).`,
      hint: '1 барн = 10⁻²⁴ см² = 100 фм².',
      meta: { kind: 'Rσ', r0, A: n.A },
    };
  },
  (rng) => {
    const n = pick(rng, NUCLEI), r0 = pick(rng, [1.2, 1.4]);
    const R = nucRadius(r0, n.A), E = energyAtLambda(R);
    return {
      topic: '', q: `Ядро $${n.tex}$, $R = r_0A^{1/3}$, $r_0 = ${r0}$ фм. При какой энергии нейтрона его приведённая длина волны $\\bar\\lambda$ равна радиусу ядра? Выше этой энергии полное сечение близко к геометрическому масштабу ($\\sim 2\\pi R^2$).`,
      answers: [{ label: '$R$', value: R, unit: 'фм' }, { label: '$E$', value: E, unit: 'МэВ', tol: 0.03 }],
      answer: `$R = ${fmt(R, 3)}$ фм. $\\bar\\lambda = \\hbar c/\\sqrt{2m_nc^2E} = R$ $\\Rightarrow$ $E = (\\hbar c/R)^2/2m_nc^2 = (197.3/${fmt(R, 3)})^2/1879 = ${fmt(E, 3)}$ МэВ.`,
      hint: 'Нейтрон нерелятивистский: pc = √(2mc²E), ƛ = ħc/pc; ħc ≈ 197 МэВ·фм, mₙc² ≈ 940 МэВ.',
      meta: { kind: 'E(ƛ=R)', r0, A: n.A },
    };
  },
  (rng) => {
    const n = pick(rng, NUCLEI);
    const E = pick(rng, [0.0253e-6, 1e-6, 1e-3, 0.1, 1, 2, 14, 50]);
    const R = nucRadius(1.2, n.A), lb = lambdaBar(E);
    const Etex = E < 1e-3 ? `${fmt(E * 1e6)}$ эВ` : E < 1 ? `${fmt(E * 1e3)}$ кэВ` : `${fmt(E)}$ МэВ`;
    return {
      topic: '', q: `Нейтрон с энергией $E = ${Etex} налетает на ядро $${n.tex}$ ($r_0 = 1.2$ фм). Найдите $\\bar\\lambda$ и отношение $R/\\bar\\lambda = kR$. Волна или частица?`,
      answers: [{ label: '$\\bar\\lambda$', value: lb, unit: 'фм' }, { label: '$kR$', value: R / lb }],
      answer: `$\\bar\\lambda = 4.55/\\sqrt{E[\\text{МэВ}]}$ фм $= ${fmt(lb, 3)}$ фм, $R = ${fmt(R, 3)}$ фм, $kR = ${fmt(R / lb, 3)}$. ${R / lb > 3 ? 'kR ≫ 1 — геометрическая картина, σ → 2πR².' : R / lb < 0.3 ? 'kR ≪ 1 — волна, ядро «точечное»: сечение определяется резонансами, а не размером.' : 'kR ∼ 1 — промежуточная область.'}`,
      hint: 'ƛ[фм] = 4.55/√E[МэВ]. Тепловые 0.0253 эВ = 2.53·10⁻⁸ МэВ.',
      meta: { kind: 'ƛ,kR', A: n.A, E },
    };
  },
];

/* ===================== 2. Макроскопическое сечение ===================== */

/** Ядерная плотность N = ρN_A/M, см⁻³. */
export const numberDensity = (rho: number, M: number) => (rho * NA) / M;

const MATERIALS = [
  { name: 'графит', rho: 1.6, M: 12, s: 4.8 },
  { name: 'алюминий', rho: 2.7, M: 27, s: 1.7 },
  { name: 'железо', rho: 7.87, M: 55.85, s: 14 },
  { name: 'свинец', rho: 11.35, M: 207.2, s: 11.4 },
  { name: 'бериллий', rho: 1.85, M: 9.01, s: 6.2 },
] as const;

const sigmaGens: Gen[] = [
  (rng) => {
    const c = pick(rng, [0.0072, 0.02, 0.03, 0.044, 0.05, 0.2]), rho = pick(rng, [19, 18.9, 19.05]);
    const s5 = pick(rng, [600, 680, 694]), s8 = 2.7;
    const N = numberDensity(rho, 238), s = c * s5 + (1 - c) * s8, S = N * s * 1e-24;
    return {
      topic: '', q: `Найдите макроскопическое сечение поглощения урана с обогащением $${fmt(c * 100)}\\,\\%$ для тепловых нейтронов. $\\rho = ${rho}$ г/см³, $M = 238$ г/моль; $\\sigma_a(^{235}\\text{U}) = ${s5}$ б, $\\sigma_a(^{238}\\text{U}) = ${s8}$ б.`,
      answers: [{ label: '$\\bar\\sigma_a$', value: s, unit: 'б' }, { label: '$\\Sigma_a$', value: S, unit: 'см⁻¹' }],
      answer: `$N = \\rho N_A/M = ${fmt(N, 3)}$ см⁻³; $\\bar\\sigma_a = ${c}\\cdot${s5} + ${fmt(1 - c)}\\cdot${s8} = ${fmt(s, 3)}$ б; $\\Sigma_a = N\\bar\\sigma_a = ${fmt(S, 3)}$ см⁻¹.`,
      hint: 'Σ = Σᵢ Nᵢσᵢ = N·(c·σ₅ + (1 − c)·σ₈); 1 б = 10⁻²⁴ см².',
      meta: { kind: 'ΣU', c, rho, s5, s8 },
    };
  },
  (rng) => {
    const sH = 0.332, sO = 0.00019, rho = pick(rng, [1, 0.997, 0.75]);
    const N = numberDensity(rho, 18), S = N * (2 * sH + sO) * 1e-24;
    return {
      topic: '', q: `Найдите $\\Sigma_a$ воды для тепловых нейтронов и длину свободного пробега до поглощения $\\lambda_a$. $\\rho = ${rho}$ г/см³, $M(\\text{H}_2\\text{O}) = 18$ г/моль; $\\sigma_a(\\text{H}) = ${sH}$ б, $\\sigma_a(\\text{O}) = ${sO}$ б.`,
      answers: [{ label: '$\\Sigma_a$', value: S, unit: 'см⁻¹' }, { label: '$\\lambda_a$', value: 1 / S, unit: 'см' }],
      answer: `Молекул $N = ${fmt(N, 3)}$ см⁻³, на молекулу $2\\sigma_\\text{H} + \\sigma_\\text{O} = ${fmt(2 * sH + sO, 4)}$ б; $\\Sigma_a = ${fmt(S, 3)}$ см⁻¹, $\\lambda_a = 1/\\Sigma_a = ${fmt(1 / S, 3)}$ см.`,
      hint: 'Два атома водорода на молекулу: σ на молекулу = 2σ_H + σ_O.',
      meta: { kind: 'ΣH2O', rho, sH, sO },
    };
  },
  (rng) => {
    const m = pick(rng, MATERIALS);
    const N = numberDensity(m.rho, m.M), S = N * m.s * 1e-24;
    return {
      topic: '', q: `Полное микроскопическое сечение ядер (${m.name}) для тепловых нейтронов $\\sigma_t = ${m.s}$ б, $\\rho = ${m.rho}$ г/см³, $M = ${m.M}$ г/моль. Найдите ядерную плотность $N$, $\\Sigma_t$ и среднюю длину свободного пробега $\\lambda$.`,
      answers: [{ label: '$N$', value: N, unit: 'см⁻³' }, { label: '$\\Sigma_t$', value: S, unit: 'см⁻¹' }, { label: '$\\lambda$', value: 1 / S, unit: 'см' }],
      answer: `$N = ${m.rho}\\cdot6.02\\cdot10^{23}/${m.M} = ${fmt(N, 3)}$ см⁻³, $\\Sigma_t = N\\sigma_t = ${fmt(S, 3)}$ см⁻¹, $\\lambda = 1/\\Sigma_t = ${fmt(1 / S, 3)}$ см.`,
      hint: 'λ = 1/Σₜ — среднее расстояние до первого столкновения.',
      meta: { kind: 'Nλ', rho: m.rho, M: m.M, s: m.s },
    };
  },
];

/* ===================== 3. Ослабление пучка ===================== */

const SHIELD = [
  { name: 'свинец', rho: 11.35, M: 207.2, s: 5.5 },
  { name: 'железо', rho: 7.87, M: 55.85, s: 3.0 },
  { name: 'бетон (эффективно)', rho: 2.3, M: 20, s: 2.6 },
] as const;

const attGens: Gen[] = [
  (rng) => {
    const k = pick(rng, [2, 5, 10, 100, 1000]), S = sig(0.05 + 0.4 * rng(), 2);
    const x = Math.log(k) / S;
    return {
      topic: '', q: `Оцените толщину защиты, ослабляющей поток нерассеянных быстрых нейтронов в $${k}$ раз, если макроскопическое сечение $\\Sigma = ${S}$ см⁻¹. Почему реальная защита должна быть толще?`,
      answers: [{ label: '$x$', value: x, unit: 'см' }],
      answer: `$e^{-\\Sigma x} = 1/${k}$ $\\Rightarrow$ $x = \\ln ${k}/\\Sigma = ${fmt(Math.log(k), 3)}/${S} = ${fmt(x, 3)}$ см. Формула считает только нерассеянные нейтроны (узкий пучок): рассеянные тоже доходят — фактор накопления; тяжёлое ядро почти не замедляет нейтроны, а захват даёт вторичные γ.`,
      hint: 'Закон ослабления узкого пучка Φ(x) = Φ₀e^{−Σx}.',
      meta: { kind: 'x(k)', k, S },
    };
  },
  (rng) => {
    const S = sig(0.05 + 0.4 * rng(), 2), x = ri(rng, 2, 40);
    const f = Math.exp(-S * x);
    return {
      topic: '', q: `Пучок нейтронов падает на пластину толщиной $x = ${x}$ см, $\\Sigma_t = ${S}$ см⁻¹. Какая доля нейтронов пройдёт без столкновений? Сколько это длин свободного пробега?`,
      answers: [{ label: 'доля', value: f, tol: 0.03, abs: 1e-9 }, { label: '$x/\\lambda$', value: S * x }],
      answer: `$\\Phi/\\Phi_0 = e^{-\\Sigma_t x} = e^{-${fmt(S * x, 3)}} = ${fmt(f, 3)}$; $x/\\lambda = \\Sigma_t x = ${fmt(S * x, 3)}$.`,
      hint: 'x/λ = Σx — «оптическая толщина». Долю можно ввести и в процентах.',
      meta: { kind: 'e^-Σx', S, x },
    };
  },
  (rng) => {
    const m = pick(rng, SHIELD), k = pick(rng, [10, 100]);
    const S = numberDensity(m.rho, m.M) * m.s * 1e-24, x = Math.log(k) / S;
    return {
      topic: '', q: `Защита — ${m.name}: $\\rho = ${m.rho}$ г/см³, $M = ${m.M}$ г/моль, полное сечение для нейтронов 2 МэВ $\\sigma_t = ${m.s}$ б. Найдите $\\Sigma_t$ и толщину, ослабляющую поток нерассеянных нейтронов в $${k}$ раз.`,
      answers: [{ label: '$\\Sigma_t$', value: S, unit: 'см⁻¹' }, { label: '$x$', value: x, unit: 'см' }],
      answer: `$\\Sigma_t = \\rho N_A\\sigma_t/M = ${fmt(S, 3)}$ см⁻¹, $x = \\ln${k}/\\Sigma_t = ${fmt(x, 3)}$ см.`,
      hint: 'Сначала N = ρN_A/M, потом Σ = Nσ, потом x = ln k / Σ.',
      meta: { kind: 'Σ→x', rho: m.rho, M: m.M, s: m.s, k },
    };
  },
  (rng) => {
    const S = sig(0.03 + 0.5 * rng(), 2);
    return {
      topic: '', q: `Макроскопическое сечение среды $\\Sigma_t = ${S}$ см⁻¹. Найдите длину свободного пробега $\\lambda$ и слой половинного ослабления $x_{1/2}$ нерассеянного пучка.`,
      answers: [{ label: '$\\lambda$', value: 1 / S, unit: 'см' }, { label: '$x_{1/2}$', value: Math.LN2 / S, unit: 'см' }],
      answer: `$\\lambda = 1/\\Sigma_t = ${fmt(1 / S, 3)}$ см, $x_{1/2} = \\ln2/\\Sigma_t = 0.693\\lambda = ${fmt(Math.LN2 / S, 3)}$ см.`,
      hint: 'e^{−Σx} = 1/2.',
      meta: { kind: 'x½', S },
    };
  },
];

/* ===================== 4. Распределение Максвелла ===================== */

const temps = (rng: () => number) => pick(rng, [293.6, 300, 400, 500, 573, 600, 700, 800, 1000, 1200]);

const maxwellGens: Gen[] = [
  (rng) => {
    const T = temps(rng);
    return {
      topic: '', q: `Тепловые нейтроны в равновесии со средой при $T = ${T}$ К. Найдите $kT$ (эВ) и наиболее вероятную скорость $V_T$. Какая энергия наиболее вероятна в спектре потока?`,
      answers: [{ label: '$kT$', value: kT(T), unit: 'эВ' }, { label: '$V_T$', value: vT(T), unit: 'м/с' }],
      answer: `$kT = 8.617\\cdot10^{-5}\\cdot${T} = ${fmt(kT(T), 3)}$ эВ, $V_T = \\sqrt{2kT/m_n} = ${fmt(vT(T), 4)}$ м/с; максимум спектра потока $\\Phi(E) \\propto Ee^{-E/kT}$ — при $E = kT$.`,
      hint: 'При 293.6 К kT = 0.0253 эВ и V_T = 2200 м/с; дальше kT ∝ T, V_T ∝ √T.',
      meta: { kind: 'kT,VT', T },
    };
  },
  (rng) => {
    const T = temps(rng), t = kT(T);
    return {
      topic: '', q: `Нейтронный газ, $T = ${T}$ К. Найдите наиболее вероятную энергию $E_{\\text{вер}}$ и среднюю энергию $\\bar E$ в спектре **плотности** $n(E) \\propto \\sqrt E\\,e^{-E/kT}$ и среднюю энергию в спектре **потока**.`,
      answers: [{ label: '$E_{\\text{вер}}$ по плотности', value: t / 2, unit: 'эВ' }, { label: '$\\bar E$ по плотности', value: 1.5 * t, unit: 'эВ' }, { label: '$\\bar E$ по потоку', value: 2 * t, unit: 'эВ' }],
      answer: `$kT = ${fmt(t, 3)}$ эВ. По плотности: максимум $kT/2 = ${fmt(t / 2, 3)}$ эВ, среднее $\\tfrac32kT = ${fmt(1.5 * t, 3)}$ эВ. По потоку ($\\Phi = nV$, лишний множитель $\\sqrt E$): среднее $2kT = ${fmt(2 * t, 3)}$ эВ.`,
      hint: 'Максимум √E·e^{−E/kT}: производная = 0 при E = kT/2. Для E·e^{−E/kT} — при E = kT.',
      meta: { kind: 'means', T },
    };
  },
  (rng) => {
    const nuc = pick(rng, [{ tex: '^{10}\\text{B}', s0: 3840 }, { tex: '^{197}\\text{Au}', s0: 98.7 }, { tex: '^{1}\\text{H}', s0: 0.332 }, { tex: '^{6}\\text{Li}', s0: 940 }]);
    const T = temps(rng), s = (Math.sqrt(Math.PI) / 2) * nuc.s0 * Math.sqrt(T0 / T);
    return {
      topic: '', q: `Сечение поглощения $${nuc.tex}$ подчиняется закону $1/V$, при $V_0 = 2200$ м/с $\\sigma_0 = ${nuc.s0}$ б. Найдите среднее по максвелловскому потоку сечение при температуре нейтронного газа $T = ${T}$ К ($T_0 = 293.6$ К).`,
      answers: [{ label: '$\\bar\\sigma_a$', value: s, unit: 'б' }],
      answer: `$\\bar\\sigma = \\dfrac{\\sqrt\\pi}{2}\\,\\sigma_0\\sqrt{T_0/T} = 0.886\\cdot${nuc.s0}\\cdot\\sqrt{293.6/${T}} = ${fmt(s, 3)}$ б.`,
      hint: 'Множитель √π/2 ≈ 0.886 — от усреднения 1/V по потоку; √(T₀/T) — нагрев газа.',
      meta: { kind: '1/V', s0: nuc.s0, T },
    };
  },
  (rng) => {
    const v = pick(rng, [1000, 1500, 2200, 2700, 3000, 3500, 4000]);
    const E = (1.67492750e-27 * v * v) / 2 / EV, T = (1.67492750e-27 * v * v) / (2 * K_B);
    return {
      topic: '', q: `Нейтрон движется со скоростью $V = ${v}$ м/с. Найдите его энергию $E$ и температуру нейтронного газа, для которой эта скорость наиболее вероятна.`,
      answers: [{ label: '$E$', value: E, unit: 'эВ' }, { label: '$T$', value: T, unit: 'К' }],
      answer: `$E = m_nV^2/2 = ${fmt(E, 3)}$ эВ; $V_T = \\sqrt{2kT/m_n} = V$ $\\Rightarrow$ $T = m_nV^2/2k = E/k = ${fmt(T, 3)}$ К.`,
      hint: 'Быстрая проверка: E ∝ V², при 2200 м/с — 0.0253 эВ и 293.6 К.',
      meta: { kind: 'V→E,T', v },
    };
  },
];

/* ===================== 5. Нейтронный газ: n и kT ===================== */

const fluxes = [1e10, 3e11, 1e12, 5e12, 1e13, 1e14, 3e14] as const;

const gasGens: Gen[] = [
  (rng) => {
    const F = pick(rng, fluxes), T = temps(rng);
    const v = vT(T) * 100, n = F / v, p = n * 1e6 * K_B * T;
    return {
      topic: '', q: `В реакторе плотность потока тепловых нейтронов $\\Phi = ${fmt(F)}$ см⁻²с⁻¹, температура нейтронного газа $T = ${T}$ К. Скорость нейтронов считать равной $V_T$. Найдите плотность нейтронов $n$ и давление нейтронного газа $p = nkT$.`,
      answers: [{ label: '$n$', value: n, unit: 'см⁻³' }, { label: '$p$', value: p, unit: 'Па' }],
      answer: `$V_T = ${fmt(vT(T), 4)}$ м/с; $n = \\Phi/V = ${fmt(F)}/${fmt(v, 3)} = ${fmt(n, 3)}$ см⁻³ $= ${fmt(n * 1e6, 3)}$ м⁻³; $p = nkT = ${fmt(p, 3)}$ Па — ничтожно по сравнению с атмосферой ($10^5$ Па).`,
      hint: 'Φ = nV; n перевести в м⁻³ (×10⁶), k = 1.38·10⁻²³ Дж/К.',
      meta: { kind: 'n,p', F, T },
    };
  },
  (rng) => {
    const F = pick(rng, fluxes), T = temps(rng);
    const n = F / (vT(T) * 100), d = n * thermalLength(T) ** 3;
    return {
      topic: '', q: `$\\Phi = ${fmt(F)}$ см⁻²с⁻¹, $T = ${T}$ К, скорость — $V_T$. Найдите $n$ и параметр вырождения $n\\Lambda^3$, $\\Lambda = h/\\sqrt{2\\pi m_nkT}$. Можно ли считать нейтронный газ классическим?`,
      answers: [{ label: '$n$', value: n, unit: 'см⁻³' }, { label: '$n\\Lambda^3$', value: d, tol: 0.03 }],
      answer: `$n = ${fmt(n, 3)}$ см⁻³, $\\Lambda = ${fmt(thermalLength(T), 3)}$ см, $n\\Lambda^3 = ${fmt(d, 3)} \\ll 1$ — газ невырожден, статистика Максвелла — Больцмана.`,
      hint: 'Λ ≈ 1.8·10⁻⁸ см при комнатной температуре, Λ ∝ 1/√T.',
      meta: { kind: 'nΛ³', F, T },
    };
  },
  (rng) => {
    const n = pick(rng, [1e6, 1e7, 5e7, 1e8, 1e9]), T = temps(rng);
    const F = n * vT(T) * 100, w = 1.5 * n * 1e6 * K_B * T;
    return {
      topic: '', q: `Плотность тепловых нейтронов $n = ${fmt(n)}$ см⁻³, $T = ${T}$ К. Найдите плотность потока $\\Phi$ (скорость — $V_T$) и плотность кинетической энергии газа $w = \\tfrac32nkT$.`,
      answers: [{ label: '$\\Phi$', value: F, unit: 'см⁻²с⁻¹' }, { label: '$w$', value: w, unit: 'Дж/м³' }],
      answer: `$\\Phi = nV_T = ${fmt(n)}\\cdot${fmt(vT(T) * 100, 3)} = ${fmt(F, 3)}$ см⁻²с⁻¹; $w = \\tfrac32nkT = ${fmt(w, 3)}$ Дж/м³.`,
      hint: 'V_T в см/с: 2200 м/с = 2.2·10⁵ см/с.',
      meta: { kind: 'Φ,w', n, T },
    };
  },
];

export const WORKS: Works = {
  1: [
    { topic: 'Размер ядра и сечение', gens: sizeGens },
    { topic: 'Макроскопическое сечение', gens: sigmaGens },
    { topic: 'Ослабление пучка в защите', gens: attGens },
    { topic: 'Распределение Максвелла', gens: maxwellGens },
    { topic: 'Нейтронный газ: n и kT', gens: gasGens },
  ] satisfies Slot[],
};
