import { useEffect, useRef } from 'react';
import { token } from '../../lib/theme';

/** Шаг сетки — тот же, что у точечного фона body в global.css: живые точки ложатся ровно поверх. */
const STEP = 24;
const RADIUS = 120;

/**
 * Живой точечный фон главной: точки рядом с курсором подсвечиваются акцентом и тянутся к нему,
 * клик (или касание) пускает волну. Без курсора — медленно «гуляет» мягкое свечение.
 * Слой fixed на весь экран и не перехватывает события — ничего не обрезается и не мешает кликам.
 */
export default function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();
    const pointer = { x: -9999, y: -9999, seen: 0 };
    const waves: { x: number; y: number; t: number }[] = [];
    let accent = token('accent'), ink = token('ink-muted');

    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    };
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = performance.now(); };
    const onDown = (e: PointerEvent) => { onMove(e); waves.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (waves.length > 4) waves.shift(); };
    const onTheme = new MutationObserver(() => { accent = token('accent'); ink = token('ink-muted'); });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Без курсора 4 секунды — свечение само плывёт по фигуре Лиссажу.
      const idle = now - pointer.seen > 4000;
      const px = idle ? w * (0.5 + 0.35 * Math.sin(now / 5200)) : pointer.x;
      const py = idle ? h * (0.45 + 0.3 * Math.sin(now / 3700 + 1)) : pointer.y;
      if (now - last < 14) return;
      last = now;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      // Прокрутка: сетка body неподвижна относительно страницы — сдвигаем свою на остаток.
      // Точки фона body — в (1, 1) каждой клетки 24×24 страницы.
      const ox = 1, oy = 1 - (scrollY % STEP);
      for (let y = oy; y < h + STEP; y += STEP) {
        for (let x = ox; x < w + STEP; x += STEP) {
          let k = 0;
          const d = Math.hypot(x - px, y - py);
          if (d < RADIUS) k = (1 - d / RADIUS) ** 2 * (idle ? 0.3 : 0.75);
          for (const wv of waves) {
            const r = (now - wv.t) * 0.55, dw = Math.abs(Math.hypot(x - wv.x, y - wv.y) - r);
            if (dw < 22) k = Math.max(k, 0.6 * (1 - dw / 22) * Math.max(0, 1 - r / 600));
          }
          if (k < 0.02) continue;
          // Точка тянется к курсору и растёт.
          const pull = d > 0 ? (k * 4) / d : 0;
          const dx = (px - x) * pull, dy = (py - y) * pull;
          g.globalAlpha = 0.1 + 0.45 * k;
          g.fillStyle = k > 0.35 ? accent : ink;
          g.beginPath();
          g.arc(x + dx, y + dy, 1.1 + 1.4 * k, 0, Math.PI * 2);
          g.fill();
        }
      }
      while (waves.length && now - waves[0]!.t > 1400) waves.shift();
    };

    resize();
    addEventListener('resize', resize);
    onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (!still) {
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('pointerdown', onDown, { passive: true });
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      onTheme.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="sg-dotfield" aria-hidden="true" />;
}
