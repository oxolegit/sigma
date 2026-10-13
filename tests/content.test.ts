import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? files(p) : [p];
});
const content = files('src/content').filter((p) => /\.(mdx|ya?ml)$/.test(p));

describe('исходники контента', () => {
  it('найдены', () => {
    expect(content.length).toBeGreaterThan(0);
  });

  // Табуляция в TeX — след потерянной обратной косой: «\text» превращается в TAB + «ext».
  it.each(content)('%s — без табуляции и управляющих символов', (path) => {
    const bad = readFileSync(path, 'utf8').split('\n')
      .flatMap((line, i) => (/[\t\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(line) ? [`${i + 1}: ${line.trim().slice(0, 80)}`] : []));
    expect(bad).toEqual([]);
  });

  // Кириллица в индексах формул должна быть в \text{…}: иначе KaTeX ругается и набирает её курсивом.
  it.each(content)('%s — кириллические индексы в \\text{…}', (path) => {
    const bad = readFileSync(path, 'utf8').split('\n')
      .flatMap((line, i) => (/_(?:\{[а-яё]+\}|[а-яё])/i.test(line) ? [`${i + 1}: ${line.trim().slice(0, 80)}`] : []));
    expect(bad).toEqual([]);
  });
});
