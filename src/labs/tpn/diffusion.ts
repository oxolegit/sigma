import { isotropic, type Rng } from '../../lib/rng';
import { sampleFreePath } from './freePath';

/** Урок 8: уравнение диффузии в бесконечной среде и граничные условия. Длины — в см. */

/** Модифицированная функция Бесселя I₀ (полиномиальная аппроксимация, Абрамовиц — Стиган 9.8.1). */
function besselI0(x: number): number {
  const t2 = (x / 3.75) ** 2;
  return 1 + t2 * (3.5156229 + t2 * (3.0899424 + t2 * (1.2067492 + t2 * (0.2659732 + t2 * (0.0360768 + t2 * 0.0045813)))));
}

/** Модифицированная функция Бесселя K₀ (Абрамовиц — Стиган 9.8.5–9.8.6), точность ~10⁻⁷. */
export function besselK0(x: number): number {
  if (x <= 2) {
    const y = (x * x) / 4;
    return -Math.log(x / 2) * besselI0(x) + (-0.57721566 + y * (0.4227842 + y * (0.23069756 + y * (0.0348859 + y * (0.00262698 + y * (0.0001075 + y * 0.0000074))))));
  }
  const y = 2 / x;
  return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + y * (-0.07832358 + y * (0.02189568 + y * (-0.01062446 + y * (0.00587872 + y * (-0.0025154 + y * 0.00053208))))));
}

/** Моноэнергетическая среда: Σt = Σs + Σa, D = 1/(3Σt), L² = D/Σa. */
export function medium(sigmaS: number, sigmaA: number) {
  const sigmaT = sigmaS + sigmaA;
  const D = 1 / (3 * sigmaT);
  return { sigmaT, D, L: Math.sqrt(D / sigmaA) };
}

export type Geometry = 'point' | 'plane' | 'line';

/** Поток от источника мощности q в бесконечной среде: точечный, плоский, нитевидный. */
export function sourceFlux(geometry: Geometry, r: number, q: number, D: number, L: number): number {
  switch (geometry) {
    case 'point': return (q / (4 * Math.PI * D)) * (Math.exp(-r / L) / r);
    case 'plane': return ((q * L) / (2 * D)) * Math.exp(-Math.abs(r) / L);
    case 'line': return (q / (2 * Math.PI * D)) * besselK0(r / L);
  }
}

/** Случайное блуждание из начала координат до поглощения: средний квадрат смещения и число столкновений. */
export function randomWalk(sigmaS: number, sigmaA: number, histories: number, rng: Rng, keepPaths = 0) {
  const sigmaT = sigmaS + sigmaA;
  const pAbsorb = sigmaA / sigmaT;
  let r2 = 0, collisions = 0;
  const paths: [number, number][][] = [];
  const ends: [number, number][] = [];
  for (let h = 0; h < histories; h++) {
    let x = 0, y = 0, z = 0, c = 0;
    const path: [number, number][] | null = h < keepPaths ? [[0, 0]] : null;
    for (;;) {
      const l = sampleFreePath(sigmaT, rng);
      const [ux, uy, uz] = isotropic(rng);
      x += l * ux; y += l * uy; z += l * uz;
      c++;
      path?.push([x, y]);
      if (rng() < pAbsorb || c > 200_000) break;
    }
    r2 += x * x + y * y + z * z;
    collisions += c;
    if (path) paths.push(path);
    if (h < 400) ends.push([x, y]);
  }
  return { r2: r2 / histories, collisions: collisions / histories, paths, ends };
}

/** Точный средний квадрат смещения для изотропного рассеяния: 2/(Σa·Σt) — совпадает с 6L² при D = 1/(3Σt). */
export const exactR2 = (sigmaS: number, sigmaA: number) => 2 / (sigmaA * (sigmaS + sigmaA));

/** Пластина толщиной a с вакуумом по обе стороны: основная гармоника cos(πx/ã), ã = a + 2d. */
export function slabHarmonic(a: number, d: number) {
  const at = a + 2 * d;
  return {
    at,
    /** Отношение геометрического параметра B² = (π/ã)² к случаю d = 0. */
    leakageRatio: (a / at) ** 2,
    flux: (x: number) => Math.cos((Math.PI * x) / at),
  };
}
