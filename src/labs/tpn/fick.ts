import { sci } from '../../lib/format';
import type { Tone } from './neutron';

/** Урок 7: закон Фика — транспортное сечение, односторонние токи, условия применимости. */

/** Средний косинус угла рассеяния в лабораторной системе: μ̄ = 2/(3A). */
export const muBar = (A: number) => 2 / (3 * A);

/** Транспортное сечение Σtr = Σa + Σs(1 − μ̄) и коэффициент диффузии D = 1/(3Σtr). */
export function diffusion(sigmaS: number, sigmaA: number, A: number) {
  const sigmaTr = sigmaA + sigmaS * (1 - muBar(A));
  return { sigmaTr, lambdaTr: 1 / sigmaTr, D: 1 / (3 * sigmaTr) };
}

/**
 * Односторонние токи по Фику (2.5) в долях Φ при относительном градиенте s = λtr·Φ′/Φ:
 * i± = 1/4 ∓ s/6, полный ток i_z = −s/3. При |s| > 1.5 один из односторонних токов отрицателен.
 */
export function fickCurrents(s: number) {
  return { plus: 0.25 - s / 6, minus: 0.25 + s / 6, net: -s / 3 };
}

export interface Condition { tone: Tone; text: string }

/** Проверка условий закона Фика: массовое число, поглощение, расстояние до неоднородности, градиент. */
export function fickConditions(A: number, absorptionRatio: number, distance: number, s: number): { items: Condition[]; tone: Tone } {
  const mu = muBar(A);
  const ratio = sci(absorptionRatio, 2);
  const items: Condition[] = [
    A >= 10
      ? { tone: 'ok', text: `Тяжёлые ядра, A = ${A}: μ̄ = ${mu.toFixed(3)}, рассеяние почти изотропно в лабораторной системе.` }
      : A >= 4
        ? { tone: 'warn', text: `A = ${A}: μ̄ = ${mu.toFixed(3)}, анизотропия заметна — нужен Σtr вместо Σt.` }
        : { tone: 'bad', text: `A = ${A}: μ̄ = ${mu.toFixed(3)}, сильная анизотропия (у водорода μ̄ = 2/3) — простая диффузия плоха.` },
    absorptionRatio <= 0.03
      ? { tone: 'ok', text: `Слабое поглощение: Σa/Σs = ${ratio}.` }
      : absorptionRatio <= 0.2
        ? { tone: 'warn', text: `Σa/Σs = ${ratio}: поглощение уже не мало, точность падает.` }
        : { tone: 'bad', text: `Σa/Σs = ${ratio}: поглощение сравнимо с рассеянием — Фик неприменим.` },
    distance >= 3
      ? { tone: 'ok', text: `До неоднородности ${distance.toFixed(1)} λ.` }
      : distance >= 2
        ? { tone: 'warn', text: `До неоднородности ${distance.toFixed(1)} λ — граничная зона.` }
        : { tone: 'bad', text: `До неоднородности ${distance.toFixed(1)} λ — слишком близко к источнику или границе.` },
    Math.abs(s) <= 0.5
      ? { tone: 'ok', text: `Градиент s = ${s.toFixed(2)}: поток меняется плавно.` }
      : Math.abs(s) < 1.5
        ? { tone: 'warn', text: `Градиент s = ${s.toFixed(2)}: анизотропия заметна.` }
        : { tone: 'bad', text: `Градиент s = ${s.toFixed(2)}: односторонний ток отрицателен — диффузия ломается.` },
  ];
  const tone: Tone = items.some((i) => i.tone === 'bad') ? 'bad' : items.some((i) => i.tone === 'warn') ? 'warn' : 'ok';
  return { items, tone };
}
