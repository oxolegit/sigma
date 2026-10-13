import { describe, expect, it } from 'vitest';
import { energyClass, nuclearRadius, reducedWavelength, speed, waveOrParticle } from '../src/labs/tpn/neutron';

describe('нейтрон: числа из задачи Б1', () => {
  it('тепловой нейтрон 0.0253 эВ летит 2200 м/с', () => {
    expect(speed(0.0253) / 100).toBeCloseTo(2200, -1);
  });
  it('быстрый нейтрон 2 МэВ — 1.96·10⁹ см/с', () => {
    expect(speed(2e6) / 1e9).toBeCloseTo(1.956, 2);
  });
  it('ƛ теплового — 2.86·10⁻⁹ см, быстрого — 3.2·10⁻¹³ см', () => {
    expect(reducedWavelength(0.0253) / 1e-9).toBeCloseTo(2.86, 2);
    expect(reducedWavelength(2e6) / 1e-13).toBeCloseTo(3.22, 2);
  });
  it('радиус ядра урана ≈ 8.7·10⁻¹³ см', () => {
    expect(nuclearRadius(238) / 1e-13).toBeCloseTo(8.68, 1);
  });
});

describe('классы и вывод', () => {
  it('классы по энергии', () => {
    expect(energyClass(1e-8)).toBe('ультрахолодный');
    expect(energyClass(0.0253)).toBe('тепловой');
    expect(energyClass(6.67)).toBe('промежуточный');
    expect(energyClass(2e6)).toBe('быстрый');
  });
  it('быстрый нейтрон 2 МэВ: ƛ сравнима с ядром (волна), в среде — частица', () => {
    const v = waveOrParticle(2e6, 238);
    expect(v.interaction).toMatch(/сравнима с R/);
    expect(v.tone).toBe('ok');
  });
  it('медленный нейтрон 1 кэВ: для ядра ƛ ≥ R', () => {
    expect(waveOrParticle(1e3, 238).interaction).toMatch(/ƛ ≥ R/);
  });
  it('выше ~30 МэВ ƛ много меньше ядра урана', () => {
    expect(waveOrParticle(5e7, 238).interaction).toMatch(/ƛ ≪ R/);
  });
  it('при 0.001 эВ точечная модель уже под вопросом', () => {
    expect(waveOrParticle(1e-3, 238).tone).toBe('warn');
  });
  it('холодные нейтроны — волновая картина и в среде', () => {
    expect(waveOrParticle(1e-6, 238).tone).toBe('bad');
  });
});
