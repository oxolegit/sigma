/**
 * Ядерная физика курса: чистые функции, общие для лабораторий, разборов, вариантов К/Р и тестов.
 * Константы и параметры — из сборника задач (МИФИ, 2019), чтобы ответы совпадали с ответами сборника.
 * Энергии — в МэВ, длины — в фм, если не сказано иначе.
 */
import { NUCLIDES, type Nuclide } from './nuclides';

/* ===================== Константы (табл. П.1.1) ===================== */

export const C_LIGHT = 299_792_458;
/** ħc точно и «экзаменационное» значение: на К/Р его помнят как 200 МэВ·фм. */
export const HBARC = 197.3269788;
export const HBARC_ROUND = 200;
export const ME = 0.5109989461;
export const MP = 938.2720813;
export const MN = 939.565379;
/** Атомная единица массы, МэВ. */
export const AMU = 931.4940954;
export const E_CHARGE = 1.6021766208e-19;
/** e²/4πε₀ = αħc, МэВ·фм. */
export const E2 = HBARC / 137.035999139;
export const ALPHA = 1 / 137.035999139;
/** Классический радиус электрона, см. */
export const RE_CM = 2.8179403227e-13;
export const NA = 6.022140857e23;
/** K = 4πN_A r_e² m_e c², МэВ·см²/моль. */
export const K_BETHE = 4 * Math.PI * NA * RE_CM ** 2 * ME;
export const R0 = 1.4;

/** Массы атомов водорода, нейтрона и гелия-4 в а.е.м. — из таблицы. */
export const M_H = 1.007825;
export const M_N = 1.008665;
export const M_HE4 = 4.002603;

/** Частицы табл. П.1.5 и лёгкие ядра: энергия покоя в МэВ, заряд в e; gen — родительный падеж для условий. */
export const PARTICLES = {
  e: { name: 'электрон', gen: 'электрона', tex: 'e', m: ME, z: 1 },
  mu: { name: 'мюон', gen: 'мюона', tex: '\\mu', m: 105.658, z: 1 },
  pi: { name: 'π±-мезон', gen: 'π±-мезона', tex: '\\pi^{\\pm}', m: 139.57, z: 1 },
  pi0: { name: 'π⁰-мезон', gen: 'π⁰-мезона', tex: '\\pi^0', m: 134.98, z: 0 },
  K: { name: 'K±-мезон', gen: 'K±-мезона', tex: 'K^{\\pm}', m: 493.677, z: 1 },
  p: { name: 'протон', gen: 'протона', tex: 'p', m: MP, z: 1 },
  n: { name: 'нейтрон', gen: 'нейтрона', tex: 'n', m: MN, z: 0 },
  d: { name: 'дейтрон', gen: 'дейтрона', tex: 'd', m: 2.014102 * AMU - ME, z: 1 },
  alpha: { name: 'α-частица', gen: 'α-частицы', tex: '\\alpha', m: M_HE4 * AMU - 2 * ME, z: 2 },
} as const;
export type ParticleKey = keyof typeof PARTICLES;

/* ===================== Кинематика ===================== */

export interface Kin { m: number; T: number; E: number; pc: number; beta: number; gamma: number; betaGamma: number; /** ƛ = ħc/pc, фм */ lambdaBar: number; /** λ = 2πħc/pc, фм */ lambda: number }
export type KinKey = 'T' | 'E' | 'pc' | 'beta' | 'gamma' | 'lambdaBar' | 'lambda';

/** Все величины частицы массы m по одной известной. ħc — 197.33 или «экзаменационные» 200. */
export function kin(m: number, key: KinKey, value: number, hbarc = HBARC): Kin {
  let pc: number;
  switch (key) {
    case 'T': pc = Math.sqrt(value * (value + 2 * m)); break;
    case 'E': pc = Math.sqrt(Math.max(0, value * value - m * m)); break;
    case 'pc': pc = value; break;
    case 'gamma': pc = m * Math.sqrt(Math.max(0, value * value - 1)); break;
    case 'beta': pc = (m * value) / Math.sqrt(1 - value * value); break;
    case 'lambdaBar': pc = hbarc / value; break;
    case 'lambda': pc = (2 * Math.PI * hbarc) / value; break;
  }
  const E = Math.hypot(pc, m);
  // T через pc²/(E + m): без потери точности при T ≪ m.
  const T = (pc * pc) / (E + m);
  return { m, T, E, pc, beta: pc / E, gamma: m > 0 ? E / m : Infinity, betaGamma: m > 0 ? pc / m : Infinity, lambdaBar: hbarc / pc, lambda: (2 * Math.PI * hbarc) / pc };
}

/** Скорость по нерелятивистской формуле T = mv²/2, в долях c. */
export const betaClassic = (m: number, T: number) => Math.sqrt((2 * T) / m);

/** Распад покоящейся частицы M → 1 + 2: импульс и энергии продуктов. */
export function twoBody(M: number, m1: number, m2: number) {
  const E1 = (M * M + m1 * m1 - m2 * m2) / (2 * M);
  const E2 = (M * M + m2 * m2 - m1 * m1) / (2 * M);
  const pc = Math.sqrt(Math.max(0, E1 * E1 - m1 * m1));
  return { pc, E1, E2, T1: E1 - m1, T2: E2 - m2 };
}

/** Угол разлёта двух γ-квантов равной энергии при распаде π⁰ с кинетической энергией T, градусы. */
export function symmetricGammaAngle(m: number, T: number): number {
  const k = kin(m, 'T', T);
  // Каждый фотон уносит E/2, проекции импульсов на ось складываются в pc.
  return (2 * Math.acos(k.pc / k.E) * 180) / Math.PI;
}

/** Порог реакции 1 + 2 → Σ (2 покоится): кинетическая энергия налетающей частицы. */
export function thresholdT(m1: number, m2: number, finalMass: number): number {
  return (finalMass ** 2 - (m1 + m2) ** 2) / (2 * m2);
}

/** Полная энергия в с.ц.м. для частицы с полной энергией E1 на покоящейся мишени m2. */
export function cmEnergy(E1: number, m1: number, m2: number): number {
  return Math.sqrt(m1 * m1 + m2 * m2 + 2 * E1 * m2);
}

/** Релятивистское вычитание скоростей (в долях c или в м/с вместе с c). */
export const relativeVelocity = (v1: number, v2: number, c = 1) => (v1 - v2) / (1 - (v1 * v2) / (c * c));

/** Импульс частицы с зарядом z (в e), описывающей окружность радиуса R (м) в поле B (Тл): pc в МэВ. */
export const pcFromRigidity = (B: number, R: number, z = 1) => (z * C_LIGHT * B * R) / 1e6;

/* ===================== Массы и энергии связи ===================== */

export function nuclide(A: number, Z: number): Nuclide | undefined {
  return NUCLIDES.find((x) => x.A === A && x.Z === Z);
}
/** Масса атома в а.е.м. из таблицы; бросает, если нуклида нет. */
export function atomMass(A: number, Z: number): number {
  if (A === 1 && Z === 0) return M_N;
  const x = nuclide(A, Z);
  if (!x) throw new Error(`Нет нуклида A=${A}, Z=${Z} в таблице`);
  return x.M;
}
export const hasNuclide = (A: number, Z: number) => (A === 1 && Z === 0) || !!nuclide(A, Z);

/** Энергия связи W = [Z·M(¹H) + N·mₙ − M(A, Z)]c², МэВ. */
export const binding = (A: number, Z: number) => (Z * M_H + (A - Z) * M_N - atomMass(A, Z)) * AMU;
/** Энергия отделения нейтрона, протона, α-частицы. */
export const sepN = (A: number, Z: number) => (M_N + atomMass(A - 1, Z) - atomMass(A, Z)) * AMU;
export const sepP = (A: number, Z: number) => (M_H + atomMass(A - 1, Z - 1) - atomMass(A, Z)) * AMU;
export const sepAlpha = (A: number, Z: number) => (M_HE4 + atomMass(A - 4, Z - 2) - atomMass(A, Z)) * AMU;
/** Дефект масс Δ = [M(A, Z) − A·u]c², МэВ. */
export const massExcess = (A: number, Z: number) => (atomMass(A, Z) - A) * AMU;

/** Энергия реакции Q = [Σ M до − Σ M после]c² по атомным массам; частицы — [A, Z]. */
export function reactionQ(before: [number, number][], after: [number, number][]): number {
  const sum = (xs: [number, number][]) => xs.reduce((s, [A, Z]) => s + atomMass(A, Z), 0);
  return (sum(before) - sum(after)) * AMU;
}

/** Радиус ядра R = r₀A^{1/3}, фм. */
export const radius = (A: number, r0 = R0) => r0 * Math.cbrt(A);

/* ===================== Капельная модель ===================== */

export const WEIZ = { a: 15.6, b: 17.2, g: 0.72, d: 23.6, z: 34 } as const;

/** Слагаемые формулы Вайцзеккера (3.1), МэВ; pairing со знаком. */
export function weizTerms(A: number, Z: number) {
  const N = A - Z;
  const pair = Z % 2 === 0 && N % 2 === 0 ? 1 : Z % 2 === 1 && N % 2 === 1 ? -1 : 0;
  return {
    volume: WEIZ.a * A,
    surface: -WEIZ.b * A ** (2 / 3),
    coulomb: (-WEIZ.g * Z * (Z - 1)) / Math.cbrt(A),
    asymmetry: (-WEIZ.d * (A - 2 * Z) ** 2) / A,
    pairing: pair * WEIZ.z * A ** (-3 / 4),
  };
}
export function weizsacker(A: number, Z: number): number {
  const t = weizTerms(A, Z);
  return t.volume + t.surface + t.coulomb + t.asymmetry + t.pairing;
}
/** Масса ядра по капельной модели, МэВ: Z·m_p + N·m_n − W. */
export const weizMass = (A: number, Z: number) => Z * MP + (A - Z) * MN - weizsacker(A, Z);

/** Z, при котором масса изобары минимальна (задача 3.1): Z = A / (0.015A^{2/3} + 1.973). */
export function zOpt(A: number): number {
  const k = 4 * WEIZ.d + (MN - MP);
  return A / ((2 * WEIZ.g * A ** (2 / 3)) / k + (8 * WEIZ.d) / k);
}

/** Энергия симметричного деления по формуле Вайцзеккера: Q = 2W(A/2, Z/2) − W(A, Z). */
export const fissionQ = (A: number, Z: number) => 2 * weizsacker(A / 2, Z / 2) - weizsacker(A, Z);
/** Порог деления по Z²/A (задача 3.6): энергетически выгодно, когда Z²/A больше. */
export const fissionZ2A = () => (WEIZ.b * (2 ** (1 / 3) - 1)) / (WEIZ.g * (1 - 2 ** (-2 / 3)));
/** Неустойчивость к малой деформации (задача 3.7): Z²/A > 2β/γ. */
export const instabilityZ2A = () => (2 * WEIZ.b) / WEIZ.g;

/** Кулоновская энергия однородно заряженного шара (задача 3.9), МэВ. */
export const coulombEnergy = (Z: number, R: number) => (0.6 * Z * Z * E2) / R;
/** Радиус зеркальных ядер (A, Z) и (A, Z+1) по разности энергий связи (задача 3.10), фм. */
export function mirrorRadius(A: number, Z: number): number {
  const dW = binding(A, Z) - binding(A, Z + 1);
  return (0.6 * E2 * ((Z + 1) ** 2 - Z * Z)) / dW;
}

/* ===================== Оболочечная модель ===================== */

export interface Level { n: number; l: number; j: number }
/** Одночастичные уровни снизу вверх — как на рис. 3.1 сборника. */
export const SHELL_LEVELS: Level[] = [
  [1, 0, 1], [1, 1, 3], [1, 1, 1], [1, 2, 5], [2, 0, 1], [1, 2, 3], [1, 3, 7], [2, 1, 3], [1, 3, 5], [2, 1, 1], [1, 4, 9],
  [1, 4, 7], [2, 2, 5], [2, 2, 3], [3, 0, 1], [1, 5, 11], [1, 5, 9], [2, 3, 7], [2, 3, 5], [3, 1, 3], [3, 1, 1], [1, 6, 13],
  [2, 4, 9], [3, 2, 5], [1, 6, 11], [2, 4, 7], [4, 0, 1], [3, 2, 3],
].map(([n, l, j2]) => ({ n: n!, l: l!, j: j2! / 2 }));
export const MAGIC = [2, 8, 20, 28, 50, 82, 126];
const L_LETTERS = 'spdfghi';
export const levelLabel = (v: Level) => `${v.n}${L_LETTERS[v.l]}${Math.round(2 * v.j)}/2`;
export const levelTex = (v: Level) => `${v.n}${L_LETTERS[v.l]}_{${Math.round(2 * v.j)}/2}`;

/** Уровень, на котором сидит k-й нуклон одного сорта (k ≥ 1), и сколько нуклонов на нём. */
export function levelOf(k: number): { level: Level; index: number; occupancy: number } {
  let filled = 0;
  for (const [index, level] of SHELL_LEVELS.entries()) {
    const cap = 2 * level.j + 1;
    if (k <= filled + cap) return { level, index, occupancy: k - filled };
    filled += cap;
  }
  throw new Error(`Слишком много нуклонов: ${k}`);
}

export const G = { p: { s: 2 * 2.793, l: 1 }, n: { s: 2 * -1.913, l: 0 } } as const;
/** Гиромагнитный множитель нуклона в состоянии (l, j), формула (3.7). */
export function gFactor(kind: 'p' | 'n', l: number, j: number): number {
  const { s, l: gl } = G[kind];
  return j === l + 0.5 ? gl + (s - gl) / (2 * l + 1) : gl - (s - gl) / (2 * l + 1);
}
/** Магнитный момент одночастичного состояния μ = g·j (в μ_N) — значение Шмидта. */
export const schmidt = (kind: 'p' | 'n', l: number, j: number) => gFactor(kind, l, j) * j;

export type ShellResult =
  | { kind: 'even'; J: 0; P: 1 }
  | { kind: 'odd'; nucleon: 'p' | 'n'; level: Level; J: number; P: 1 | -1; mu: number }
  | { kind: 'oddodd'; p: Level; n: Level; Jmin: number; Jmax: number; P: 1 | -1 };

/** Спин, чётность и магнитный момент основного состояния по правилам (3.5)–(3.7). */
export function shellModel(A: number, Z: number): ShellResult {
  const N = A - Z;
  const par = (l: number) => (l % 2 === 0 ? 1 : -1) as 1 | -1;
  if (Z % 2 === 0 && N % 2 === 0) return { kind: 'even', J: 0, P: 1 };
  if (Z % 2 === 1 && N % 2 === 1) {
    const p = levelOf(Z).level, n = levelOf(N).level;
    return { kind: 'oddodd', p, n, Jmin: Math.abs(p.j - n.j), Jmax: p.j + n.j, P: par(p.l + n.l) };
  }
  const nucleon = Z % 2 === 1 ? 'p' : 'n';
  const level = levelOf(nucleon === 'p' ? Z : N).level;
  return { kind: 'odd', nucleon, level, J: level.j, P: par(level.l), mu: schmidt(nucleon, level.l, level.j) };
}

/* ===================== Квадрупольный момент и ферми-газ ===================== */

/** Отношение наблюдаемого ⟨Q⟩ к собственному Q (3.4). */
export const qProjection = (J: number) => (J * (2 * J - 1)) / ((J + 1) * (2 * J + 3));
/** Собственный квадрупольный момент по наблюдаемому. */
export const intrinsicQ = (Qobs: number, J: number) => Qobs / qProjection(J);
/** Параметр деформации β = 5Q/(4ZR̄²); Q в барнах, R̄ = r₀A^{1/3}. */
export const deformation = (Q0: number, Z: number, A: number, r0 = R0) => (5 * Q0 * 100) / (4 * Z * radius(A, r0) ** 2);
/** Собственный Q эллипсоида с полуосями b (вдоль оси симметрии) и a, в единицах длины²: (3.2). */
export const ellipsoidQ = (Z: number, b: number, a: number) => 0.4 * Z * (b * b - a * a);

/** Ферми-газ: импульс Ферми pc (МэВ), кинетическая энергия, глубина ямы и средняя энергия. */
export function fermiGas(r0 = R0, eps = 8) {
  const pc = (HBARC / r0) * Math.cbrt((9 * Math.PI) / 8);
  const mN = (MP + MN) / 2;
  const T = (pc * pc) / (2 * mN);
  return { pc, T, U: T + eps, mean: 0.6 * T };
}

/* ===================== Резерфорд ===================== */

/** zZe²/4πε₀, МэВ·фм. */
export const coulombK = (z: number, Z: number) => z * Z * E2;
/** Минимальное сближение при лобовом ударе, фм: T = zZe²/r. */
export const rMinHeadOn = (z: number, Z: number, T: number) => coulombK(z, Z) / T;
/** Прицельный параметр для угла рассеяния θ (рад), фм. */
export const impactParameter = (z: number, Z: number, T: number, theta: number) => (coulombK(z, Z) / (2 * T)) / Math.tan(theta / 2);
/** Дифференциальное сечение dσ/dΩ, фм²/ср. */
export const rutherfordDSigma = (z: number, Z: number, T: number, theta: number) => (coulombK(z, Z) / (4 * T)) ** 2 / Math.sin(theta / 2) ** 4;
/**
 * Доля частиц, рассеянных фольгой (n — ядер/см³, a — толщина, см) в интервал углов [θ₁, θ₂]:
 * ∫dΩ/sin⁴(θ/2) = 4π[1/sin²(θ₁/2) − 1/sin²(θ₂/2)].
 */
export function rutherfordFraction(z: number, Z: number, T: number, nA: number, th1: number, th2: number): number {
  const k = (coulombK(z, Z) / (4 * T)) * 1e-13; // см
  const inv = (t: number) => (t >= Math.PI ? 1 : 1 / Math.sin(t / 2) ** 2);
  return nA * k * k * 4 * Math.PI * (inv(th1) - inv(th2));
}
/** Кулоновский барьер для частиц (z, a) и ядра (Z, A) при касании: R = r₀(a^{1/3} + A^{1/3}), МэВ. */
export const coulombBarrier = (z: number, a: number, Z: number, A: number, r0 = R0) => coulombK(z, Z) / (r0 * (Math.cbrt(a) + Math.cbrt(A)));
/** Энергия электрона отдачи при пролёте тяжёлой частицы (z, масса M, T) с прицельным параметром b (фм). */
export const recoilElectron = (z: number, M: number, T: number, b: number) => ((z * E2) ** 2 * M) / (ME * b * b * T);

/* ===================== Потери энергии ===================== */

/** Вещества: Z, A, плотность (г/см³, табл. П.1.2), средний потенциал ионизации I (эВ, табл. П.1.8; для углерода и воздуха — по PDG); loc и gen — падежи для условий. */
export const MATERIALS = {
  air: { name: 'воздух', loc: 'воздухе', gen: 'воздуха', Z: 7.3, A: 14.6, rho: 1.2928e-3, I: 85.7 },
  N: { name: 'азот', loc: 'азоте', gen: 'азота', Z: 7, A: 14, rho: 1.2505e-3, I: 82 },
  C: { name: 'углерод', loc: 'углероде', gen: 'углерода', Z: 6, A: 12, rho: 2.3, I: 78 },
  Al: { name: 'алюминий', loc: 'алюминии', gen: 'алюминия', Z: 13, A: 27, rho: 2.7, I: 166 },
  Fe: { name: 'железо', loc: 'железе', gen: 'железа', Z: 26, A: 56, rho: 7.8, I: 286 },
  Cu: { name: 'медь', loc: 'меди', gen: 'меди', Z: 29, A: 65, rho: 8.9, I: 322 },
  Au: { name: 'золото', loc: 'золоте', gen: 'золота', Z: 79, A: 197, rho: 19.3, I: 790 },
  Pb: { name: 'свинец', loc: 'свинце', gen: 'свинца', Z: 82, A: 207, rho: 11.3, I: 823 },
} as const;
export type MaterialKey = keyof typeof MATERIALS;

/**
 * Удельные ионизационные потери, МэВ/(г/см²).
 * simple — формула (4.4) для 2γm_e/M ≪ 1; иначе (4.2) без поправки на плотность.
 */
export function bethe(T: number, M: number, z: number, Z: number, A: number, I_eV: number, simple = true): number {
  const k = kin(M, 'T', T);
  const b2 = k.beta ** 2, g2 = k.gamma ** 2;
  const I = I_eV * 1e-6;
  const pre = (K_BETHE * z * z * Z) / (A * b2);
  if (simple) return pre * Math.log((2 * ME * b2) / I);
  const r = ME / M;
  const Tmax = (2 * ME * b2 * g2) / (1 + 2 * k.gamma * r + r * r);
  return pre * (0.5 * Math.log((2 * ME * b2 * g2 * Tmax) / (I * I)) - b2);
}

/** Пробег тяжёлой частицы интегрированием (4.2): ∫dT / (dE/dx), г/см². От T_low — где формула ещё имеет смысл. */
export function betheRange(T: number, M: number, z: number, Z: number, A: number, I_eV: number, T_low = 0.5 * (M / MP)): number {
  if (T <= T_low) return 0;
  const steps = 2000;
  let s = 0;
  const lo = Math.log(T_low), hi = Math.log(T);
  for (let i = 0; i < steps; i++) {
    const t = Math.exp(lo + ((i + 0.5) * (hi - lo)) / steps);
    s += (t * (hi - lo)) / steps / bethe(t, M, z, Z, A, I_eV, false);
  }
  return s;
}

/** Пробег α-частицы в воздухе, см (4.5): 0.318·T^{3/2}, 4 < T < 8 МэВ. */
export const alphaRangeAir = (T: number) => 0.318 * T ** 1.5;
/** Энергия α-частицы по пробегу в воздухе (обращение 4.5). */
export const alphaEnergyFromAir = (R: number) => (R / 0.318) ** (2 / 3);
/** Пробег протона в воздухе, см: R′_p(T) = R′_α(4T) − 0.2. */
export const protonRangeAir = (T: number) => alphaRangeAir(4 * T) - 0.2;
/** Пробег α-частицы в веществе с массовым числом A, мг/см² (4.6). */
export const alphaRange = (T: number, A: number) => 0.56 * Math.cbrt(A) * alphaRangeAir(T);

/** Пробег электронов в алюминии, г/см² (4.7). */
export const electronRangeAl = (T: number) => (T < 0.8 ? 0.407 * T ** 1.38 : 0.542 * T - 0.133);
/** Энергия электронов по пробегу в алюминии (обращение 4.7). */
export const electronEnergyFromAl = (R: number) => (R < 0.407 * 0.8 ** 1.38 ? (R / 0.407) ** (1 / 1.38) : (R + 0.133) / 0.542);
/** Пробег в веществе (Z, A) через пробег в алюминии (4.8). */
export const electronRange = (T: number, Z: number, A: number) => (electronRangeAl(T) * (13 / 27)) / (Z / A);

/** Радиационная длина (4.11), г/см². */
export function radLength(Z: number, A: number): number {
  return 1 / (((4 * ALPHA * RE_CM ** 2 * NA) / A) * Z * (Z + 1) * Math.log(183 / Math.cbrt(Z)));
}
/** Отношение радиационных потерь к ионизационным (4.12). */
export const radToIon = (T: number, Z: number) => (T * Z) / 800;
/** Критическая энергия: потери равны, T = 800/Z МэВ. */
export const criticalEnergy = (Z: number) => 800 / Z;
/** Коэффициент поглощения β-частиц (4.15), см⁻¹. */
export const betaAbsorption = (Tmax: number, rho: number) => rho * 22 * Tmax ** (-4 / 3);
