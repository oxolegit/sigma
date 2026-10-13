import { describe, expect, it } from 'vitest';
import { diffusion, fickConditions, fickCurrents, muBar } from '../src/labs/tpn/fick';

describe('транспортное сечение и D', () => {
  it('графит (вопрос урока): D = 0.926 см, без учёта μ̄ — 0.874 см', () => {
    expect(muBar(12)).toBeCloseTo(0.0556, 4);
    const d = diffusion(0.381, 0.0003, 12);
    expect(d.sigmaTr).toBeCloseTo(0.360, 3);
    expect(d.D).toBeCloseTo(0.926, 3);
    expect(1 / (3 * (0.381 + 0.0003))).toBeCloseTo(0.874, 3);
  });
  it('графит (задача Б8): λtr = 2.78 см, D = 0.925 см', () => {
    const d = diffusion(0.3811, 0.000273, 12);
    expect(d.lambdaTr).toBeCloseTo(2.78, 2);
    expect(d.D).toBeCloseTo(0.925, 3);
  });
});

describe('односторонние токи по Фику', () => {
  it('задача Б10: Φ = 5·10¹², s = −0.12 → i⁺ = 1.35·10¹², i⁻ = 1.15·10¹², i_z = 2·10¹¹', () => {
    const c = fickCurrents(-0.12);
    expect(c.plus * 5e12).toBeCloseTo(1.35e12, -8);
    expect(c.minus * 5e12).toBeCloseTo(1.15e12, -8);
    expect(c.net * 5e12).toBeCloseTo(2e11, -7);
  });
  it('при |s| > 1.5 один из односторонних токов отрицателен', () => {
    expect(fickCurrents(1.6).plus).toBeLessThan(0);
    expect(fickCurrents(-1.6).minus).toBeLessThan(0);
    expect(fickCurrents(1.5).plus).toBeCloseTo(0, 12);
  });
});

describe('условия применимости', () => {
  it('графит вдали от границ и с плавным потоком — применим', () => {
    const r = fickConditions(12, 1e-3, 5, -0.3);
    expect(r.tone).toBe('ok');
    expect(r.items).toHaveLength(4);
    expect(r.items[1]!.text).toContain('10⁻³');
  });
  it('водород — сильная анизотропия', () => {
    expect(fickConditions(1, 1e-3, 5, 0).items[0]!.tone).toBe('bad');
  });
  it('у границы и с крутым градиентом — неприменим', () => {
    expect(fickConditions(12, 1e-3, 1, 0).tone).toBe('bad');
    expect(fickConditions(12, 1e-3, 5, 2).tone).toBe('bad');
  });
  it('граничные случаи — с оговорками', () => {
    expect(fickConditions(12, 0.1, 5, 0).tone).toBe('warn');
  });
});
