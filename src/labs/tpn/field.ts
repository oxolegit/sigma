/** Урок 5: поток и ток. Направления в плоскости — в градусах от оси x против часовой стрелки. */

export interface Beam { angle: number; intensity: number }

/** Пресеты: пример из конспекта (вниз, влево и под 45° вправо-вверх), встречные пучки, один пучок. */
export const PRESETS = {
  notes: [{ angle: 270, intensity: 1 }, { angle: 180, intensity: 1 }, { angle: 45, intensity: 3 }],
  opposite: [{ angle: 0, intensity: 1 }, { angle: 180, intensity: 1 }, { angle: 90, intensity: 0 }],
  single: [{ angle: 30, intensity: 2 }, { angle: 180, intensity: 0 }, { angle: 90, intensity: 0 }],
} as const satisfies Record<string, readonly Beam[]>;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Поток, односторонние и полный токи через площадку с нормалью под углом normal и вектор тока.
 * Каждый пучок даёт в поток Φ_k, в ток — Φ_k(Ω_k·n): в i⁺, если косинус положителен, в i⁻ — если отрицателен.
 */
export function beamField(beams: readonly Beam[], normal: number) {
  const nx = Math.cos(rad(normal)), ny = Math.sin(rad(normal));
  let flux = 0, plus = 0, minus = 0, ix = 0, iy = 0;
  for (const { angle, intensity } of beams) {
    const ox = Math.cos(rad(angle)), oy = Math.sin(rad(angle));
    const c = ox * nx + oy * ny;
    flux += intensity;
    ix += intensity * ox;
    iy += intensity * oy;
    if (c > 1e-9) plus += intensity * c;
    else if (c < -1e-9) minus -= intensity * c;
  }
  const magnitude = Math.hypot(ix, iy);
  const direction = ((Math.atan2(iy, ix) * 180) / Math.PI + 360) % 360;
  return { flux, plus, minus, net: plus - minus, ix, iy, magnitude, direction };
}

/* ---------- Линейно-анизотропное поле Φ(Ω) = Φ/4π · (1 + 3 b (Ω·e_i)), b = |i|/Φ ---------- */

/** Относительная длина луча полярной диаграммы в направлении под углом θ к току: 1 + 3b cos θ. */
export const angularShape = (b: number, cosTheta: number) => 1 + 3 * b * cosTheta;

/** Угловой поток неотрицателен во всех направлениях, только если |b| ≤ 1/3. */
export const physical = (b: number) => Math.abs(b) <= 1 / 3 + 1e-12;

/** Односторонние токи в долях Φ через площадку, нормаль которой образует с током угол с косинусом cosGamma. */
export function oneSided(b: number, cosGamma = 1) {
  return { plus: 0.25 + (b * cosGamma) / 2, minus: 0.25 - (b * cosGamma) / 2, net: b * cosGamma };
}

/** Единичный вектор по полярному углу θ от вертикали (ось y сцены вверх) и азимуту φ. */
export function direction(thetaDeg: number, phiDeg: number): [number, number, number] {
  const t = rad(thetaDeg), p = rad(phiDeg);
  return [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)];
}

export const dot = (a: readonly number[], b: readonly number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
