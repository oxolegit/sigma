import { useEffect, useRef, useState, type DependencyList } from 'react';
import { onThemeChange } from './theme';

export type Draw = (g: CanvasRenderingContext2D, width: number, height: number) => void;

/**
 * Canvas, который рисуется в CSS-пикселях с учётом devicePixelRatio
 * и перерисовывается при изменении размера, смене темы и изменении deps.
 * Цвета внутри draw берите через token() — так они всегда из текущей темы.
 */
export function useCanvas(draw: Draw, deps: DependencyList) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const bump = () => setFrame((f) => f + 1);
    const ro = new ResizeObserver(bump);
    ro.observe(c);
    const offTheme = onThemeChange(bump);
    // Шрифты подгружаются позже первой отрисовки — перерисуем подписи осей.
    void document.fonts?.ready.then(bump);
    return () => { ro.disconnect(); offTheme(); };
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, ...deps]);

  return ref;
}
