/** Урок 1: нейтрон как частица и как волна. Энергия — в эВ, длины — в см. */

/** Скорость нейтрона, см/с: V ≈ 1.383·10⁶·√E. */
export const speed = (E: number) => 1.3832e6 * Math.sqrt(E);

/** Приведённая длина волны де Бройля, см: ƛ = ħ/√(2mE) ≈ 4.55·10⁻¹⁰/√E. */
export const reducedWavelength = (E: number) => 4.5516e-10 / Math.sqrt(E);

/** Радиус ядра, см: R ≈ 1.4·10⁻¹³·A^{1/3}. */
export const nuclearRadius = (A: number) => 1.4e-13 * Math.cbrt(A);

/** Характерное расстояние между ядрами в среде, см. */
export const INTERNUCLEAR = 1e-8;

/** Классы нейтронов по энергии (§1.2, границы условные). */
export const ENERGY_CLASSES = [
  { upTo: 1e-7, name: 'ультрахолодный' },
  { upTo: 1e-3, name: 'холодный' },
  { upTo: 1, name: 'тепловой' },
  { upTo: 1e5, name: 'промежуточный' },
  { upTo: 5e7, name: 'быстрый' },
  { upTo: Infinity, name: 'сверхбыстрый' },
] as const;

export const energyClass = (E: number) => ENERGY_CLASSES.find((c) => E < c.upTo)!.name;

export type Tone = 'ok' | 'warn' | 'bad';

/**
 * Волна или частица. Для акта взаимодействия ƛ сравнивают с радиусом ядра,
 * для описания поля в среде — с расстоянием между ядрами.
 * «Сравнима» — в пределах порядка: от 0.1 до 1 радиуса ядра и от 0.1 до 10 межъядерных расстояний.
 * Так быстрый нейтрон 2 МэВ (ƛ ≈ 0.4 R) остаётся волной для ядра, как в задаче Б1,
 * а тепловой 0.001 эВ (ƛ ≈ 1.4·10⁻⁸ см) попадает в область, где точечная модель под вопросом.
 */
export function waveOrParticle(E: number, A: number): { interaction: string; field: string; tone: Tone } {
  const lam = reducedWavelength(E);
  const R = nuclearRadius(A);
  const interaction = lam >= R
    ? 'Для ядра ƛ ≥ R: во взаимодействии нейтрон — волна (модель составного ядра).'
    : lam >= 0.1 * R
      ? 'Для ядра ƛ сравнима с R: волновые свойства во взаимодействии существенны.'
      : 'Для ядра ƛ ≪ R: длина волны много меньше ядра (энергии выше десятков МэВ).';
  if (lam < 0.1 * INTERNUCLEAR) return { interaction, field: 'В среде ƛ ≪ 10⁻⁸ см: между столкновениями нейтрон — точечная частица.', tone: 'ok' };
  if (lam < 10 * INTERNUCLEAR) return { interaction, field: 'В среде ƛ сравнима с межъядерным расстоянием: волновые эффекты заметны (область термализации).', tone: 'warn' };
  return { interaction, field: 'В среде ƛ много больше межъядерного расстояния: нужна волновая картина (холодные нейтроны).', tone: 'bad' };
}
