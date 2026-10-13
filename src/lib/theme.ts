export type Theme = 'light' | 'dark';
const KEY = 'sigma:theme';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Явный выбор темы: запоминается и больше не следует за системой. */
export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch {}
  document.documentElement.dataset.theme = t;
}

/** Подписка на смену темы — canvas и three.js перерисовываются по ней.
 *  Следит за атрибутом data-theme, поэтому ловит и явный выбор, и смену темы системы. */
export function onThemeChange(fn: (t: Theme) => void): () => void {
  const mo = new MutationObserver(() => fn(getTheme()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

/** Читает CSS-переменную токена в момент отрисовки. */
export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}
