import { describe, expect, it } from 'vitest';
import { diffusion } from '../src/labs/tpn/fick';
import { besselK0, exactR2, medium, randomWalk, slabHarmonic, sourceFlux } from '../src/labs/tpn/diffusion';
import { mulberry32 } from '../src/lib/rng';

describe('функция K₀', () => {
  it('табличные значения', () => {
    expect(besselK0(0.1)).toBeCloseTo(2.4271, 4);
    expect(besselK0(1)).toBeCloseTo(0.4210, 4);
    expect(besselK0(2)).toBeCloseTo(0.1139, 4);
    expect(besselK0(5)).toBeCloseTo(0.003691, 6);
  });
});

describe('решения для источников', () => {
  const { D } = diffusion(0.3811, 0.000273, 12);
  const L = Math.sqrt(D / 0.000273);

  it('задача Б9: точечный источник 10⁶ н/с в графите, Φ(50 см) ≈ 729', () => {
    expect(L).toBeCloseTo(58.2, 1);
    expect(sourceFlux('point', 50, 1e6, D, L)).toBeCloseTo(729, -1);
  });

  it('баланс: всё рождённое поглощается, ∫Σa·Φ dV = q (для всех геометрий)', () => {
    const Sa = 0.05, m = medium(1, Sa);
    const dr = m.L / 2000;
    let point = 0, plane = 0, line = 0;
    for (let r = dr / 2; r < 40 * m.L; r += dr) {
      point += Sa * sourceFlux('point', r, 1, m.D, m.L) * 4 * Math.PI * r * r * dr;
      plane += Sa * sourceFlux('plane', r, 1, m.D, m.L) * 2 * dr;
      line += Sa * sourceFlux('line', r, 1, m.D, m.L) * 2 * Math.PI * r * dr;
    }
    expect(point).toBeCloseTo(1, 3);
    expect(plane).toBeCloseTo(1, 3);
    expect(line).toBeCloseTo(1, 3);
  });
});

describe('случайное блуждание', () => {
  it('точный ⟨r²⟩ = 2/(Σa·Σt) совпадает с 6L²', () => {
    const m = medium(1, 0.05);
    expect(exactR2(1, 0.05)).toBeCloseTo(6 * m.L * m.L, 10);
  });
  it('Монте-Карло воспроизводит ⟨r²⟩ и число столкновений Σt/Σa', () => {
    const w = randomWalk(1, 0.05, 20_000, mulberry32(8));
    expect(w.r2 / exactR2(1, 0.05)).toBeGreaterThan(0.95);
    expect(w.r2 / exactR2(1, 0.05)).toBeLessThan(1.05);
    expect(w.collisions).toBeCloseTo(21, 0);
  });
  it('пути сохраняются только для первых историй', () => {
    const w = randomWalk(1, 0.1, 100, mulberry32(1), 5);
    expect(w.paths).toHaveLength(5);
    expect(w.paths[0]![0]).toEqual([0, 0]);
  });
});

describe('экстраполированная граница', () => {
  it('ã = a + 2d, поток обращается в ноль на ã/2', () => {
    const s = slabHarmonic(6, 0.71);
    expect(s.at).toBeCloseTo(7.42, 10);
    expect(s.flux(s.at / 2)).toBeCloseTo(0, 12);
    expect(s.flux(0)).toBe(1);
  });
  it('для тонкой пластины выбор d меняет утечку на десятки процентов, для толстой — нет', () => {
    expect(1 - slabHarmonic(2, 0.71).leakageRatio).toBeGreaterThan(0.3);
    expect(1 - slabHarmonic(30, 0.71).leakageRatio).toBeLessThan(0.1);
  });
});
