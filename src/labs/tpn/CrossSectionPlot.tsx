import { useMemo, useState } from 'react';
import { LabFrame, Segmented, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, plotFont, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { carbon, energyGrid, u238, type CrossSections } from './crossSections';

/** Серии рисунка: по этой таблице рисуются кривые и строится легенда. */
const SERIES = {
  total: { label: 'полное σt', color: 'accent', mark: 'line' },
  capture: { label: 'захват σc', color: 'signal', mark: 'dash' },
  fission: { label: 'деление σf (порог ≈ 1 МэВ)', color: 'ink', mark: 'line' },
  n2n: { label: 'σ(n, 2n)', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem & { dash?: number[] }>;

type Nucleus = 'heavy' | 'light';
type Zoom = 'all' | 'res';

/** Энергетические области — подписываются прямо на графике. */
const REGIONS: Record<Nucleus, { from: number; to: number; label: string; short: string }[]> = {
  heavy: [
    { from: 1e-3, to: 0.625, label: 'тепловая', short: 'тепл.' },
    { from: 5, to: 4e3, label: 'разрешённые резонансы', short: 'резонансы' },
    { from: 4e3, to: 5e4, label: 'неразрешённые', short: 'нераз.' },
    { from: 5e4, to: 2e7, label: 'гладкая', short: 'гладк.' },
  ],
  light: [
    { from: 1e-3, to: 1e5, label: 'только потенциальное рассеяние', short: 'потенциальное' },
    { from: 1.5e6, to: 2e7, label: 'резонансы', short: 'рез.' },
  ],
};

/** Лаборатория 3.1: как выглядит σ(E) у тяжёлого и лёгкого ядра. */
export default function CrossSectionPlot() {
  const [nucleus, setNucleus] = useState<Nucleus>('heavy');
  const [zoom, setZoom] = useState<Zoom>('all');
  const grid = useMemo(() => energyGrid(1e-3, 2e7), []);
  const lo = zoom === 'res' ? 1 : 1e-3;
  const hi = zoom === 'res' ? 200 : 2e7;
  const heavy = nucleus === 'heavy';
  const series = heavy ? Object.values(SERIES) : [SERIES.total, SERIES.capture];

  const ref = useCanvas((g, w, h) => {
    const ymin = heavy ? 1e-3 : 1e-4;
    const ymax = heavy ? 1e5 : 100;
    const f = drawFrame(
      g, w, h,
      { min: lo, max: hi, ticks: decadeTicks(lo, hi, w < 480 ? 5 : 9), format: decadeLabel, label: 'E, эВ', log: true },
      { min: ymin, max: ymax, ticks: decadeTicks(ymin, ymax, 5), format: decadeLabel, label: 'σ, барн', log: true },
    );
    const xs = (E: number): CrossSections => (heavy ? u238(E) : carbon(E));
    const curves: Record<keyof typeof SERIES, [number, number][]> = { total: [], capture: [], fission: [], n2n: [] };
    for (const E of grid) {
      if (E < lo || E > hi) continue;
      const s = xs(E);
      const x = f.X(E);
      curves.total.push([x, f.Y(s.total)]);
      curves.capture.push([x, f.Y(s.capture)]);
      if (heavy && E > 3e5) curves.fission.push([x, f.Y(Math.max(s.fission, 1e-4))]);
      if (heavy && E > 6.2e6) curves.n2n.push([x, f.Y(Math.max(s.n2n, 1e-4))]);
    }
    f.clip(() => {
      // Области — тонкие границы и подписи, без заливки цветом: цвет занят сериями.
      if (zoom === 'all') {
        g.font = plotFont(500, 11);
        g.fillStyle = token('ink-muted');
        g.strokeStyle = token('rule-strong');
        g.setLineDash([2, 4]);
        g.textAlign = 'center';
        g.textBaseline = 'top';
        for (const r of REGIONS[nucleus]) {
          const x0 = f.X(Math.max(r.from, lo)), x1 = f.X(Math.min(r.to, hi));
          for (const x of [x0, x1]) { g.beginPath(); g.moveTo(Math.round(x) + 0.5, f.top); g.lineTo(Math.round(x) + 0.5, f.top + f.height); g.stroke(); }
          // Длинная подпись, если помещается, иначе короткая.
          const text = [r.label, r.short].find((t) => x1 - x0 > g.measureText(t).width + 6);
          if (text) g.fillText(text, (x0 + x1) / 2, f.top + 4);
        }
        g.setLineDash([]);
      }
      for (const key of Object.keys(SERIES) as (keyof typeof SERIES)[]) {
        const s = SERIES[key];
        strokeCurve(g, curves[key], token(s.color), key === 'total' ? 1.6 : 1.8, s.mark === 'dash' ? [6, 4] : []);
      }
    });
  }, [nucleus, zoom, grid]);

  return (
    <LabFrame
      n="3.1" kind="2D" title="Как выглядит σ(E)"
      legend={series}
      controls={<>
        <Segmented label="Ядро" value={nucleus} onChange={(v) => setNucleus(v as Nucleus)} options={[{ value: 'heavy', label: 'Тяжёлое (²³⁸U)' }, { value: 'light', label: 'Лёгкое (¹²C)' }]} />
        <Segmented label="Масштаб по энергии" value={zoom} onChange={(v) => setZoom(v as Zoom)} options={[{ value: 'all', label: '10⁻³ эВ – 20 МэВ' }, { value: 'res', label: '1–200 эВ' }]} />
      </>}
      caption="Рис. 3.1. Схематичные сечения, качественно как на рис. 1.5–1.6 пособия. Резонансы ²³⁸U построены по формуле Брейта — Вигнера без доплеровского уширения (оно появится в уроке 9), поэтому пики выше реальных. Выше 1 кэВ — гладкая схематичная зависимость."
    >
      <canvas ref={ref} role="img" aria-label={`Сечения ${heavy ? '²³⁸U' : '¹²C'} от ${decadeLabel(lo)} до ${zoom === 'res' ? '200' : '2·10⁷'} эВ в логарифмическом масштабе`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
