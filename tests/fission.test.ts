import { describe, expect, it } from 'vitest';
import {
  cassiniRadius, deformationEnergy, excitation, fissionVerdict, maxwell, NU_MEAN, P_NU, sampleNu, SADDLE,
  spectrumStats, target, threshold, turningDeformation, volumeScale, watt,
} from '../src/labs/tpn/fission';
import { mulberry32 } from '../src/lib/rng';

describe('порог деления', () => {
  it('²³⁵U, ²³³U, ²³⁹Pu делятся нейтронами любых энергий', () => {
    for (const id of ['u235', 'u233', 'pu239']) {
      expect(threshold(target(id))).toBeLessThan(0);
      expect(fissionVerdict(target(id), 0).fissile).toBe(true);
    }
  });
  it('у ²³⁸U порог ≈ 1 МэВ, у ²³²Th ≈ 1.2 МэВ', () => {
    expect(threshold(target('u238'))).toBeCloseTo(1.04, 2);
    expect(threshold(target('th232'))).toBeCloseTo(1.2, 2);
  });
  it('²³⁸U: 0.3 МэВ — захват, 1.5 МэВ — деление', () => {
    const u8 = target('u238');
    expect(excitation(u8, 0.3)).toBeCloseTo(5.06, 2);
    expect(fissionVerdict(u8, 0.3)).toMatchObject({ tone: 'bad', fissions: false });
    expect(fissionVerdict(u8, 1.5)).toMatchObject({ tone: 'ok', fissions: true, fissile: false });
  });
});

describe('капельная модель', () => {
  it('без деформации — шар радиуса 1', () => {
    for (const th of [0, 0.7, Math.PI / 2]) expect(cassiniRadius(th, 0)).toBeCloseTo(1, 12);
    expect(volumeScale(0)).toBeCloseTo(1, 3);
  });
  it('при деформации ядро вытягивается вдоль оси и сужается в шейке', () => {
    expect(cassiniRadius(0, 0.6)).toBeGreaterThan(1);
    expect(cassiniRadius(Math.PI / 2, 0.6)).toBeLessThan(1);
  });
  it('потенциал: ноль в шаре, барьер в седле, падает к разрыву', () => {
    expect(deformationEnergy(0, 5.8)).toBe(0);
    expect(deformationEnergy(SADDLE, 5.8)).toBeCloseTo(5.8, 12);
    expect(deformationEnergy(1, 5.8)).toBeCloseTo(-14, 12);
  });
  it('точка поворота лежит на уровне E*', () => {
    const c = turningDeformation(4, 5.8);
    expect(deformationEnergy(c, 5.8)).toBeCloseTo(4, 10);
    expect(turningDeformation(7, 5.8)).toBeCloseTo(SADDLE, 12);
  });
});

describe('спектр и число нейтронов деления', () => {
  const w = spectrumStats(watt);
  it('спектр Уатта нормирован, среднее ≈ 2 МэВ, максимум ≈ 0.7 МэВ', () => {
    expect(w.norm).toBeCloseTo(1, 2);
    expect(w.mean).toBeCloseTo(2.0, 0);
    expect(w.mode).toBeGreaterThan(0.6);
    expect(w.mode).toBeLessThan(0.85);
  });
  it('выше 1 МэВ рождается около 70 %, выше 12 МэВ — порядка 10⁻⁴', () => {
    expect(w.above(1)).toBeGreaterThan(0.6);
    expect(w.above(1)).toBeLessThan(0.75);
    expect(w.above(12)).toBeGreaterThan(1e-4);
    expect(w.above(12)).toBeLessThan(5e-4);
    expect(w.above(0)).toBe(1);
  });
  it('максвелловская аппроксимация нормирована, среднее 3T/2', () => {
    const m = spectrumStats(maxwell);
    expect(m.norm).toBeCloseTo(1, 2);
    expect(m.mean).toBeCloseTo(1.98, 1);
  });
  it('P(ν) нормировано, среднее ν ≈ 2.41 (табличное 2.44), розыгрыш его воспроизводит', () => {
    expect(P_NU.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
    expect(NU_MEAN).toBeCloseTo(2.41, 2);
    expect(Math.abs(NU_MEAN - 2.442) / 2.442).toBeLessThan(0.015);
    const rng = mulberry32(1);
    let s = 0;
    for (let i = 0; i < 50_000; i++) s += sampleNu(rng);
    expect(s / 50_000).toBeCloseTo(NU_MEAN, 1);
  });
});
