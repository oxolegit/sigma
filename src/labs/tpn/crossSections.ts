/** Урок 3: схематичные сечения σ(E), барн; энергия — эВ. Качественно как рис. 1.5–1.6 пособия. */

/** Резонансы ²³⁸U: E₀ и нейтронная ширина Γn, эВ. Радиационная ширина Γγ общая. */
export const U238_RESONANCES: readonly (readonly [number, number])[] = [
  [6.67, 0.00152], [20.87, 0.0101], [36.68, 0.034], [66.03, 0.024], [80.75, 0.0019], [102.5, 0.071], [116.9, 0.025],
  [145.7, 0.0009], [165.3, 0.003], [189.7, 0.17], [208.5, 0.052], [237.4, 0.027], [273.7, 0.026], [291, 0.017],
  [311.4, 0.003], [347.8, 0.081], [397.6, 0.007], [410.2, 0.022], [434, 0.013], [463, 0.004], [478.6, 0.008],
  [518.4, 0.046], [535.5, 0.045], [580.2, 0.033], [594.8, 0.088], [619.9, 0.032], [661.2, 0.13], [693.1, 0.034],
  [708.5, 0.044], [721.5, 0.025], [765.1, 0.008], [782.3, 0.028], [820.8, 0.075], [851, 0.054], [856, 0.065],
  [866.4, 0.031], [905, 0.12], [925, 0.08], [937.1, 0.073], [958.8, 0.027], [991.6, 0.093],
];
export const GAMMA_G = 0.023;

/** Резонансные вклады Брейта — Вигнера (без доплеровского уширения) в захват и рассеяние ²³⁸U. */
export function u238Resonances(E: number): { capture: number; scatter: number } {
  let capture = 0, scatter = 0;
  for (const [E0, Gn] of U238_RESONANCES) {
    const G = Gn + GAMMA_G;
    if (Math.abs(E - E0) > 400 * G && Math.abs(E - E0) > 5) continue;
    const s0 = ((2.6e6 * 1.0084) / E0) * (Gn / G);
    const x = (2 * (E - E0)) / G;
    const f = 1 / (1 + x * x);
    capture += s0 * (GAMMA_G / G) * Math.sqrt(E0 / E) * f;
    scatter += s0 * (Gn / G) * f;
  }
  return { capture, scatter };
}

function interpLog(table: readonly (readonly [number, number])[], E: number): number {
  if (E <= table[0]![0]) return table[0]![1];
  for (let i = 1; i < table.length; i++) {
    const [b, fb] = table[i]!;
    if (E <= b) {
      const [a, fa] = table[i - 1]!;
      const t = Math.log(E / a) / Math.log(b / a);
      return Math.exp(Math.log(fa) + t * (Math.log(fb) - Math.log(fa)));
    }
  }
  return table[table.length - 1]![1];
}

const U238_TOTAL_SMOOTH = [[1e3, 10], [2e4, 13.5], [1e5, 12], [1e6, 7.2], [3e6, 7.6], [1e7, 5.8], [2e7, 5.8]] as const;

export interface CrossSections { total: number; capture: number; fission: number; n2n: number }

/**
 * Фон 1/v-захвата ²³⁸U в тепловой точке. Табличные 2.7 б уже включают хвост резонансов (в основном 6.67 эВ),
 * поэтому фон — это 2.7 б минус резонансный вклад при 0.0253 эВ; иначе хвост учитывался бы дважды (≈ 4 б).
 */
const U238_THERMAL_BACKGROUND = 2.7 - u238Resonances(0.0253).capture;

/** ²³⁸U: ниже 1.1 кэВ — 1/v-захват, потенциальное рассеяние 9 б и резонансы; выше — гладкая схема. */
export function u238(E: number): CrossSections {
  if (E < 1.1e3) {
    const r = u238Resonances(E);
    const capture = U238_THERMAL_BACKGROUND * Math.sqrt(0.0253 / E) + r.capture;
    return { total: 9.0 + r.scatter + capture, capture, fission: 0, n2n: 0 };
  }
  const capture = 2.7 * Math.sqrt(0.0253 / E) + Math.sqrt(1e3 / E);
  const fission = 0.55 / (1 + Math.exp(-(E - 1.4e6) / 1.2e5)) + 0.45 / (1 + Math.exp(-(E - 6.5e6) / 3e5));
  const n2n = E < 6.2e6 ? 0 : 1.45 * (1 - Math.exp(-(E - 6.2e6) / 1.2e6));
  return { total: interpLog(U238_TOTAL_SMOOTH, E), capture, fission, n2n };
}

/** ¹²C: потенциальное рассеяние ≈ 4.7 б до сотен кэВ, резонансы выше 1.5 МэВ, ничтожный 1/v-захват. */
export function carbon(E: number): CrossSections {
  let s = 4.74 * (1 + (E / 9e5) ** 1.6) ** -0.45;
  if (E > 1.5e6) {
    for (const [E0, G, h] of [[2.08e6, 0.045e6, 3.2], [2.82e6, 0.3e6, 1.2], [3.6e6, 0.12e6, 0.9], [4.25e6, 0.15e6, 0.8]] as const) {
      const x = (2 * (E - E0)) / G;
      s += h / (1 + x * x);
    }
  }
  const capture = 0.0034 * Math.sqrt(0.0253 / E);
  return { total: s + capture, capture, fission: 0, n2n: 0 };
}

/** Сетка энергий: логарифмически равномерная плюс сгущение у каждого резонанса ²³⁸U, чтобы пики не терялись. */
export function energyGrid(lo: number, hi: number, base = 2600): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= base; i++) pts.push(lo * (hi / lo) ** (i / base));
  for (const [E0, Gn] of U238_RESONANCES) {
    const G = Gn + GAMMA_G;
    for (let k = -120; k <= 120; k++) { const E = E0 + (k * G) / 6; if (E > lo && E < hi) pts.push(E); }
    for (let k = 1; k <= 40; k++) {
      const d = G * 20 * 1.12 ** k;
      if (E0 - d > lo) pts.push(E0 - d);
      if (E0 + d < hi) pts.push(E0 + d);
    }
  }
  pts.sort((a, b) => a - b);
  return pts.filter((v, i) => i === 0 || v > pts[i - 1]! * (1 + 1e-12));
}

/* ---------- Калькулятор Σ: тепловая точка 0.0253 эВ, микросечения из приложений 1–2 пособия ---------- */

export interface Nuclide { name: string; perMolecule: number; sa: number; ss: number; sf?: number }
export interface Material { id: string; label: string; rho: number; M: number; nuclides: Nuclide[]; note: string }

const MATERIALS: Omit<Material, 'M' | 'nuclides' | 'note'>[] = [
  { id: 'uo2', label: 'Диоксид урана UO₂', rho: 10.4 },
  { id: 'h2o', label: 'Вода H₂O', rho: 1.0 },
  { id: 'd2o', label: 'Тяжёлая вода D₂O', rho: 1.105 },
  { id: 'c', label: 'Графит', rho: 1.6 },
  { id: 'be', label: 'Бериллий', rho: 1.85 },
  { id: 'na', label: 'Натрий', rho: 0.97 },
  { id: 'cd', label: 'Кадмий', rho: 8.65 },
];
export const MATERIAL_OPTIONS = MATERIALS.map((m) => ({ value: m.id, label: m.label }));

/** Атомная доля ²³⁵U в уране по массовому обогащению c (0…1) и молярная масса урана. */
export function uranium(c: number) {
  const MU = 1 / (c / 235.04 + (1 - c) / 238.05);
  return { MU, atom235: (c / 235.04) * MU };
}

export function material(id: string, enrichment = 0.04): Material {
  const base = MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]!;
  switch (base.id) {
    case 'uo2': {
      const { MU, atom235 } = uranium(enrichment);
      return {
        ...base, M: MU + 31.999,
        nuclides: [
          { name: '²³⁵U', perMolecule: atom235, sa: 680.8, ss: 15, sf: 582.2 },
          { name: '²³⁸U', perMolecule: 1 - atom235, sa: 2.70, ss: 9.0 },
          { name: 'O', perMolecule: 2, sa: 0.00027, ss: 3.76 },
        ],
        note: `Обогащение по массе пересчитано в атомную долю ²³⁵U ${atom235.toFixed(4)} через молярную массу урана ${MU.toFixed(2)} г/моль. σs урана ≈ 15 и 9 б — в пособии не приведены.`,
      };
    }
    case 'h2o': return { ...base, M: 18.015, nuclides: [{ name: 'H', perMolecule: 2, sa: 0.332, ss: 20.4 }, { name: 'O', perMolecule: 1, sa: 0.00027, ss: 3.76 }], note: 'σs водорода — для свободного атома (20.4 б). В воде при тепловых энергиях из-за химической связи оно примерно вдвое больше — эффект термализации (гл. 6).' };
    case 'd2o': return { ...base, M: 20.03, nuclides: [{ name: 'D', perMolecule: 2, sa: 0.00053, ss: 3.39 }, { name: 'O', perMolecule: 1, sa: 0.00027, ss: 3.76 }], note: 'Поглощение в 600 раз меньше, чем у воды, поэтому тяжёлая вода — лучший замедлитель по Σs/Σa.' };
    case 'c': return { ...base, M: 12.011, nuclides: [{ name: 'C', perMolecule: 1, sa: 0.0034, ss: 4.75 }], note: 'Совпадает с приложением 2: Σa = 2.73·10⁻⁴, Σs = 0.381 см⁻¹.' };
    case 'be': return { ...base, M: 9.012, nuclides: [{ name: 'Be', perMolecule: 1, sa: 0.0092, ss: 6.14 }], note: 'A = 9 < 10: рассеяние уже заметно анизотропно в лабораторной системе, нужен Σtr.' };
    case 'na': return { ...base, M: 22.99, nuclides: [{ name: 'Na', perMolecule: 1, sa: 0.53, ss: 3.2 }], note: 'Теплоноситель быстрых реакторов.' };
    default: return { ...base, M: 112.4, nuclides: [{ name: 'Cd', perMolecule: 1, sa: 2450, ss: 5.6 }], note: 'Σa ≫ Σs: сильный поглотитель, диффузионное приближение здесь неприменимо.' };
  }
}

/** Число Авогадро в единицах 10²⁴: N [10²⁴ см⁻³] · σ [б = 10⁻²⁴ см²] = Σ [см⁻¹]. */
const NA = 0.602214;

export interface MixRow { name: string; N: number; sa: number; ss: number; Sa: number; Ss: number; Sf: number }

/** Макросечения смеси: Σ = Σ_k N_k σ_k, N = ρN_A/M · (атомов в молекуле). N в строках — в см⁻³. */
export function macroscopic(m: Material) {
  const Nmol = (m.rho * NA) / m.M;
  const rows: MixRow[] = m.nuclides.map((n) => {
    const N = Nmol * n.perMolecule;
    return { name: n.name, N: N * 1e24, sa: n.sa, ss: n.ss, Sa: N * n.sa, Ss: N * n.ss, Sf: N * (n.sf ?? 0) };
  });
  const Sa = rows.reduce((s, r) => s + r.Sa, 0);
  const Ss = rows.reduce((s, r) => s + r.Ss, 0);
  const Sf = rows.reduce((s, r) => s + r.Sf, 0);
  return { rows, Sa, Ss, Sf, St: Sa + Ss };
}
