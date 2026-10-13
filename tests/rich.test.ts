import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Rich } from '../src/components/Rich';

const html = (s: string) => renderToStaticMarkup(createElement(Rich, null, s));

describe('Rich', () => {
  it('строчные формулы рендерятся KaTeX', () => {
    expect(html('путь $\\lambda$ до столкновения')).toMatch(/путь <span class="rz-tex"><span class="katex">.*<\/span> до столкновения/);
  });
  it('**…** — жирный', () => {
    expect(html('**Ответ.** 2 см')).toBe('<strong>Ответ.</strong> 2 см');
  });
  it('звёздочки внутри формулы не трогаются', () => {
    expect(html('$E^{**}$')).not.toContain('<strong>');
  });
  it('без разметки — просто текст', () => {
    expect(html('просто текст')).toBe('просто текст');
  });
});
