import { describe, expect, it } from 'vitest';
import {
  CAPTURES_PER_MWD, LAMBDA_NP, LAMBDA_U, MN14_MEV, MP_MEV, alphaA, bateman, chainAt, collide, collisionsToSlow, comptonEdge, criticalLayer,
  criticalRod, energyFromSpeed, extrapolateCritical, gramsOf, irradiate, kOfRod, kPile, massFromRatio, meanLoss, neutralFromRecoils,
  photonForRecoil, plateau, recoilMax, recoilRatio, speedFromRecoil, stepCount, transferAtAngle, transferMax, xi, type Chain,
} from '../src/labs/npyat/physics';
import { chadwickTask, invMTask } from '../src/labs/npyat/tasks';
import { mulberry32 } from '../src/lib/rng';

const near = (v: number, ref: number, rel = 0.01) => expect(Math.abs(v - ref)).toBeLessThanOrEqual(Math.abs(ref) * rel + 1e-12);

describe('урок 9: масса нейтрона по Чедвику', () => {
  it('u_max = 2mv/(m + M): равные массы — вся скорость, тяжёлое ядро — почти ничего', () => {
    expect(recoilMax(1, 1, 3)).toBe(3);
    near(recoilMax(1, 208, 1), 2 / 209, 1e-12);
  });
  it('отношение 7.0 даёт m ≈ 1.15 а.е.м., обратная функция сходится', () => {
    near(massFromRatio(7.0), 1.15, 0.02);
    near(recoilRatio(1.15), 7.0, 0.01);
    for (const m of [0.3, 1, 2.5, 4.9]) near(massFromRatio(recoilRatio(m)), m, 1e-12);
  });
  it('скорости Чедвика 3.3·10⁹ и 4.7·10⁸ см/с: m ≈ 1.16, протон отдачи ≈ 5.7 МэВ', () => {
    const r = 3.3e9 / 4.7e8;
    near(massFromRatio(r), 1.16, 0.01);
    near(energyFromSpeed(1.007, 3.3e9), 5.7, 0.01);
    // Скорость нейтрона чуть больше скорости протона отдачи: (m + 1)/2m.
    near(speedFromRecoil(3.3e9, massFromRatio(r)), 3.3e9 * 0.93, 0.01);
  });
});

describe('урок 9: гипотеза γ-квантов', () => {
  it('протон отдачи 5.7 МэВ требует кванта ≈ 54–55 МэВ', () => {
    const E = photonForRecoil(5.7, MP_MEV);
    expect(E).toBeGreaterThan(54);
    expect(E).toBeLessThan(55);
    near(comptonEdge(E, MP_MEV), 5.7, 1e-9);
  });
  it('азот отдачи 1.2 МэВ требует ≈ 90 МэВ, а квант 55 МэВ даёт азоту только ≈ 0.45 МэВ', () => {
    near(photonForRecoil(1.2, MN14_MEV), 89, 0.02);
    near(comptonEdge(photonForRecoil(5.7, MP_MEV), MN14_MEV), 0.45, 0.03);
  });
  it('нейтральная частица по двум энергиям отдачи: обратная задача сходится', () => {
    for (const m of [0.8, 1, 1.3]) {
      const T = 6;
      const TH = transferMax(m, 1) * T, TN = transferMax(m, 14) * T;
      const n = neutralFromRecoils(TH, TN);
      near(n.m, m, 1e-9); near(n.T, T, 1e-9);
    }
    // По скоростям Чедвика — снова масса около протонной.
    const fit = neutralFromRecoils(energyFromSpeed(1, 3.3e9), energyFromSpeed(14, 4.7e8));
    near(fit.m, 1.16, 0.01);
  });
});

describe('урок 9: упругое соударение', () => {
  it('доля энергии при лобовом ударе: H — 1, C ≈ 0.28, Pb ≈ 0.019', () => {
    near(transferMax(1, 1), 1, 1e-12);
    near(transferMax(1, 2), 8 / 9, 1e-12);
    near(transferMax(1, 12), 0.284, 0.005);
    near(transferMax(1, 14), 0.249, 0.005);
    near(transferMax(1, 208), 0.0191, 0.01);
  });
  it('удар шаров сохраняет импульс и энергию; доля = 4mM/(m + M)²·cos²φ', () => {
    for (const M of [1, 2, 12, 208]) for (const s of [0, 0.3, 0.7, 0.95]) {
      const c = collide(1, M, s);
      near(c.neutron[0] + M * c.nucleus[0], 1, 1e-9);
      expect(Math.abs(c.neutron[1] + M * c.nucleus[1])).toBeLessThan(1e-9);
      near(c.neutron[0] ** 2 + c.neutron[1] ** 2 + M * (c.nucleus[0] ** 2 + c.nucleus[1] ** 2), 1, 1e-9);
      near(c.fraction, transferAtAngle(1, M, c.phi), 1e-9);
    }
    // Нейтрон и протон разлетаются под прямым углом.
    const h = collide(1, 1, 0.5);
    near(h.psi + h.phi, Math.PI / 2, 1e-9);
  });
  it('замедлители: ξ и число соударений до тепловой энергии', () => {
    expect(alphaA(1)).toBe(0);
    near(meanLoss(12), 0.142, 0.01);
    near(xi(12), 0.158, 0.01);
    near(collisionsToSlow(1), 18.2, 0.01);
    near(collisionsToSlow(12), 115, 0.02);
    expect(collisionsToSlow(208)).toBeGreaterThan(1500);
  });
});

describe('урок 19: пуск CP-1', () => {
  it('k(p): 0.960 при вставленном стержне, 1.0006 при выдвинутом, критика ≈ 99 %', () => {
    near(kOfRod(0), 0.96, 1e-12);
    near(kOfRod(100), 1.0006, 1e-12);
    near(kOfRod(criticalRod()), 1, 1e-12);
    expect(criticalRod()).toBeGreaterThan(98);
    expect(criticalRod()).toBeLessThan(100);
  });
  it('счёт выходит на плато Sℓ/(1 − k), точный шаг не зависит от длины шага', () => {
    let N = 0;
    for (let i = 0; i < 2000; i++) N = stepCount(N, 0.96, 0.05);
    near(N, plateau(0.96), 1e-6);
    near(plateau(0.96), 5, 1e-12);
    // Один шаг 10 с = сто шагов по 0.1 с.
    let a = 3;
    for (let i = 0; i < 100; i++) a = stepCount(a, 0.99, 0.1);
    near(stepCount(3, 0.99, 10), a, 1e-9);
    // Надкритика: рост с периодом ℓ/(k − 1).
    const big = 1e6;
    near(stepCount(big, 1.0006, 0.1 / 0.0006) / big, Math.E, 1e-3);
  });
  it('1/M по двум точкам: прямая к нулю', () => {
    const inv = (p: number) => (1 - kOfRod(p)) / (1 - kOfRod(0));
    const pc = extrapolateCritical([[60, inv(60)], [90, inv(90)]]);
    expect(pc).not.toBeNull();
    // Кривая 1/M выпуклая вниз — прямая по двум точкам проскакивает чуть дальше настоящей критики.
    expect(pc!).toBeGreaterThan(criticalRod());
    expect(pc! - criticalRod()).toBeLessThan(5);
    near(extrapolateCritical([[0, 1], [50, 0.5]])!, 100, 1e-12);
    expect(extrapolateCritical([[0, 1]])).toBeNull();
    expect(extrapolateCritical([[0, 0.5], [50, 0.6]])).toBeNull();
  });
});

describe('урок 19: цепочка ²³⁹U → ²³⁹Np → ²³⁹Pu', () => {
  const sum = (c: Chain) => c.u + c.np + c.pu;
  /** Независимая проверка — численное интегрирование RK4. */
  function rk4(n0: Chain, R: number, t: number, steps = 20000): Chain {
    const f = (c: Chain): Chain => ({ u: R - LAMBDA_U * c.u, np: LAMBDA_U * c.u - LAMBDA_NP * c.np, pu: LAMBDA_NP * c.np });
    const add = (a: Chain, b: Chain, k: number): Chain => ({ u: a.u + k * b.u, np: a.np + k * b.np, pu: a.pu + k * b.pu });
    let c = n0;
    const h = t / steps;
    for (let i = 0; i < steps; i++) {
      const k1 = f(c), k2 = f(add(c, k1, h / 2)), k3 = f(add(c, k2, h / 2)), k4 = f(add(c, k3, h));
      c = { u: c.u + (h / 6) * (k1.u + 2 * k2.u + 2 * k3.u + k4.u), np: c.np + (h / 6) * (k1.np + 2 * k2.np + 2 * k3.np + k4.np), pu: c.pu + (h / 6) * (k1.pu + 2 * k2.pu + 2 * k3.pu + k4.pu) };
    }
    return c;
  }

  it('без захвата сумма ядер сохраняется', () => {
    const n0 = { u: 5, np: 3, pu: 1 };
    for (const t of [0, 0.01, 0.5, 3, 20]) near(sum(bateman(n0, 0, t)), 9, 1e-12);
  });
  it('с захватом сумма растёт как R·t', () => {
    for (const t of [0.1, 1, 10, 60]) near(sum(bateman({ u: 0, np: 0, pu: 0 }, 7, t)), 7 * t, 1e-9);
  });
  it('аналитика совпадает с RK4', () => {
    const n0 = { u: 2, np: 1, pu: 0.5 };
    for (const [R, t] of [[0, 4], [3, 2], [3, 15]] as const) {
      const a = bateman(n0, R, t), b = rk4(n0, R, t);
      near(a.u, b.u, 1e-6); near(a.np, b.np, 1e-6); near(a.pu, b.pu, 1e-6);
    }
  });
  it('после останова Pu прибывает ещё неделю: за 7 сут — 87 % запаса Np', () => {
    const { stop } = irradiate(1, 30, 0);
    near(stop.u, 1 / LAMBDA_U, 1e-6);
    near(stop.np, 1 / LAMBDA_NP, 0.01);
    const week = chainAt(1, 30, 37);
    near((week.pu - stop.pu) / stop.np, 1 - Math.exp(-LAMBDA_NP * 7), 0.01);
    near(week.pu - stop.pu, 0.87 * stop.np, 0.02);
  });
  it('≈ 1 г Pu на МВт·сут', () => {
    near(gramsOf(CAPTURES_PER_MWD), 0.99, 0.01);
  });
});

describe('урок 19: оценка k кладки', () => {
  it('57 слоёв без кадмия — 1.0006, с кадмием — 0.960, как в лаборатории пуска', () => {
    near(kPile(57), 1.0006, 1e-9);
    near(kPile(57, true), kOfRod(0), 1e-9);
  });
  it('k растёт со слоями; критика — на 55–57 слое', () => {
    for (let n = 2; n <= 70; n++) expect(kPile(n)).toBeGreaterThan(kPile(n - 1));
    const c = criticalLayer();
    expect(c).toBeGreaterThanOrEqual(55);
    expect(c).toBeLessThanOrEqual(57);
    expect(kPile(30)).toBeLessThan(0.98);
    expect(kPile(5)).toBeLessThan(0.8);
  });
});

describe('тренажёры', () => {
  it('Чедвик: ответ из округлённых данных, отличается от загаданного не больше чем на 5 %', () => {
    for (let s = 1; s <= 300; s++) {
      const t = chadwickTask(mulberry32(s));
      near(massFromRatio(t.u1 / t.u2, t.M1, t.M2), t.answer, 1e-9);
      expect(t.answer).toBeGreaterThan(0.3);
      expect(Math.abs(t.answer - t.mTrue) / t.mTrue).toBeLessThan(0.05);
    }
  });
  it('1/M: прогноз по последним двум точкам из счётов', () => {
    for (let s = 1; s <= 300; s++) {
      const t = invMTask(mulberry32(s));
      const pts = t.positions.map((p, i) => [p, t.counts[0]! / t.counts[i]!] as const);
      near(extrapolateCritical(pts)!, t.answer, 1e-9);
      expect(t.answer).toBeGreaterThan(t.positions[t.positions.length - 1]!);
      expect(Math.abs(t.answer - t.critical)).toBeLessThan(0.05 * t.critical);
    }
  });
});
