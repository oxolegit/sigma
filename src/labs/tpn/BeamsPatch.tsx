import { useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { beamField, PRESETS, type Beam } from './field';

/** Серии рисунка: по этой таблице рисуется схема и строится легенда.
 *  Пучки — одного цвета и пронумерованы: различать их цветом не нужно, а лишние цвета спорили бы с током. */
const SERIES = {
  beams: { label: 'пучки 1–3 (толщина — интенсивность)', color: 'signal', mark: 'line' },
  patch: { label: 'площадка и нормаль n', color: 'ink', mark: 'line' },
  current: { label: 'вектор тока i', color: 'accent', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

type Preset = keyof typeof PRESETS;

/** Градусы — без пробела перед знаком. */
const deg = (v: number) => `${v.toFixed(0)}°`;

/** Лаборатория 5.1: пучки в плоскости, площадка с поворачиваемой нормалью, поток и токи. */
export default function BeamsPatch() {
  const [preset, setPreset] = useState<Preset>('notes');
  const [beams, setBeams] = useState<Beam[]>(PRESETS.notes.map((b) => ({ ...b })));
  const [normal, setNormal] = useState(0);
  const r = beamField(beams, normal);

  const choose = (p: Preset) => { setPreset(p); setBeams(PRESETS[p].map((b) => ({ ...b }))); };
  const update = (i: number, patch: Partial<Beam>) => setBeams((bs) => bs.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  const ref = useCanvas((g, w, h) => {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    // Оси.
    g.save();
    g.strokeStyle = token('plot-grid');
    g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.restore();
    g.fillStyle = token('ink-muted');
    g.font = plotFont(500, 12);
    // Подписи осей — в стороне от концов, где стоят номера пучков.
    g.fillText('x', cx + R - 10, cy + 16);
    g.fillText('y', cx - 16, cy - R + 10);

    // Пучки: три параллельные стрелки, сходящиеся в точку; толщина — интенсивность; номер у хвоста.
    const beamColor = token(SERIES.beams.color);
    beams.forEach((b, i) => {
      if (b.intensity <= 0) return;
      const a = (b.angle * Math.PI) / 180, ox = Math.cos(a), oy = -Math.sin(a), px = -oy, py = ox;
      for (const off of [-10, 0, 10]) {
        arrow(g, cx - ox * R + px * off, cy - oy * R + py * off, cx + ox * R * 0.5 + px * off, cy + oy * R * 0.5 + py * off, beamColor, 1 + b.intensity * 0.8, 9);
      }
      g.fillStyle = beamColor;
      g.font = plotFont(700, 13);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(i + 1), cx - ox * (R + 12), cy - oy * (R + 12));
    });

    // Площадка и нормаль.
    const na = (normal * Math.PI) / 180, nx = Math.cos(na), ny = Math.sin(na);
    const ink = token(SERIES.patch.color);
    g.strokeStyle = ink;
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - ny * R * 0.35, cy - nx * R * 0.35); g.lineTo(cx + ny * R * 0.35, cy + nx * R * 0.35); g.stroke();
    g.lineCap = 'butt';
    arrow(g, cx, cy, cx + nx * R * 0.5, cy - ny * R * 0.5, ink, 2, 11);
    g.fillStyle = ink;
    g.font = plotFont(600, 14);
    g.fillText('n', cx + nx * R * 0.6, cy - ny * R * 0.6);

    // Вектор тока.
    if (r.magnitude > 1e-9) {
      const s = Math.min(R * 0.9, (r.magnitude / Math.max(r.flux, 1e-9)) * R * 1.1 + 12);
      const ux = r.ix / r.magnitude, uy = r.iy / r.magnitude;
      const acc = token(SERIES.current.color);
      arrow(g, cx, cy, cx + ux * s, cy - uy * s, acc, 3.5, 13);
      g.fillStyle = acc;
      g.font = plotFont(700, 14);
      g.fillText('i', cx + ux * (s + 14), cy - uy * (s + 14));
    }
  }, [beams, normal]);

  return (
    <LabFrame
      n="5.1" kind="2D" title="Пучки и площадка"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\Phi', value: `= ${r.flux.toFixed(2)}` },
        { tex: 'i_n^{+}', value: `= ${r.plus.toFixed(3)}` },
        { tex: 'i_n^{-}', value: `= ${r.minus.toFixed(3)}` },
        { tex: 'i_n', value: `= ${r.net.toFixed(3)}` },
        { tex: '|\\vec i\\,|', value: r.magnitude < 1e-9 ? '= 0' : `= ${r.magnitude.toFixed(3)} под ${Math.round(r.direction)}°` },
      ]}
      controls={<>
        <Segmented label="Пример" value={preset} onChange={(v) => choose(v as Preset)} options={[{ value: 'notes', label: 'Из конспекта' }, { value: 'opposite', label: 'Встречные' }, { value: 'single', label: 'Один пучок' }]} />
        <Slider label="Нормаль площадки" min={0} max={359} step={1} value={normal} format={deg} onChange={setNormal} />
        {beams.map((b, i) => (
          <div key={i} className="sg-beam-ctrl">
            <Slider label={`Пучок ${i + 1}: направление`} min={0} max={359} step={1} value={b.angle} format={deg} onChange={(angle) => update(i, { angle })} />
            <Slider label="интенсивность" min={0} max={5} step={0.5} value={b.intensity} format={(v) => v.toFixed(1)} onChange={(intensity) => update(i, { intensity })} />
          </div>
        ))}
      </>}
      caption="Рис. 5.1. Единицы — 10¹⁰ н/(см²·с). Каждый пучок даёт в ток вклад $\Phi_k(\vec\Omega_k\cdot\vec n)$. Поток не зависит от ориентации площадки, ток зависит; максимум $i_n$ равен $|\vec i\,|$, когда нормаль смотрит вдоль $\vec i$. Пример из конспекта — задача Б5 контрольной."
    >
      <canvas ref={ref} role="img" aria-label={`Пучки и площадка: поток ${r.flux.toFixed(2)}, ток через площадку ${r.net.toFixed(3)}, модуль вектора тока ${r.magnitude.toFixed(3)}`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
