const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Показатель степени надстрочными цифрами: -9 → ⁻⁹. */
export const sup = (n: number | string) => String(n).split('').map((ch) => SUP[ch] ?? ch).join('');

/**
 * Число с p значащими цифрами: обычной записью при 10⁻² ≤ |v| < 10⁵,
 * иначе научной — «2.86·10⁻⁹». Десятичный разделитель — точка, как в TeX.
 */
export function sci(v: number, p = 3): string {
  if (v === 0) return '0';
  if (!Number.isFinite(v)) return '—';
  let e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 4) return v.toFixed(Math.min(Math.max(0, p - 1 - e), 6));
  let m = v / 10 ** e;
  // Округление мантиссы может дать 10.0 — переносим в порядок.
  if (Math.abs(Number(m.toFixed(p - 1))) >= 10) { m /= 10; e += 1; }
  return `${m.toFixed(p - 1)}·10${sup(e)}`;
}

/** Энергия в подходящих единицах: 0.0253 эВ, 6.67 кэВ, 2.00 МэВ. */
export function energy(E: number, p = 3): string {
  if (E >= 1e6) return `${sci(E / 1e6, p)} МэВ`;
  if (E >= 1e3) return `${sci(E / 1e3, p)} кэВ`;
  return `${sci(E, p)} эВ`;
}

/** Доля в процентах: 0.3412 → «34.1 %». */
export const percent = (x: number, d = 1) => `${(100 * x).toFixed(d)} %`;
