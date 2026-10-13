import { describe, expect, it } from 'vitest';
import { CROSS_SECTIONS, GROUP_STRUCTURES, groupAverages, groupGrid, inverseVInInverseE, kT, SPECTRA } from '../src/labs/tpn/groups';

const grid = groupGrid();

describe('групповые сечения', () => {
  it('постоянное сечение даёт 5 б в каждой группе при любом спектре', () => {
    const r = groupAverages(grid, GROUP_STRUCTURES['5'], CROSS_SECTIONS.const.sigma, (E) => SPECTRA.thermal.phi(E, kT(350)));
    for (const row of r.rows) expect(row.weighted).toBeCloseTo(5, 9);
    expect(r.oneGroup).toBeCloseTo(5, 9);
  });

  it('скорость реакций сохраняется: Σ σg Φg = ∫σΦ dE', () => {
    for (const s of Object.keys(GROUP_STRUCTURES) as (keyof typeof GROUP_STRUCTURES)[]) {
      const r = groupAverages(grid, GROUP_STRUCTURES[s], CROSS_SECTIONS.u238c.sigma, (E) => SPECTRA.thermal.phi(E, kT(350)));
      expect(r.conservation).toBeCloseTo(1, 9);
    }
  });

  it('задача Б7: ¹⁰B в группе [1; 100] эВ при спектре 1/E — 238.5 б, без веса — 111 б', () => {
    const r = groupAverages(grid, [100, 1], CROSS_SECTIONS.b10.sigma, SPECTRA.inverse.phi);
    expect(r.rows[0]!.weighted).toBeCloseTo(238.5, 0);
    expect(r.rows[0]!.plain).toBeCloseTo(111, 0);
    expect(inverseVInInverseE(3837, 0.0253, 1, 100)).toBeCloseTo(238.6, 0);
  });

  it('в группе 100 эВ – 10 кэВ захват ²³⁸U с весом потока в разы больше простого среднего', () => {
    const r = groupAverages(grid, GROUP_STRUCTURES['5'], CROSS_SECTIONS.u238c.sigma, (E) => SPECTRA.thermal.phi(E, kT(350)));
    const g3 = r.rows.find((row) => row.lo === 100)!;
    expect(g3.weighted / g3.plain).toBeGreaterThan(3);
  });

  it('одногрупповой захват ²³⁸U в тепловом и быстром спектрах различается на порядки', () => {
    const one = (s: 'thermal' | 'fast') => groupAverages(grid, GROUP_STRUCTURES['1'], CROSS_SECTIONS.u238c.sigma, (E) => SPECTRA[s].phi(E, kT(350))).oneGroup;
    expect(one('thermal') / one('fast')).toBeGreaterThan(30);
  });

  it('сетка содержит все границы групп', () => {
    for (const b of GROUP_STRUCTURES['26']) expect(grid.includes(b)).toBe(true);
  });
});
