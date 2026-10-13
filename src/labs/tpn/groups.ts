import { energyGrid, u238 } from './crossSections';
import { watt } from './fission';

/** Урок 6: групповые сечения. Энергия — эВ, сечения — барн. Группы нумеруются сверху вниз. */

/** Границы групп от верхней к нижней. 26 групп — система БНАБ с верхней границей 10.5 МэВ. */
export const GROUP_STRUCTURES = {
  '1': [1.05e7, 1e-5],
  '2': [1.05e7, 0.625, 1e-5],
  '5': [1.05e7, 8e5, 1e4, 100, 0.625, 1e-5],
  '26': [1.05e7, 6.5e6, 4e6, 2.5e6, 1.4e6, 8e5, 4e5, 2e5, 1e5, 4.65e4, 2.15e4, 1e4, 4650, 2150, 1000, 465, 215, 100, 46.5, 21.5, 10, 4.65, 2.15, 1, 0.465, 0.215, 1e-5],
} as const satisfies Record<string, readonly number[]>;
export type Structure = keyof typeof GROUP_STRUCTURES;

export const CROSS_SECTIONS = {
  b10: { label: '1/V: ¹⁰B(n, α), σ₀ = 3837 б', sigma: (E: number) => 3837 * Math.sqrt(0.0253 / E), range: [1e-3, 1e6] },
  u238c: { label: 'Резонансный захват ²³⁸U', sigma: (E: number) => u238(E).capture, range: [1e-3, 1e5] },
  u238f: { label: 'Пороговое деление ²³⁸U', sigma: (E: number) => Math.max(u238(E).fission, 1e-7), range: [1e-4, 10] },
  const: { label: 'Постоянное, 5 б (проверка)', sigma: () => 5, range: [1, 20] },
} as const;
export type CrossSectionId = keyof typeof CROSS_SECTIONS;

/** Спектр деления в эВ⁻¹. */
const chi = (E: number) => (E > 1e3 ? watt(E / 1e6) * 1e-6 : 0);

export const SPECTRA = {
  thermal: {
    label: 'Тепловой реактор: Максвелл + 1/E + деление',
    phi: (E: number, kT: number) => {
      const maxwell = (E / (kT * kT)) * Math.exp(-E / kT);
      const join = 1 / (1 + ((4.5 * kT) / E) ** 5) / (1 + (E / 1e6) ** 1.5);
      return 8 * maxwell + join / E + 2.5 * chi(E);
    },
  },
  fast: {
    label: 'Быстрый реактор',
    phi: (E: number) => (1.6 / (1 + (3e3 / E) ** 2.5) / (1 + (E / 4e5) ** 2)) / E + 4 * chi(E),
  },
  inverse: { label: 'Чистый 1/E', phi: (E: number) => 1 / E },
  fission: { label: 'Спектр деления χ(E)', phi: (E: number) => chi(E) },
} as const;
export type SpectrumId = keyof typeof SPECTRA;

/** kT в эВ при температуре T, К. */
export const kT = (T: number) => 8.617e-5 * T;

/** Сетка интегрирования: сгущённая у резонансов ²³⁸U и содержащая все границы групп. */
export function groupGrid(): number[] {
  const all = energyGrid(1e-5, 1.05e7, 3000).concat(...Object.values(GROUP_STRUCTURES));
  all.sort((a, b) => a - b);
  return all.filter((v, i) => i === 0 || v > all[i - 1]! * (1 + 1e-12));
}

export interface GroupRow { g: number; hi: number; lo: number; flux: number; rate: number; weighted: number; plain: number }

/**
 * Групповые величины по формуле трапеций на сетке:
 * Φg = ∫Φ dE, σg = ∫σΦ dE / ∫Φ dE (вес — поток), а для сравнения — простое среднее σ по энергии.
 */
export function groupAverages(grid: readonly number[], bounds: readonly number[], sigma: (E: number) => number, phi: (E: number) => number) {
  const sg = grid.map(sigma);
  const ph = grid.map(phi);
  const rows: GroupRow[] = [];
  for (let g = 0; g < bounds.length - 1; g++) {
    const hi = bounds[g]!, lo = bounds[g + 1]!;
    let flux = 0, rate = 0, plain = 0;
    for (let i = 1; i < grid.length; i++) {
      const a = grid[i - 1]!, b = grid[i]!;
      if (a < lo * (1 - 1e-12) || b > hi * (1 + 1e-12)) continue;
      const dE = b - a;
      flux += 0.5 * (ph[i]! + ph[i - 1]!) * dE;
      rate += 0.5 * (sg[i]! * ph[i]! + sg[i - 1]! * ph[i - 1]!) * dE;
      plain += 0.5 * (sg[i]! + sg[i - 1]!) * dE;
    }
    rows.push({ g: g + 1, hi, lo, flux, rate, weighted: flux > 0 ? rate / flux : 0, plain: plain / (hi - lo) });
  }
  const totalFlux = rows.reduce((s, r) => s + r.flux, 0);
  const totalRate = rows.reduce((s, r) => s + r.rate, 0);
  let exactRate = 0;
  for (let i = 1; i < grid.length; i++) exactRate += 0.5 * (sg[i]! * ph[i]! + sg[i - 1]! * ph[i - 1]!) * (grid[i]! - grid[i - 1]!);
  return { rows, oneGroup: totalRate / totalFlux, conservation: totalRate / exactRate, sigma: sg, phi: ph };
}

/** Аналитика для σ ∝ 1/√E в спектре 1/E: σg = σ₀√E₀ · 2(E₁^{−1/2} − E₂^{−1/2}) / ln(E₂/E₁). */
export const inverseVInInverseE = (sigma0: number, E0: number, E1: number, E2: number) =>
  (sigma0 * Math.sqrt(E0) * 2 * (E1 ** -0.5 - E2 ** -0.5)) / Math.log(E2 / E1);
