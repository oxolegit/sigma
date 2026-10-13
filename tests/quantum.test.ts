import { describe, expect, it } from 'vitest';
import {
  channels, energyForKR, hardSphere, ladderCapture, legendre, levelLadder, porterThomas, resonance, sampleChannel,
  scatteredCoefficients, sphericalBessel, wigner, HBAR,
} from '../src/labs/tpn/quantum';
import { mulberry32 } from '../src/lib/rng';

describe('сферические функции', () => {
  it('j₀, j₁, y₀ совпадают с явными формулами', () => {
    const x = 2.3, { j, y } = sphericalBessel(5, x);
    expect(j[0]).toBeCloseTo(Math.sin(x) / x, 12);
    expect(j[1]).toBeCloseTo(Math.sin(x) / x ** 2 - Math.cos(x) / x, 12);
    expect(y[0]).toBeCloseTo(-Math.cos(x) / x, 12);
  });
  it('полиномы Лежандра', () => {
    const P = legendre(3, 0.5);
    expect(P[2]).toBeCloseTo((3 * 0.25 - 1) / 2, 12);
    expect(P[3]).toBeCloseTo((5 * 0.125 - 3 * 0.5) / 2, 12);
  });
});

describe('рассеяние на твёрдой сфере', () => {
  it('при kR ≪ 1 работает только s-волна и σ → 4πR²', () => {
    const s = hardSphere(0.1);
    expect(s.waves).toBe(1);
    expect(s.sigma).toBeCloseTo(4, 1);
    expect(s.intensity(0) / s.intensity(Math.PI)).toBeCloseTo(1, 0);
  });
  it('с ростом kR сечение идёт к 2πR², появляется пик вперёд', () => {
    const s = hardSphere(5);
    expect(s.sigma).toBeLessThan(3);
    expect(s.sigma).toBeGreaterThan(2);
    expect(s.intensity(0) / s.intensity(Math.PI)).toBeGreaterThan(5);
  });
  it('оптическая теорема: σ = 4π/k² · Im f(0)', () => {
    const kR = 1.7, s = hardSphere(kR);
    const imF0 = s.delta.reduce((a, d, l) => a + (2 * l + 1) * Math.sin(d) ** 2, 0) / kR;
    expect(s.sigma).toBeCloseTo((4 / kR) * imF0, 10);
  });
  it('внутри ядра поля нет, вдали — только падающая волна заметна', () => {
    const field = scatteredCoefficients(0.6);
    expect(field(0.5, 0)).toEqual([0, 0]);
    const [re] = field(-6, 0);
    expect(Number.isFinite(re)).toBe(true);
  });
  it('kR = 1 для ²³⁸U — около 0.27 МэВ', () => {
    expect(energyForKR(1) / 1e6).toBeCloseTo(0.274, 2);
  });
});

describe('резонанс Брейта — Вигнера', () => {
  it('время жизни τ = ħ/Γ: Γ = 0.1 эВ → 6.6·10⁻¹⁵ с', () => {
    expect(HBAR / 0.1).toBeCloseTo(6.58e-15, 17);
  });
  it('первый резонанс ²³⁸U: τ ≈ 2.7·10⁻¹⁴ с', () => {
    const r = resonance(6.67, 0.00152, 0.023, 0);
    expect(r.tau).toBeCloseTo(2.68e-14, 15);
  });
  it('доплеровское уширение снижает пик, площадь сохраняется', () => {
    const r = resonance(6.67, 0.00152, 0.023, 300);
    expect(r.D).toBeCloseTo(0.0538, 4);
    expect(r.peakHot).toBeLessThan(r.peakCold * 0.6);
    expect(r.areaHot / r.areaCold).toBeCloseTo(1, 2);
  });
});

describe('статистика уровней', () => {
  it('распределения нормированы, среднее расстояние Вигнера — 1', () => {
    let nw = 0, mw = 0, npt = 0;
    for (let s = 0.0005; s < 12; s += 0.001) { nw += wigner(s) * 0.001; mw += s * wigner(s) * 0.001; }
    for (let x = 1e-6; x < 60; x += 1e-4) npt += porterThomas(x) * 1e-4;
    expect(nw).toBeCloseTo(1, 3);
    expect(mw).toBeCloseTo(1, 3);
    expect(npt).toBeCloseTo(1, 1);
  });
  it('лестница по Вигнеру: мало близких пар; по Пуассону — много', () => {
    const close = (law: 'wigner' | 'poisson') => levelLadder(law, mulberry32(4), 4000).filter((l) => l.spacing < 0.2).length / 4000;
    expect(close('wigner')).toBeLessThan(0.05);
    expect(close('poisson')).toBeGreaterThan(0.15);
  });
  it('ширины по Портеру — Томасу: среднее x ≈ 1', () => {
    const lv = levelLadder('wigner', mulberry32(9), 20_000);
    expect(lv.reduce((s, l) => s + l.x, 0) / lv.length).toBeCloseTo(1, 1);
  });
  it('сечение лестницы — 1/v-фон между резонансами и пики на уровнях', () => {
    const lv = levelLadder('wigner', mulberry32(2), 50);
    expect(ladderCapture(lv, lv[0]!.E)).toBeGreaterThan(ladderCapture(lv, (lv[0]!.E + lv[1]!.E) / 2) * 10);
  });
});

describe('каналы реакции', () => {
  it('вероятности каналов в сумме дают 1', () => {
    for (const n of ['u235', 'u238', 'c12', 'h1', 'b10'] as const) {
      for (const e of ['thermal', 'fast'] as const) expect(channels(n, e).reduce((s, c) => s + c.p, 0)).toBeCloseTo(1, 12);
    }
  });
  it('¹⁰B: почти каждый тепловой нейтрон даёт (n, α)', () => {
    expect(channels('b10', 'thermal').find((c) => c.channel === 'alpha')!.p).toBeGreaterThan(0.99);
  });
  it('розыгрыш воспроизводит доли', () => {
    const list = channels('u235', 'thermal'), rng = mulberry32(5);
    let fis = 0;
    for (let i = 0; i < 20_000; i++) if (sampleChannel(list, rng) === 'fis') fis++;
    expect(fis / 20_000).toBeCloseTo(list.find((c) => c.channel === 'fis')!.p, 2);
  });
});
