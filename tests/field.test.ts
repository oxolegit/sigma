import { describe, expect, it } from 'vitest';
import { angularShape, beamField, direction, dot, oneSided, physical, PRESETS } from '../src/labs/tpn/field';

describe('пучки и площадка: задача Б5', () => {
  const r = beamField(PRESETS.notes, 0);
  it('поток складывается без учёта направлений: Φ = 5', () => {
    expect(r.flux).toBe(5);
  });
  it('через площадку с нормалью e_x: i⁺ = 2.12, i⁻ = 1, i_x = 1.12', () => {
    expect(r.plus).toBeCloseTo(2.121, 3);
    expect(r.minus).toBeCloseTo(1, 12);
    expect(r.net).toBeCloseTo(1.121, 3);
  });
  it('вектор тока (1.12; 1.12), |i| = 1.59 под 45°', () => {
    expect(r.ix).toBeCloseTo(1.121, 3);
    expect(r.iy).toBeCloseTo(1.121, 3);
    expect(r.magnitude).toBeCloseTo(1.586, 3);
    expect(r.direction).toBeCloseTo(45, 6);
  });
  it('при нормали вдоль тока полный ток равен |i| — это максимум', () => {
    const along = beamField(PRESETS.notes, 45);
    expect(along.net).toBeCloseTo(r.magnitude, 9);
    for (let a = 0; a < 360; a += 15) expect(beamField(PRESETS.notes, a).net).toBeLessThanOrEqual(r.magnitude + 1e-9);
  });
  it('встречные пучки: поток 2, ток 0', () => {
    const o = beamField(PRESETS.opposite, 0);
    expect(o.flux).toBe(2);
    expect(o.magnitude).toBeCloseTo(0, 12);
    expect(o.plus).toBeCloseTo(o.minus, 12);
  });
  it('поток не зависит от ориентации площадки, ток зависит', () => {
    expect(beamField(PRESETS.notes, 120).flux).toBe(r.flux);
    expect(beamField(PRESETS.notes, 120).net).not.toBeCloseTo(r.net, 2);
  });
});

describe('слабо анизотропное поле', () => {
  it('изотропное поле: i± = Φ/4', () => {
    expect(oneSided(0)).toEqual({ plus: 0.25, minus: 0.25, net: 0 });
  });
  it('i± = Φ/4 ± i/2 — задача Б6: Φ = 4·10¹³, i = 2·10¹²', () => {
    const s = oneSided(2e12 / 4e13);
    expect(s.plus * 4e13).toBeCloseTo(1.1e13, -9);
    expect(s.minus * 4e13).toBeCloseTo(0.9e13, -9);
  });
  it('нормаль перпендикулярна току: i± = Φ/4, полный ток ноль', () => {
    const s = oneSided(0.2, 0);
    expect(s.plus).toBe(0.25);
    expect(s.net).toBe(0);
  });
  it('угловой поток неотрицателен только при |b| ≤ 1/3', () => {
    expect(physical(1 / 3)).toBe(true);
    expect(physical(0.34)).toBe(false);
    expect(angularShape(0.34, -1)).toBeLessThan(0);
    expect(angularShape(0.3, -1)).toBeGreaterThan(0);
  });
  it('направления единичные, ось y — вверх', () => {
    expect(direction(0, 0)).toEqual([0, 1, 0]);
    const d = direction(37, 123);
    expect(dot(d, d)).toBeCloseTo(1, 12);
  });
});
