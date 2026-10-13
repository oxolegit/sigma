export type Rng = () => number;

/** Генератор с зерном (mulberry32): равномерно на [0, 1).
 *  Зерно делает Монте-Карло воспроизводимым — в тестах и при «Новой истории». */
export function mulberry32(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Изотропное направление: μ = cos θ равномерно на [−1, 1], φ — на [0, 2π). */
export function isotropic(rng: Rng): [number, number, number] {
  const mu = 2 * rng() - 1;
  const phi = 2 * Math.PI * rng();
  const s = Math.sqrt(1 - mu * mu);
  return [mu, s * Math.cos(phi), s * Math.sin(phi)];
}
