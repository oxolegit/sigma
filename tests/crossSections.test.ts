import { describe, expect, it } from 'vitest';
import { carbon, energyGrid, macroscopic, material, u238, uranium } from '../src/labs/tpn/crossSections';

describe('σ(E)', () => {
  it('²³⁸U в тепловой точке: захват 2.7 б (табличное значение, хвост резонансов не учтён дважды)', () => {
    expect(u238(0.0253).capture).toBeCloseTo(2.7, 3);
  });
  it('ниже резонансов захват ²³⁸U идёт по закону 1/v', () => {
    expect(u238(0.0253 * 4).capture / u238(0.0253).capture).toBeCloseTo(0.5, 1);
  });
  it('первый резонанс ²³⁸U при 6.67 эВ — пик на порядки выше фона', () => {
    expect(u238(6.67).capture).toBeGreaterThan(1e4);
    expect(u238(3).capture).toBeLessThan(10);
  });
  it('деление ²³⁸U пороговое: ничтожно ниже 1 МэВ, около 0.5 б при 2 МэВ', () => {
    expect(u238(3e5).fission).toBeLessThan(0.01);
    expect(u238(2e6).fission).toBeGreaterThan(0.4);
  });
  it('(n, 2n) — только выше 6.2 МэВ', () => {
    expect(u238(6e6).n2n).toBe(0);
    expect(u238(1e7).n2n).toBeGreaterThan(0.5);
  });
  it('углерод: ≈ 4.7 б потенциального рассеяния без резонансов до сотен кэВ', () => {
    for (const E of [1, 100, 1e4]) expect(carbon(E).total).toBeCloseTo(4.74, 1);
    expect(carbon(2.08e6).total).toBeGreaterThan(carbon(1.5e6).total + 2);
  });
  it('сетка энергий упорядочена, без повторов, сгущена у резонанса', () => {
    const g = energyGrid(1, 200);
    for (let i = 1; i < g.length; i++) expect(g[i]!).toBeGreaterThan(g[i - 1]!);
    expect(g.filter((E) => Math.abs(E - 6.67) < 0.05).length).toBeGreaterThan(20);
  });
});

describe('калькулятор Σ', () => {
  it('графит совпадает с приложением 2 пособия', () => {
    const { Sa, Ss } = macroscopic(material('c'));
    expect(Sa).toBeCloseTo(2.73e-4, 6);
    expect(Ss).toBeCloseTo(0.381, 3);
  });
  it('UO₂ 4 % — числа задачи Б3 контрольной', () => {
    expect(uranium(0.04).MU).toBeCloseTo(237.93, 2);
    expect(uranium(0.04).atom235).toBeCloseTo(0.0405, 4);
    const r = macroscopic(material('uo2', 0.04));
    expect(r.Sf).toBeCloseTo(0.547, 3);
    expect(r.Sa).toBeCloseTo(0.700, 3);
    expect(r.Ss).toBeCloseTo(0.389, 3);
    expect(1 / r.St).toBeCloseTo(0.92, 2);
  });
  it('тяжёлая вода поглощает в сотни раз слабее обычной', () => {
    expect(macroscopic(material('h2o')).Sa / macroscopic(material('d2o')).Sa).toBeGreaterThan(500);
  });
  it('у кадмия Σa ≫ Σs', () => {
    const { Sa, Ss } = macroscopic(material('cd'));
    expect(Sa / Ss).toBeGreaterThan(100);
  });
  it('у неизвестного id — UO₂', () => {
    expect(material('нет').id).toBe('uo2');
  });
});
