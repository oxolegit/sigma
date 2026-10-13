import { drawFrame, plotFont, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import type { LegendItem } from '../../components';
import { deformationEnergy, SADDLE, type Target } from './fission';

/** Серии рисунков лабораторий 2.1 и 2.2: по этой таблице рисуются столбцы и кривая и строится легенда. */
export const ENERGY_SERIES = {
  excitation: { label: 'E* = Eсв + E нейтрона (штриховкой — E)', color: 'accent', mark: 'bar' },
  barrier: { label: 'барьер деления Uб', color: 'signal', mark: 'bar' },
  potential: { label: 'энергия деформации V(ε)', color: 'ink', mark: 'line' },
  levelE: { label: 'уровень E*', color: 'accent', mark: 'line' },
  levelB: { label: 'уровень барьера Uб', color: 'signal', mark: 'dash' },
  state: { label: 'текущая деформация ядра', color: 'ink', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

/** Горизонтальная линия уровня с подписью над или под ней. */
function level(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string, label: string, dash: number[], above: boolean, lx: number, align: CanvasTextAlign) {
  const py = Math.round(y) + 0.5;
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 2;
  g.setLineDash(dash);
  g.beginPath(); g.moveTo(x0, py); g.lineTo(x1, py); g.stroke();
  g.setLineDash([]);
  g.font = plotFont(600, 12);
  g.textAlign = align;
  g.textBaseline = above ? 'bottom' : 'top';
  g.fillText(label, lx, py + (above ? -6 : 6));
  g.restore();
}

/**
 * Энергия деформации V(ε) с уровнями E* и Uб в прямоугольнике (x, y, w, h).
 * deform — текущая деформация ядра (точка на кривой) или null.
 */
export function drawPotential(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: Target, Es: number, deform: number | null = null) {
  g.save();
  g.translate(x, y);
  const f = drawFrame(
    g, w, h,
    { min: 0, max: 1, ticks: w < 300 ? [0, 0.5, 1] : [0, 0.2, 0.4, 0.6, 0.8, 1], format: (v) => v.toFixed(1), label: 'деформация ε' },
    { min: -4, max: 10, ticks: [-4, -2, 0, 2, 4, 6, 8, 10], label: 'V, МэВ' },
  );
  const right = f.left + f.width;
  const above = Es > t.ub;
  level(g, f.left, right, f.Y(t.ub), token(ENERGY_SERIES.levelB.color), `Uб = ${t.ub.toFixed(2)} МэВ`, [5, 5], !above, f.X(SADDLE), 'center');
  const pts: [number, number][] = [];
  for (let k = 0; k <= 200; k++) pts.push([f.X(k / 200), f.Y(deformationEnergy(k / 200, t.ub))]);
  f.clip(() => strokeCurve(g, pts, token(ENERGY_SERIES.potential.color), 2));
  level(g, f.left, right, f.Y(Es), token(ENERGY_SERIES.levelE.color), `E* = ${Es.toFixed(2)} МэВ`, [], above, f.left + 6, 'left');
  if (deform !== null) {
    const c = Math.min(1, Math.max(0, deform));
    g.fillStyle = token(ENERGY_SERIES.state.color);
    g.strokeStyle = token('surface-1');
    g.lineWidth = 2;
    g.beginPath(); g.arc(f.X(c), f.Y(deformationEnergy(c, t.ub)), 6, 0, 2 * Math.PI); g.fill(); g.stroke();
  }
  g.restore();
}

/** Косая штриховка прямоугольника — второй признак, кроме цвета, у вклада энергии нейтрона. */
function hatch(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  for (let s = -h; s < w; s += 7) { g.beginPath(); g.moveTo(x + s, y + h); g.lineTo(x + s + h, y); g.stroke(); }
  g.restore();
}

/** Столбец: заливка цвета серии с прозрачностью 0.22 и обводка — как знак «столбец» в легенде. */
function bar(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, color: string) {
  if (x1 - x0 < 0.5) return;
  g.save();
  g.fillStyle = color;
  g.globalAlpha = 0.22;
  g.fillRect(x0, y, x1 - x0, h);
  g.globalAlpha = 1;
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  g.strokeRect(Math.round(x0) + 0.5, Math.round(y) + 0.5, Math.round(x1 - x0), Math.round(h));
  g.restore();
}

/**
 * Баланс энергий столбцами, как в черновике курса: E* = Eсв + E против барьера Uб,
 * пунктир на уровне барьера и разница — сколько не хватает или какой запас.
 */
export function drawEnergyBars(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: Target, E: number) {
  const Es = t.eb + E;
  const narrow = w < 480;
  g.save();
  g.translate(x, y);
  const f = drawFrame(g, w, h, { min: 0, max: 10, ticks: [0, 2, 4, 6, 8, 10], label: 'E, МэВ' }, { min: 0, max: 2, ticks: [] }, { l: narrow ? 74 : 104, r: 16, t: 30, b: 34 });
  const accent = token(ENERGY_SERIES.excitation.color), signal = token(ENERGY_SERIES.barrier.color), ink = token('ink');
  const bh = Math.min(30, f.height * 0.26);
  const yE = f.Y(1.45) - bh / 2, yB = f.Y(0.55) - bh / 2;

  // Подписи строк слева.
  g.font = plotFont(600, narrow ? 11 : 12);
  g.fillStyle = ink;
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(`E* ${t.compound}`, f.left - 10, yE + bh / 2);
  g.fillText('Барьер Uб', f.left - 10, yB + bh / 2);

  // E*: энергия связи и вклад нейтрона.
  bar(g, f.X(0), f.X(t.eb), yE, bh, accent);
  bar(g, f.X(t.eb), f.X(Es), yE, bh, accent);
  hatch(g, f.X(t.eb), yE, f.X(Es) - f.X(t.eb), bh, accent);
  g.font = plotFont(600, 11);
  g.fillStyle = ink;
  g.textAlign = 'center';
  if (f.X(t.eb) - f.X(0) > 40) g.fillText('Eсв', (f.X(0) + f.X(t.eb)) / 2, yE + bh / 2);
  // Барьер.
  bar(g, f.X(0), f.X(t.ub), yB, bh, signal);

  // Пунктир на уровне барьера через обе строки.
  const xb = Math.round(f.X(t.ub)) + 0.5;
  g.save();
  g.strokeStyle = signal;
  g.lineWidth = 1.5;
  g.setLineDash([5, 4]);
  g.beginPath(); g.moveTo(xb, f.top - 4); g.lineTo(xb, f.top + f.height); g.stroke();
  g.restore();

  // Сумма над столбцом E*, значение барьера справа от его столбца.
  g.font = plotFont(600, 12);
  g.fillStyle = ink;
  g.textBaseline = 'bottom';
  const sum = narrow ? `${t.eb.toFixed(2)} + ${E.toFixed(2)} = ${Es.toFixed(2)} МэВ` : `Eсв ${t.eb.toFixed(2)} + E ${E.toFixed(2)} = ${Es.toFixed(2)} МэВ`;
  g.textAlign = 'left';
  g.fillText(sum, f.left + 2, yE - 6);
  g.textBaseline = 'middle';
  g.fillText(`${t.ub.toFixed(2)} МэВ`, f.X(t.ub) + 8, yB + bh / 2);

  // Разница между E* и барьером — отрезок с засечками и подписью.
  const d = Es - t.ub;
  const xa = f.X(Math.min(Es, t.ub)), xz = f.X(Math.max(Es, t.ub));
  const yd = yE + bh + (yB - yE - bh) / 2;
  if (xz - xa > 2) {
    g.strokeStyle = ink;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(xa, yd); g.lineTo(xz, yd);
    g.moveTo(xa, yd - 4); g.lineTo(xa, yd + 4);
    g.moveTo(xz, yd - 4); g.lineTo(xz, yd + 4);
    g.stroke();
  }
  const note = d >= 0 ? `✓ запас ${d.toFixed(2)} МэВ` : `✕ не хватает ${(-d).toFixed(2)} МэВ`;
  g.font = plotFont(600, 12);
  g.textBaseline = 'middle';
  const tw = g.measureText(note).width;
  const fits = xz + 8 + tw < f.left + f.width;
  g.textAlign = fits ? 'left' : 'right';
  g.fillText(note, fits ? xz + 8 : xa - 8, yd);
  g.restore();
}
