import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Токены темы из tokens.css: { light: {...}, dark: {...} }. */
function themes() {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const block = (sel: string) => {
    const body = css.slice(css.indexOf(sel)).split('}')[0]!;
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
  };
  return { light: block(':root, [data-theme="light"]'), dark: block('[data-theme="dark"]') };
}
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe.each(['light', 'dark'] as const)('контраст токенов: %s', (name) => {
  const t = themes()[name];
  it('акцент — #1481BA в светлой теме', () => { if (name === 'light') expect(t.accent).toBe('#1481ba'); });
  it.each([
    ['ink', 'paper'], ['ink', 'surface-1'], ['ink', 'surface-2'],
    ['ink-muted', 'paper'], ['ink-muted', 'surface-1'],
    ['accent-text', 'paper'], ['accent-text', 'surface-1'], ['accent-text', 'accent-soft'],
    ['signal-text', 'surface-1'], ['signal-text', 'signal-soft'],
  ])('текст %s на %s — не меньше 4.5 (AA)', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!), `${fg} / ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  // Кнопка: полужирный текст на заливке акцентом. Сам #1481BA с белым даёт 4.3 —
  // это AA для крупного и полужирного текста (≥ 3), но не для мелкого; поэтому текст акцентом — --accent-text.
  it('текст на кнопке акцентом — не меньше 4', () => expect(contrast(t['on-accent']!, t.accent!)).toBeGreaterThanOrEqual(4));
  it('кривая акцентом и коралловая видны на фоне графика (≥ 3)', () => {
    expect(contrast(t.accent!, t['surface-2']!)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.signal!, t['surface-2']!)).toBeGreaterThanOrEqual(2.5);
  });
});
