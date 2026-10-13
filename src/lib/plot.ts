import { token } from './theme';

/** «Красивые» деления оси: шаг 1, 2 или 5 × 10ⁿ, примерно count штук. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((k) => k * mag >= raw) ?? 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** Деления логарифмической оси — степени десяти от min до max; при многих декадах — через одну-две. */
export function decadeTicks(min: number, max: number, maxCount = 9): number[] {
  const e0 = Math.ceil(Math.log10(min) - 1e-9);
  const e1 = Math.floor(Math.log10(max) + 1e-9);
  const step = Math.max(1, Math.ceil((e1 - e0 + 1) / maxCount));
  const out: number[] = [];
  for (let e = e0; e <= e1; e += step) out.push(10 ** e);
  return out;
}

/** Подпись деления логарифмической оси: 10⁻². */
export const decadeLabel = (v: number) => pow10Label(Math.round(Math.log10(v)));

/** 10 в степени d для подписи логарифмической оси: 10⁻². */
export const pow10Label = (d: number) => (d === 0 ? '1' : `10${String(d).split('').map((ch) => SUP[ch] ?? ch).join('')}`);

export interface Axis {
  min: number;
  max: number;
  ticks: number[];
  format?: (v: number) => string;
  label?: string;
  log?: boolean;
}

export interface Frame {
  X: (v: number) => number;
  Y: (v: number) => number;
  left: number; top: number; width: number; height: number;
  /** Ограничивает рисование областью графика на время fn. */
  clip: (fn: () => void) => void;
}

export const plotFont = (weight = 500, size = 11) => `${weight} ${size}px ${token('font-sans') || 'system-ui, sans-serif'}`;

/**
 * Сетка, деления и подписи осей в стиле системы: сетка plot-grid,
 * подписи ink-muted гротеском с табличными цифрами, подписи осей с единицами.
 */
export function drawFrame(g: CanvasRenderingContext2D, w: number, h: number, x: Axis, y: Axis, pad = { l: 48, r: 16, t: 26, b: 34 }): Frame {
  const width = w - pad.l - pad.r;
  const height = h - pad.t - pad.b;
  const lx = (v: number) => (x.log ? Math.log10(Math.max(v, 1e-300)) : v);
  const ly = (v: number) => (y.log ? Math.log10(Math.max(v, 1e-300)) : v);
  const x0 = lx(x.min);
  const x1 = lx(x.max);
  const y0 = ly(y.min);
  const y1 = ly(y.max);
  const X = (v: number) => pad.l + ((lx(v) - x0) / (x1 - x0)) * width;
  const Y = (v: number) => pad.t + (1 - (ly(v) - y0) / (y1 - y0)) * height;
  const fx = x.format ?? String;
  const fy = y.format ?? String;

  g.save();
  g.lineWidth = 1;
  g.strokeStyle = token('plot-grid');
  g.fillStyle = token('ink-muted');
  g.font = plotFont();

  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const v of x.ticks) {
    const px = Math.round(X(v)) + 0.5;
    g.beginPath(); g.moveTo(px, pad.t); g.lineTo(px, pad.t + height); g.stroke();
    g.fillText(fx(v), px, pad.t + height + 8);
  }
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const v of y.ticks) {
    const py = Math.round(Y(v)) + 0.5;
    g.beginPath(); g.moveTo(pad.l, py); g.lineTo(pad.l + width, py); g.stroke();
    g.fillText(fy(v), pad.l - 8, py);
  }
  if (x.label) { g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(x.label, pad.l + width - 4, pad.t + height - 4); }
  // Подпись оси Y — над областью графика, чтобы не спорить с верхним делением и кривой.
  if (y.label) { g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(y.label, pad.l - 8 - g.measureText(fy(y.ticks[y.ticks.length - 1] ?? y.max)).width, pad.t - 8); }
  g.restore();

  const clip = (fn: () => void) => {
    g.save();
    g.beginPath();
    g.rect(pad.l, pad.t, width, height);
    g.clip();
    fn();
    g.restore();
  };
  return { X, Y, left: pad.l, top: pad.t, width, height, clip };
}

/** Кривая y(x) по точкам: основная — accent 2px сплошная. */
export function strokeCurve(g: CanvasRenderingContext2D, pts: [number, number][], color: string, width = 2, dash: number[] = []) {
  if (!pts.length) return;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineJoin = 'round';
  g.setLineDash(dash);
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.stroke();
  g.restore();
}

/** Вертикальный маркер характерной величины: пунктир signal с подписью.
 *  row — ряд подписи сверху вниз, чтобы подписи соседних маркеров не накладывались. */
export function markerLine(g: CanvasRenderingContext2D, f: Frame, x: number, label: string, color = token('signal'), row = 0) {
  const px = Math.round(f.X(x)) + 0.5;
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.5;
  g.setLineDash([5, 5]);
  g.beginPath(); g.moveTo(px, f.top); g.lineTo(px, f.top + f.height); g.stroke();
  g.setLineDash([]);
  g.font = plotFont(600, 12);
  const right = px + 8 + g.measureText(label).width < f.left + f.width;
  g.textAlign = right ? 'left' : 'right';
  g.textBaseline = 'top';
  g.fillText(label, right ? px + 8 : px - 8, f.top + 22 + row * 18);
  g.restore();
}
