/** Общая отрисовка лабораторий курса: столбцы, точки, полосы, усы погрешностей. Цвета — только через token(). */
import type { Frame } from '../../lib/plot';
import { plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';

/** Столбцы гистограммы [x0; x1] высотой y: заливка с прозрачностью и контур. */
export function bars(g: CanvasRenderingContext2D, f: Frame, items: readonly { x0: number; x1: number; y: number }[], color: string, alpha = 0.22) {
  g.save();
  for (const b of items) {
    if (!(b.y > 0)) continue;
    const x = f.X(b.x0), w = f.X(b.x1) - x, y = f.Y(b.y), h = f.Y(0) - y;
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
    g.globalAlpha = 1;
    g.strokeStyle = color;
    g.lineWidth = 1.2;
    g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(0, Math.round(w) - 1), Math.max(0, Math.round(h)));
  }
  g.restore();
}

/** Точка с обводкой цветом поверхности — видна на линиях и столбцах. */
export function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.save();
  g.fillStyle = color;
  g.strokeStyle = token('surface-1');
  g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); g.stroke();
  g.restore();
}

/** Вертикальная полоса [x0; x1] на всю высоту графика: ±σ, интервал, окно. */
export function vband(g: CanvasRenderingContext2D, f: Frame, x0: number, x1: number, color: string, alpha = 0.12) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  const a = Math.max(f.left, f.X(Math.min(x0, x1))), b = Math.min(f.left + f.width, f.X(Math.max(x0, x1)));
  if (b > a) g.fillRect(a, f.top, b - a, f.height);
  g.restore();
}

/** Горизонтальная полоса [y0; y1]. */
export function hband(g: CanvasRenderingContext2D, f: Frame, y0: number, y1: number, color: string, alpha = 0.12) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  const a = Math.max(f.top, f.Y(Math.max(y0, y1))), b = Math.min(f.top + f.height, f.Y(Math.min(y0, y1)));
  if (b > a) g.fillRect(f.left, a, f.width, b - a);
  g.restore();
}

/** Горизонтальная линия на уровне y (пунктир по умолчанию) с подписью справа. */
export function hline(g: CanvasRenderingContext2D, f: Frame, y: number, color: string, label?: string, dash = [5, 5]) {
  const py = Math.round(f.Y(y)) + 0.5;
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.5;
  g.setLineDash(dash);
  g.beginPath(); g.moveTo(f.left, py); g.lineTo(f.left + f.width, py); g.stroke();
  if (label) {
    g.font = plotFont(600, 12);
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.fillText(label, f.left + f.width - 6, py - 4);
  }
  g.restore();
}

/** Ус погрешности ±s вокруг (x, y) по вертикали и точка в центре. */
export function errorBar(g: CanvasRenderingContext2D, f: Frame, x: number, y: number, s: number, color: string) {
  const px = f.X(x);
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px, f.Y(y - s)); g.lineTo(px, f.Y(y + s));
  g.moveTo(px - 6, f.Y(y - s)); g.lineTo(px + 6, f.Y(y - s));
  g.moveTo(px - 6, f.Y(y + s)); g.lineTo(px + 6, f.Y(y + s));
  g.stroke();
  g.restore();
  dot(g, px, f.Y(y), 5, color);
}

/** Подпись на рисунке гротеском. */
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left', base: CanvasTextBaseline = 'middle', weight = 600, size = 12) {
  g.save();
  g.fillStyle = color;
  g.font = plotFont(weight, size);
  g.textAlign = align;
  g.textBaseline = base;
  g.fillText(s, x, y);
  g.restore();
}

/** Кривая функции на [a; b] в координатах кадра; NaN и бесконечности рвут линию. */
export function fnPath(f: Frame, fn: (x: number) => number, a: number, b: number, n = 400): [number, number][][] {
  const parts: [number, number][][] = [[]];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n, y = fn(x);
    if (Number.isFinite(y)) parts[parts.length - 1]!.push([f.X(x), f.Y(y)]);
    else if (parts[parts.length - 1]!.length) parts.push([]);
  }
  return parts.filter((p) => p.length > 1);
}

/** Заливка под кривой на [a; b] до оси. */
export function fillUnder(g: CanvasRenderingContext2D, f: Frame, fn: (x: number) => number, a: number, b: number, color: string, alpha = 0.22, n = 300) {
  if (!(b > a)) return;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(f.X(a), f.Y(0));
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const y = fn(x);
    g.lineTo(f.X(x), f.Y(Number.isFinite(y) ? y : 0));
  }
  g.lineTo(f.X(b), f.Y(0));
  g.closePath();
  g.fill();
  g.restore();
}
