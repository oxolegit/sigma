import { useMemo, useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { hardSphere } from './quantum';

/** Серии рисунка: по этой таблице рисуется диаграмма и строится легенда. */
const SERIES = {
  pattern: { label: 'угловое распределение |f(θ)|², нормированное', color: 'accent', mark: 'line' },
  grid: { label: 'окружности 1 и 1/2 максимума', color: 'ink-muted', mark: 'dash' },
  beam: { label: 'пучок', color: 'ink', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 9.2: угловое распределение рассеяния на твёрдой сфере. */
export default function AngularPattern() {
  const [kR, setKR] = useState(0.6);
  const hs = useMemo(() => hardSphere(kR), [kR]);
  const fb = hs.intensity(0) / Math.max(hs.intensity(Math.PI), 1e-12);

  const ref = useCanvas((g, w, h) => {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4;
    const N = 360;
    const vals = Array.from({ length: N + 1 }, (_, i) => hs.intensity((i * Math.PI) / N));
    const mx = Math.max(...vals);
    g.save();
    g.strokeStyle = token(SERIES.grid.color);
    g.setLineDash([3, 4]);
    g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke();
    g.beginPath(); g.arc(cx, cy, R / 2, 0, 2 * Math.PI); g.stroke();
    g.restore();
    arrow(g, 12, cy, cx - R * 0.2, cy, token(SERIES.beam.color), 1.5, 9);
    g.fillStyle = token(SERIES.beam.color);
    g.font = plotFont(500, 12);
    g.fillText('пучок', 12, cy - 10);
    g.beginPath();
    for (const side of [-1, 1]) {
      for (let i = 0; i <= N; i++) {
        const th = (i * Math.PI) / N, r = (vals[i]! / mx) * R;
        const x = cx + r * Math.cos(th), y = cy - side * r * Math.sin(th);
        if (i === 0 && side === -1) g.moveTo(x, y); else g.lineTo(x, y);
      }
    }
    g.strokeStyle = token(SERIES.pattern.color);
    g.lineWidth = 2.2;
    g.stroke();
    g.fillStyle = token('ink');
    g.beginPath(); g.arc(cx, cy, 4, 0, 2 * Math.PI); g.fill();
  }, [hs]);

  return (
    <LabFrame
      n="9.2" kind="2D" title="Угловое распределение рассеяния"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\sigma/\\pi R^2', value: `= ${hs.sigma.toFixed(2)}` },
        { label: 'парциальных волн', value: String(hs.waves) },
        { label: 'вперёд / назад', value: fb.toFixed(2) },
      ]}
      controls={<Slider label="kR = R/ƛ" min={0.2} max={5} step={0.05} value={kR} format={(v) => v.toFixed(2)} onChange={setKR} />}
      caption="Рис. 9.2. Длина луча — $|f(\theta)|^2$ в этом направлении, пучок идёт слева направо. При $kR < 1$ распределение почти окружность: рассеяние изотропно в системе центра инерции. Увеличьте $kR$ до 3–5: появляются острый пик вперёд и дифракционные лепестки, а $\sigma/\pi R^2$ идёт от 4 к 2."
    >
      <canvas ref={ref} role="img" aria-label={`Угловое распределение при kR = ${kR.toFixed(2)}: отношение вперёд к назад ${fb.toFixed(2)}`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
