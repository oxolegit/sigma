import { describe, expect, it } from 'vitest';
import {
  AMU, E2, HBARC, HBARC_ROUND, K_BETHE, MATERIALS, ME, MN, MP, PARTICLES, alphaEnergyFromAir, alphaRange, alphaRangeAir, betaAbsorption,
  betaClassic, bethe, betheRange, binding, cmEnergy, coulombEnergy, criticalEnergy, deformation, electronEnergyFromAl, electronRange,
  fermiGas, fissionQ, fissionZ2A, instabilityZ2A, intrinsicQ, kin, levelLabel, mirrorRadius, pcFromRigidity, protonRangeAir, radLength,
  radToIon, radius, reactionQ, recoilElectron, relativeVelocity, rMinHeadOn, rutherfordDSigma, rutherfordFraction, sepAlpha, sepN, sepP,
  shellModel, symmetricGammaAngle, thresholdT, twoBody, weizsacker, zOpt,
} from '../src/labs/nuclear/physics';

/** Совпадение с ответом сборника с относительной точностью rel. */
const near = (v: number, ref: number, rel = 0.01) => expect(Math.abs(v - ref)).toBeLessThanOrEqual(Math.abs(ref) * rel + 1e-12);
const deg = Math.PI / 180;
const { mu, pi, pi0, K, alpha } = PARTICLES;

describe('глава 1: кинематика', () => {
  it('1.2, 1.13: энергии покоя и ħc', () => {
    near((1.674927351e-27 * 299792458 ** 2) / 1.6021766208e-13, 939.6, 1e-4);
    near((9.10938356e-31 * 299792458 ** 2) / 1.6021766208e-13, 0.511, 1e-3);
    near(HBARC, 197.33, 1e-4);
  });
  it('1.5, 1.6: протон 2.9·10⁸ м/с, электрон 3 МэВ', () => {
    const p = kin(MP, 'beta', 2.9e8 / 299792458);
    near(p.E, 3700, 0.002); near(p.T, 2760, 0.002); near(p.pc, 3580, 0.002);
    near(kin(ME, 'T', 3).beta * 299792458, 2.97e8, 0.002);
  });
  it('1.7–1.10: распады покоящихся частиц', () => {
    const a = twoBody(pi.m, mu.m, 0);
    near(a.T1, 4.1, 0.01);
    // В сборнике 29.6; сумма должна быть m_π − m_μ = 33.9 → 29.8.
    near(a.T2, 29.8, 0.002);
    near(twoBody(pi0.m, ME, ME).T1, 66.98, 1e-3);
    const k = twoBody(K.m, ME, 0);
    near(k.T1, 246.3, 1e-3); near(k.T2, 246.8, 1e-3);
    const kp = twoBody(K.m, pi.m, pi0.m);
    near(kp.T1, 108.54, 1e-3); near(kp.T2, 110.58, 1e-3);
  });
  it('1.11, 1.12: π⁰ на лету — 60°; время жизни ×11', () => {
    near(symmetricGammaAngle(pi0.m, pi0.m), 60, 1e-9);
    near(kin(pi.m, 'T', 10 * pi.m).gamma, 11, 1e-12);
  });
  it('1.14–1.17: де Бройль', () => {
    const t = (m: number) => 10 / (kin(m, 'lambdaBar', 100).beta * 299792458);
    near(t(MP), 1.59e-5, 0.005); near(t(ME), 3.45e-8, 0.005); near(10 / 299792458, 3.33e-8, 0.002);
    near(kin(ME, 'T', 1000).lambdaBar, 0.2, 0.02);
    // Ответ 1.16 посчитан с ħc = 200 МэВ·фм.
    near(kin(ME, 'T', 0.01, HBARC_ROUND).lambdaBar, 1969, 0.002);
    near(kin(ME, 'T', 1, HBARC_ROUND).lambdaBar, 141, 0.005);
    const p = kin(MP, 'lambdaBar', 0.01, HBARC_ROUND);
    near(p.E, 20000, 0.01); near(p.T, 19000, 0.01);
  });
  it('1.18, 1.19: скорость по релятивистской и классической формулам', () => {
    const cases: [number, number, number][] = [[0.005, 4.16e7, 4.19e7], [0.05, 1.24e8, 1.33e8], [0.25, 2.22e8, 2.97e8], [3, 2.97e8, 10.3e8]];
    for (const [T, vr, vc] of cases) {
      near(kin(ME, 'T', T).beta * 299792458, vr, 0.006);
      near(betaClassic(ME, T) * 299792458, vc, 0.006);
    }
    const ratios = [1.007, 1.07, 1.6, 4.5];
    [0.01, 0.1, 1, 10].forEach((k, i) => near(betaClassic(MP, k * MP) / kin(MP, 'T', k * MP).beta, ratios[i]!, 0.025));
  });
  it('1.20: энергия разгона протона', () => {
    const rel = [4.69e-2, 4.73, 145, 1214], cl = [4.69e-2, 4.69, 117, 380];
    [0.01, 0.1, 0.5, 0.9].forEach((b, i) => {
      near(kin(MP, 'beta', b).T, rel[i]!, 0.005);
      near((MP * b * b) / 2, cl[i]!, 0.005);
    });
  });
  it('1.21, 1.22, 1.26: ГЗК-предел, импульс позитрона, скорость спутников', () => {
    const J = 5e19 * 1.6021766208e-19;
    near(Math.sqrt((2 * J) / 3.4e-3), 68.6, 0.003);
    near(Math.sqrt((2 * J) / 2.5e-3), 80, 0.003);
    const pc = pcFromRigidity(0.044, 0.1);
    near(pc, 1.32, 0.002); near(kin(ME, 'pc', pc).T, 0.9, 0.01);
    const c = 299792458;
    near(relativeVelocity(c - 1, c - 2, c), c / 3, 1e-6);
  });
  it('1.27: протон 10¹⁷ эВ на ¹⁴N — 51 ТэВ (в сборнике 53)', () => {
    const mN = 14.003074 * AMU - 7 * ME;
    const E = cmEnergy(1e11, MP, mN);
    near(E, 5.11e7, 0.003);
  });
  it('1.28: пороги реакций', () => {
    near(thresholdT(0, ME, 3 * ME), 4 * ME, 1e-12);
    near(thresholdT(0, 1e5, 2 * ME + 1e5), 2 * ME, 1e-4);
    near(thresholdT(MP, MP, 4 * MP), 6 * MP, 1e-12);
    // e⁻ + p → n + ν: полная энергия электрона 1.294 МэВ, кинетическая 0.783.
    near(thresholdT(ME, MP, MN), 0.783, 0.003);
    // е) α + ⁷Li → ¹⁰B + n: Q = −2.79 МэВ, порог ≈ |Q|(1 + mα/m_Li).
    near(-reactionQ([[4, 2], [7, 3]], [[10, 5], [1, 0]]), 2.79, 0.003);
  });
});

describe('глава 2: свойства ядер', () => {
  it('2.1–2.5: плотность, заряд, концентрация, а.е.м.', () => {
    const V = (4 / 3) * Math.PI * (1.4e-13) ** 3;
    near(1.6605e-24 / V, 1.45e14, 0.01);
    near((0.5 * 1.602e-19) / V, 7e18, 0.01);
    near(1 / V, 8.7e37, 0.01);
    near(Math.cbrt(V) * 1e13, 2.26, 0.01);
    near(AMU, 931.5, 1e-4);
  });
  it('2.7: энергии связи и на нуклон', () => {
    const W: [number, number, number, number][] = [[4, 2, 28.3, 7.07], [5, 2, 27.6, 5.51], [9, 5, 56.3, 6.26], [12, 6, 92.16, 7.68], [27, 13, 224.95, 8.33], [56, 26, 492.26, 8.79], [107, 47, 915.27, 8.55], [236, 92, 1790.4, 7.59]];
    for (const [A, Z, w, e] of W) { near(binding(A, Z), w, 0.002); near(binding(A, Z) / A, e, 0.002); }
  });
  it('2.8–2.10: энергии отделения нейтрона, протона, α', () => {
    const nuc: [number, number][] = [[4, 2], [5, 2], [9, 5], [12, 6], [27, 13], [56, 26], [107, 47], [236, 92]];
    const en = [20.6, -0.74, 18.6, 18.7, 13.1, 11.2, 9.5, 6.5];
    const ep = [19.8, 20.7, -0.19, 16, 8.3, 10.2, 5.8, 7.1];
    nuc.forEach(([A, Z], i) => { near(sepN(A, Z), en[i]!, 0.02); near(sepP(A, Z), ep[i]!, 0.03); });
    const ea: [number, number, number][] = [[12, 6, 7.4], [27, 13, 10.1], [56, 26, 7.6], [107, 47, 2.8], [236, 92, -4.6], [210, 84, -5.4], [226, 88, -4.9]];
    for (const [A, Z, v] of ea) near(sepAlpha(A, Z), v, 0.02);
  });
  it('2.11–2.15: деление, развал, возбуждение', () => {
    const Q = reactionQ([[236, 92]], [[143, 56], [90, 36], [1, 0], [1, 0], [1, 0]]);
    near(Q, 167.13, 1e-3);
    const perKg = (1000 / 236) * 6.022140857e23 * Q;
    near(perKg, 4.26e26, 0.003);
    near((perKg * 1.6021766208e-13) / 34e6, 2e6, 0.01);
    near(-reactionQ([[16, 8]], [[8, 4], [8, 4]]), 14.6, 0.003);
    near(-reactionQ([[8, 4]], [[4, 2], [4, 2]]), -0.09, 0.03);
    near(-reactionQ([[12, 6]], [[4, 2], [4, 2], [4, 2]]), 7.27, 0.002);
    near(reactionQ([[235, 92], [1, 0]], [[236, 92]]), 6.5, 0.01);
    near(reactionQ([[6, 3], [1, 0]], [[7, 3]]), 7.25, 0.01);
  });
  it('2.16–2.19: разрешение, радиус Ca, зеркальные ядра, pp-цикл', () => {
    near(kin(alpha.m, 'T', 5, HBARC_ROUND).lambda, 6.5, 0.01);
    const lb = kin(ME, 'T', 750).lambdaBar;
    const R = [18, 31, 48].map((t, i) => ((i + 1) * 2 * Math.PI * lb * 0.61) / Math.sin(t * deg));
    near(R[0]!, 3.3, 0.02); near(R[2]!, 4.1, 0.02);
    near(E2 / (binding(3, 1) - binding(3, 2)), 1.9, 0.02);
    near(reactionQ([[1, 1], [1, 1]], [[2, 1]]) - 2 * ME, 0.42, 0.01);
    near(reactionQ([[2, 1], [1, 1]], [[3, 2]]), 5.49, 0.002);
    near(reactionQ([[3, 2], [3, 2]], [[4, 2], [1, 1], [1, 1]]), 12.86, 0.002);
  });
});

describe('глава 3: модели ядер', () => {
  it('3.1–3.3: β-стабильность', () => {
    near(zOpt(116), 116 / (0.015 * 116 ** (2 / 3) + 1.973), 0.002);
    expect([20, 21, 116, 117, 123, 124, 128, 129].map((A) => Math.round(zOpt(A)))).toEqual([10, 10, 50, 50, 52, 53, 54, 55]);
    // ¹⁰⁷Cd, ¹³³Xe, ¹⁴¹Ce, ¹⁶³Er: β⁺, β⁻, β⁻, β⁺.
    expect([[107, 48], [133, 54], [141, 58], [163, 68]].map(([A, Z]) => (Z! > zOpt(A!) ? '+' : '-'))).toEqual(['+', '-', '-', '+']);
  });
  it('3.5–3.7: деление по капельной модели', () => {
    near(fissionQ(238, 92), 194, 0.05);
    near(fissionZ2A(), 17, 0.02);
    // В сборнике ≈ 49; 2β/γ с параметрами сборника — 47.8.
    near(instabilityZ2A(), 47.8, 0.002);
  });
  it('3.8: капельная модель против таблицы', () => {
    const W: [number, number, number][] = [[4, 2, 30.2], [12, 6, 92.9], [27, 13, 228.1], [56, 26, 494.4], [107, 47, 916.4], [236, 92, 1779.5]];
    for (const [A, Z, w] of W) near(weizsacker(A, Z), w, 0.003);
  });
  it('3.9, 3.10: кулоновская энергия и радиус зеркальных ядер', () => {
    near(coulombEnergy(1, 1), 0.6 * 1.44, 0.001);
    near(binding(23, 11), 186.56, 0.001); near(binding(23, 12), 181.73, 0.001);
    near(mirrorRadius(23, 11), 4.1, 0.01);
  });
  it('3.11, 3.12: спин, чётность, μ по Шмидту', () => {
    const cases: [number, number, number, 1 | -1, number][] = [
      [3, 1, 0.5, 1, 2.793], [7, 3, 1.5, -1, 3.793], [13, 6, 0.5, -1, 0.638], [25, 12, 2.5, 1, -1.913],
      [29, 14, 0.5, 1, -1.913], [39, 19, 1.5, 1, 0.1242], [45, 21, 3.5, -1, 5.793], [63, 29, 1.5, -1, 3.793],
    ];
    for (const [A, Z, J, P, m] of cases) {
      const r = shellModel(A, Z);
      if (r.kind !== 'odd') throw new Error('ожидалось нечётное ядро');
      expect([r.J, r.P]).toEqual([J, P]);
      near(r.mu, m, 0.002);
    }
  });
  it('3.13: нечётно-нечётные ядра', () => {
    const cases: [number, number, number, number][] = [[2, 1, 0, 1], [14, 7, 0, 1], [6, 3, 0, 3], [10, 5, 0, 3], [22, 11, 0, 5], [26, 13, 0, 5]];
    for (const [A, Z, lo, hi] of cases) {
      const r = shellModel(A, Z);
      if (r.kind !== 'oddodd') throw new Error('ожидалось нечётно-нечётное');
      expect([r.Jmin, r.Jmax, r.P]).toEqual([lo, hi, 1]);
    }
    const k = shellModel(39, 19);
    expect(k.kind === 'odd' && levelLabel(k.level)).toBe('1d3/2');
  });
  it('3.15, 3.16: квадрупольные моменты', () => {
    near(intrinsicQ(-0.018, 2), -0.063, 0.01);
    near(intrinsicQ(0.33, 2.5), 0.92, 0.01);
    near(deformation(intrinsicQ(0.0585, 1.5), 19, 39), 0.09, 0.06);
    near(deformation(intrinsicQ(-0.211, 1.5), 29, 63), -0.15, 0.03);
  });
  it('3.17–3.19: ферми-газ (сборник: 32, 40 и 19 МэВ — это r₀ ≈ 1.2 фм)', () => {
    const f = fermiGas();
    near(f.pc, 214, 0.005);
    near(f.T, 24.5, 0.01);
    const g = fermiGas(1.2);
    near(g.T, 33, 0.02); near(g.U, 41, 0.02); near(g.mean, 20, 0.02);
  });
});

describe('глава 4: заряженные частицы в веществе', () => {
  it('4.2: минимальное сближение α с ядром золота', () => {
    const T = kin(alpha.m, 'beta', 2.5e7 / 299792458).T;
    near(rMinHeadOn(2, 79, T) * 1e-15, 1.7e-14, 0.04);
  });
  it('4.3–4.5: опыт Резерфорда', () => {
    const nAu = (19.3 / 196.97) * 6.022140857e23;
    const nA = nAu * 5e-4;
    const N = 2.5e5 * 120, dOmega = 0.5 / 25 ** 2;
    const counts = [15, 45, 75, 105, 135, 165].map((t) => N * nA * rutherfordDSigma(2, 79, 5.3, t * deg) * 1e-26 * dOmega);
    [2810, 38, 6, 2, 1.1, 0.8].forEach((v, i) => near(counts[i]!, v, i < 2 ? 0.01 : 0.15));
    const nAl = (2.7 / 26.98) * 6.022140857e23;
    near((nAu * 79 ** 2) / (nAl * 13 ** 2), 36, 0.01);
    const fr = [[5, 45], [45, 90], [90, 135], [135, 180]].map(([a, b]) => rutherfordFraction(2, 79, 5.3, nA, a! * deg, b! * deg));
    [0.22, 2.1e-3, 3.5e-4, 7.3e-5].forEach((v, i) => near(fr[i]!, v, 0.03));
  });
  it('4.6: электрон отдачи — 6 эВ', () => near(recoilElectron(2, alpha.m, 25, 20000) * 1e6, 6, 0.02));
  it('4.9, 4.10: протон через 10 см свинца, мюон через атмосферу', () => {
    const Pb = MATERIALS.Pb;
    const target = 10 * Pb.rho;
    let lo = 50, hi = 600;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (betheRange(m, MP, 1, Pb.Z, Pb.A, Pb.I) < target) lo = m; else hi = m; }
    // Сборник: ≈ 226 МэВ — оценка 2 МэВ/(г/см²) · 113 г/см². Интеграл по формуле Бете — около 320 МэВ.
    near(2 * target, 226, 0.001);
    near(lo, 320, 0.03);
    // Мюон: 1030 г/см² по вертикали, ~36 000 г/см² по горизонту (≈ √(πR/2H) раз больше).
    near(2 * 1030, 2000, 0.05);
    near(2 * 1030 * Math.sqrt((Math.PI * 6371) / (2 * 8)), 72000, 0.02);
  });
  it('4.11–4.15: формула (4.4)', () => {
    near(K_BETHE, 0.307075, 1e-4);
    const { Al, Pb, N, Fe, Cu } = MATERIALS;
    near(bethe(160, alpha.m, 2, Al.Z, Al.A, Al.I), 45.6, 0.01);
    near(bethe(10, mu.m, 1, Pb.Z, Pb.A, Pb.I), 3.9, 0.01);
    near(bethe(10, mu.m, 1, Pb.Z, Pb.A, Pb.I) * Pb.rho, 44.2, 0.01);
    near(bethe(10, mu.m, 1, N.Z, N.A, N.I), 7.1, 0.01);
    near(bethe(80, MP, 1, Pb.Z, Pb.A, Pb.I) / bethe(80, MP, 1, Fe.Z, Fe.A, Fe.I), 0.7, 0.02);
    near(bethe(100, alpha.m, 2, Cu.Z, Cu.A, Cu.I) / bethe(100, PARTICLES.d.m, 1, Cu.Z, Cu.A, Cu.I), 6.8, 0.01);
  });
  it('4.16–4.19: эмпирические пробеги', () => {
    near((alphaRange(7.5, 27) * 1e-3) / 2.7 * 1e4, 40.6, 0.01);
    const R = alphaRangeAir(6.5);
    near(alphaEnergyFromAir(1) / (6.5 - alphaEnergyFromAir(R - 1)), 2.5, 0.02);
    near(electronEnergyFromAl((0.13 * 8.9 * (29 / 64)) / (13 / 27)), 2.3, 0.02);
    const R0 = protonRangeAir(3);
    const T4 = alphaEnergyFromAir(R0 - 4 + 0.2) / 4;
    near(((3 - T4) * 1e6) / 35, 18300, 0.01);
  });
  it('4.20–4.27: радиационные потери', () => {
    const { N, Al, Cu, Pb, Fe, C } = MATERIALS;
    [114, 62, 28, 10].forEach((v, i) => near(criticalEnergy([N, Al, Cu, Pb][i]!.Z), v, 0.025));
    near(radLength(N.Z, N.A), 39.3, 0.003); near(radLength(N.Z, N.A) / N.rho / 100, 314, 0.003);
    near(radLength(Al.Z, Al.A), 24.4, 0.003); near(radLength(Al.Z, Al.A) / Al.rho, 9, 0.01);
    near(radLength(Cu.Z, Cu.A), 13.1, 0.003); near(radLength(Cu.Z, Cu.A) / Cu.rho, 1.5, 0.02);
    near(radLength(Pb.Z, Pb.A), 5.8, 0.005); near((radLength(Pb.Z, Pb.A) / Pb.rho) * 10, 5.2, 0.02);
    const lCu = radLength(Cu.Z, Cu.A);
    near(70 / lCu, 5.35, 0.005); near(radToIon(70, 29), 2.5, 0.02);
    near(70 / lCu + 70 / lCu / radToIon(70, 29), 7.5, 0.01);
    const T = 800 / (0.3 * 13);
    near(T, 205, 0.002); near((1.3 * T) / radLength(Al.Z, Al.A), 10.9, 0.005);
    const xFe = 0.1 * Fe.rho, lFe = radLength(Fe.Z, Fe.A);
    const lostRad = 100 * (1 - Math.exp(-xFe / lFe));
    near(100 - lostRad - lostRad / radToIon(100, Fe.Z), 93, 0.01);
    near(100 - bethe(100, MP, 1, Fe.Z, Fe.A, Fe.I) * xFe, 96, 0.005);
    near(350 * Math.exp((0.1 * Pb.rho) / radLength(Pb.Z, Pb.A)), 425, 0.005);
    near((radLength(C.Z, C.A) / C.rho) * Math.log(1300 / 1084), 3.5, 0.01);
    near(1.8 / -Math.log(0.8), 8, 0.01);
  });
  it('4.28–4.30: поглощение β-частиц', () => {
    near(electronRange(1.1, 38, 88), 0.517, 0.002);
    const T = electronEnergyFromAl(0.53 * 2.7);
    near((Math.log(5) / betaAbsorption(T, 2.7)) * 10, 1.1, 0.02);
    const mr = Math.LN2 / 0.1185;
    near(mr, 5.85, 0.002);
    near(electronRange((22 / mr) ** 0.75, 13, 27), 1.33, 0.005);
  });
});

it('ħc из констант таблицы', () => near(radius(27), 1.4 * 3, 1e-12));
it('массы частиц', () => { near(MN - MP, 1.293, 0.001); near(alpha.m, 3727.38, 1e-5); });
