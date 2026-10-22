/**
 * Физика лабораторий курса «Неэнергетическое применение ядерных технологий» — чистые функции без отрисовки.
 * Урок 9: опыт Чедвика, гипотеза γ-квантов, упругое соударение. Урок 19: пуск CP-1, цепочка ²³⁹U → ²³⁹Pu, оценка k кладки.
 */

/** Атомная единица массы, МэВ. */
export const AMU_MEV = 931.494;
/** Энергия покоя протона, МэВ. */
export const MP_MEV = 938.272;
/** Энергия покоя ядра ¹⁴N, МэВ: масса атома 14.003074 а.е.м. без семи электронов. */
export const MN14_MEV = 14.003074 * AMU_MEV - 7 * 0.511;

// --- урок 9: опыт Чедвика ---

/** Максимальная скорость ядра массы M после лобового удара частицей массы m со скоростью v: u = 2mv/(m + M). */
export const recoilMax = (m: number, M: number, v: number) => (2 * m * v) / (m + M);

/** Отношение максимальных скоростей отдачи двух ядер: u₁/u₂ = (m + M₂)/(m + M₁). Для H и N — (m + 14)/(m + 1). */
export const recoilRatio = (m: number, M1 = 1, M2 = 14) => (m + M2) / (m + M1);

/** Масса налетающей частицы из измеренного отношения r = u₁/u₂: m = (M₂ − r·M₁)/(r − 1). */
export const massFromRatio = (r: number, M1 = 1, M2 = 14) => (M2 - r * M1) / (r - 1);

/** Скорость самой частицы по отдаче ядра M₁: v = u₁(m + M₁)/2m. */
export const speedFromRecoil = (u1: number, m: number, M1 = 1) => (u1 * (m + M1)) / (2 * m);

/** Доля энергии, переданная ядру M при лобовом ударе частицей m: 4mM/(m + M)². */
export const transferMax = (m: number, M: number) => (4 * m * M) / (m + M) ** 2;

/**
 * Энергия γ-кванта, нужная, чтобы комптоновским рассеянием передать ядру массы Mc² кинетическую энергию T (край спектра, рассеяние назад).
 * Из T = 2E²/(Mc² + 2E): E = (T + √(T² + 2T·Mc²))/2. Все энергии в МэВ.
 */
export const photonForRecoil = (T: number, Mc2: number) => (T + Math.sqrt(T * T + 2 * T * Mc2)) / 2;

/** Наибольшая энергия отдачи ядра Mc² от γ-кванта E (комптоновский край): T = 2E²/(Mc² + 2E). */
export const comptonEdge = (E: number, Mc2: number) => (2 * E * E) / (Mc2 + 2 * E);

/**
 * Нейтральная частица по двум измеренным энергиям отдачи (H и N, лобовые удары).
 * T_N/T_H = 14(m + 1)²/(m + 14)² → m; энергия частицы T = T_H(m + 1)²/4m.
 * Массы в а.е.м., энергии в МэВ.
 */
export function neutralFromRecoils(TH: number, TN: number, M1 = 1, M2 = 14) {
  // T₂/T₁ = M₂(m + M₁)²/(M₁(m + M₂)²) → (m + M₁)/(m + M₂) = q.
  const q = Math.sqrt((TN / TH) * (M1 / M2));
  const m = (q * M2 - M1) / (1 - q);
  return { m, T: (TH * (m + M1) ** 2) / (4 * m * M1) };
}

/** Кинетическая энергия ядра массы A (а.е.м.) со скоростью u (см/с), МэВ — нерелятивистски. */
export const energyFromSpeed = (A: number, u: number) => {
  const beta = u / 2.99792458e10;
  return 0.5 * A * AMU_MEV * beta * beta;
};

// --- урок 9: упругое соударение шаров ---

/** Ядра для бильярда: массовое число и подпись. */
export const TARGETS = {
  H: { A: 1, label: 'водород ¹H' },
  D: { A: 2, label: 'дейтерий ²H' },
  C: { A: 12, label: 'углерод ¹²C' },
  N: { A: 14, label: 'азот ¹⁴N' },
  Pb: { A: 208, label: 'свинец ²⁰⁸Pb' },
} as const;
export type TargetId = keyof typeof TARGETS;

/**
 * Упругий удар шара m (скорость 1 вдоль x) по покоящемуся шару M. Прицельный параметр — доля s = b/D суммы радиусов, 0 ≤ s < 1.
 * Ядро уходит вдоль линии центров под углом φ = arcsin s к оси, со скоростью 2m·cos φ/(m + M).
 * Возвращает скорости после удара, угол отдачи, угол рассеяния нейтрона и долю переданной энергии.
 */
export function collide(m: number, M: number, s: number) {
  const phi = Math.asin(Math.min(Math.max(s, 0), 1));
  const V = ((2 * m) / (m + M)) * Math.cos(phi);
  // Ядро толкают в сторону, противоположную смещению нейтрона.
  const nucleus: [number, number] = [V * Math.cos(phi), -V * Math.sin(phi)];
  const neutron: [number, number] = [1 - (M / m) * nucleus[0], -(M / m) * nucleus[1]];
  const fraction = (M * V * V) / m;
  const psi = Math.atan2(neutron[1], neutron[0]);
  return { phi, nucleus, neutron, fraction, psi };
}

/** Доля энергии, переданная при угле отдачи φ: 4mM/(m + M)²·cos²φ. */
export const transferAtAngle = (m: number, M: number, phi: number) => transferMax(m, M) * Math.cos(phi) ** 2;

/** Параметр α = ((A − 1)/(A + 1))²: после удара энергия нейтрона в [αE, E]. */
export const alphaA = (A: number) => ((A - 1) / (A + 1)) ** 2;

/** Средняя доля энергии, теряемая за удар при изотропном рассеянии в СЦМ: (1 − α)/2. */
export const meanLoss = (A: number) => (1 - alphaA(A)) / 2;

/** Средний логарифмический декремент ξ = 1 + α ln α/(1 − α); для водорода ξ = 1. */
export const xi = (A: number) => {
  if (A === 1) return 1;
  const a = alphaA(A);
  return 1 + (a * Math.log(a)) / (1 - a);
};

/** Число соударений, чтобы замедлиться от E0 до E1: ln(E0/E1)/ξ. */
export const collisionsToSlow = (A: number, E0 = 2e6, E1 = 0.025) => Math.log(E0 / E1) / xi(A);

// --- урок 19: пуск CP-1 ---

/** Коэффициент размножения CP-1 в лаборатории по выдвижению стержня p, %: 0.960 + 0.0406·(p/100)^1.6. */
export const kOfRod = (p: number) => 0.96 + 0.0406 * Math.max(0, Math.min(1, p / 100)) ** 1.6;

/** Положение стержня, при котором k = 1 (точно, по модели лаборатории), %. */
export const criticalRod = () => 100 * (0.04 / 0.0406) ** (1 / 1.6);

/** k после сброса аварийного стержня ZIP. */
export const K_SCRAM = 0.9;

/**
 * Точное решение dN/dt = (k − 1)/ℓ·N + S за шаг dt при постоянном k: устойчиво при любом шаге.
 * N — скорость счёта (условные единицы), ℓ — время жизни поколения, с.
 */
export function stepCount(N: number, k: number, dt: number, l = 0.1, S = 2): number {
  const a = (k - 1) / l;
  if (Math.abs(a * dt) < 1e-9) return N + S * dt;
  const eq = -S / a;
  return eq + (N - eq) * Math.exp(a * dt);
}

/** Равновесный счёт подкритической сборки с источником: N = Sℓ/(1 − k). При k ≥ 1 равновесия нет. */
export const plateau = (k: number, l = 0.1, S = 2) => (k < 1 ? (S * l) / (1 - k) : Infinity);

/** Период разгона при k > 1: T = ℓ/(k − 1), с. */
export const period = (k: number, l = 0.1) => l / (k - 1);

/**
 * Экстраполяция 1/M к нулю по последним двум точкам (как в блокноте Ферми): прямая через них пересекает ось.
 * Точки — [положение, 1/M]. Нет прогноза, если точек меньше двух или 1/M не убывает.
 */
export function extrapolateCritical(points: readonly (readonly [number, number])[]): number | null {
  if (points.length < 2) return null;
  const [x1, y1] = points[points.length - 2]!;
  const [x2, y2] = points[points.length - 1]!;
  if (x2 === x1 || y2 >= y1) return null;
  return x2 - (y2 * (x2 - x1)) / (y2 - y1);
}

// --- урок 19: накопление плутония ---

/** Периоды полураспада, сутки. */
export const T_HALF_U239 = 23.45 / (24 * 60);
export const T_HALF_NP239 = 2.356;
export const LAMBDA_U = Math.LN2 / T_HALF_U239;
export const LAMBDA_NP = Math.LN2 / T_HALF_NP239;

/** Захватов в ²³⁸U на 1 МВт·сут — оценка для природного урана: ≈ 1 г Pu на МВт·сут. */
export const CAPTURES_PER_MWD = 2.5e21;

export interface Chain { u: number; np: number; pu: number }

/**
 * Уравнения Бейтмана для ²³⁹U → ²³⁹Np → ²³⁹Pu с постоянным притоком R ядер ²³⁹U в сутки за время t (сутки).
 * Начальные количества — n0. Pu на этих временах считается стабильным (24 тыс. лет).
 * Решение аналитическое: каждое слагаемое — вклад начальных ядер или притока.
 */
export function bateman(n0: Chain, R: number, t: number, l1 = LAMBDA_U, l2 = LAMBDA_NP): Chain {
  const e1 = Math.exp(-l1 * t), e2 = Math.exp(-l2 * t);
  const d = l2 - l1;
  const u = n0.u * e1 + (R / l1) * (1 - e1);
  const np = n0.np * e2 + ((n0.u * l1) / d) * (e1 - e2) + R * ((1 - e2) / l2 - (e1 - e2) / d);
  const pu = n0.pu
    + n0.np * (1 - e2)
    + n0.u * (1 - (l2 * e1 - l1 * e2) / d)
    + R * (t - (1 - e2) / l2 - (l2 / d) * ((1 - e1) / l1 - (1 - e2) / l2));
  return { u, np, pu };
}

/** Облучение time суток с притоком R, затем выдержка cool суток. */
export function irradiate(R: number, time: number, cool: number): { stop: Chain; end: Chain } {
  const stop = bateman({ u: 0, np: 0, pu: 0 }, R, time);
  return { stop, end: bateman(stop, 0, cool) };
}

/** Состав в момент t от начала облучения (облучение длится time суток). */
export const chainAt = (R: number, time: number, t: number): Chain =>
  t <= time ? bateman({ u: 0, np: 0, pu: 0 }, R, t) : bateman(bateman({ u: 0, np: 0, pu: 0 }, R, time), 0, t - time);

/** Масса 239 г/моль: ядер → граммы. */
export const gramsOf = (n: number) => (n * 239) / 6.02214e23;

// --- урок 19: оценка k кладки ---

/** Толщина слоя CP-1 — брусок 4⅛ дюйма, см. */
export const LAYER_CM = 10.48;
/**
 * Упрощённая модель кладки: цилиндр радиуса R с плоской вершиной на высоте n слоёв.
 * k = k∞/(1 + M²B²), B² = (2.405/R)² + (π/H)², H = n·h + 2δ (δ — добавка отражателя).
 * Параметры подобраны так, что 57 слоёв без кадмия дают k = 1.0006, как в записях пуска.
 */
export const PILE = { R: 300, M2: 600, delta: 30, kInf: 1.0006 * (1 + 600 * ((2.405 / 300) ** 2 + (Math.PI / (57 * LAYER_CM + 60)) ** 2)) };

/** Геометрический параметр B² кладки из n слоёв, см⁻². */
export const buckling = (n: number) => (2.405 / PILE.R) ** 2 + (Math.PI / (n * LAYER_CM + 2 * PILE.delta)) ** 2;

/** Вероятность нейтрону не вылететь из кладки: 1/(1 + M²B²). */
export const nonLeakage = (n: number) => 1 / (1 + PILE.M2 * buckling(n));

/** Сколько k отнимают вставленные кадмиевые стержни — столько же, сколько в лаборатории пуска (0.0406). */
export const ROD_WORTH = 0.0406;

/** k кладки из n слоёв; rodsIn — кадмиевые стержни вставлены. */
export const kPile = (n: number, rodsIn = false) => PILE.kInf * nonLeakage(n) - (rodsIn ? ROD_WORTH : 0);

/** Первый слой, на котором кладка без кадмия становится критической. */
export function criticalLayer(max = 80): number | null {
  for (let n = 1; n <= max; n++) if (kPile(n) >= 1) return n;
  return null;
}
