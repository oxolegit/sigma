export type Theme = 'light' | 'dark';
const KEY = 'sigma:theme';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch {}
  window.dispatchEvent(new CustomEvent('sigma:theme', { detail: t }));
}

/** Подписка на смену темы — canvas и three.js перерисовываются по ней. */
export function onThemeChange(fn: (t: Theme) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<Theme>).detail);
  window.addEventListener('sigma:theme', h);
  return () => window.removeEventListener('sigma:theme', h);
}

/** Читает CSS-переменную токена в момент отрисовки. */
export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}
