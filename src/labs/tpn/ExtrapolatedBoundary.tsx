import { useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, plotFont, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { slabHarmonic } from './diffusion';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  flux: { label: 'поток в пластине cos(πx/ã)', color: 'accent', mark: 'line' },
  extrapolation: { label: 'линейная экстраполяция в вакуум', color: 'signal', mark: 'dash' },
  boundary: { label: 'физическая граница пластины', color: 'ink', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

const LENGTHS = { transport: 0.71, diffusion: 2 / 3, zero: 0 } as const;
type Length = keyof typeof LENGTHS;

/** Лаборатория 8.1: пластина с вакуумом по обе стороны и экстраполированная граница. */
export default function ExtrapolatedBoundary() {
  const [a, setA] = useState(6);
  const [len, setLen] = useState<Length>('transport');
  const d = LENGTHS[len];
  const s = slabHarmonic(a, d);

  const ref = useCanvas((g, w, h) => {
    const xm = a / 2 + 2.2;
    const f = drawFrame(
      g, w, h,
      { min: -xm, max: xm, ticks: niceTicks(-xm, xm, w < 480 ? 5 : 8), format: (v) => (Math.abs(v) < 1e-9 ? '0' : String(v)), label: 'x, λtr' },
      { min: 0, max: 1.08, ticks: [0, 0.25, 0.5, 0.75, 1], format: (v) => v.toFixed(2), label: 'Φ/Φ(0)' },
    );
    f.clip(() => {
      // Вакуум по обе стороны — лёгкая заливка и подписи.
      g.fillStyle = token('ink-muted');
      g.globalAlpha = 0.06;
      g.fillRect(f.left, f.top, f.X(-a / 2) - f.left, f.height);
      g.fillRect(f.X(a / 2), f.top, f.left + f.width - f.X(a / 2), f.height);
      g.globalAlpha = 1;
      g.font = plotFont(500, 11);
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillText('вакуум', (f.left + f.X(-a / 2)) / 2, f.top + 4);
      g.fillText('вакуум', (f.X(a / 2) + f.left + f.width) / 2, f.top + 4);
      g.fillText('среда', f.X(0), f.top + 4);

      // Физические границы.
      g.strokeStyle = token(SERIES.boundary.color);
      g.lineWidth = 1.5;
      for (const x of [-a / 2, a / 2]) { const px = Math.round(f.X(x)) + 0.5; g.beginPath(); g.moveTo(px, f.top); g.lineTo(px, f.top + f.height); g.stroke(); }

      // Поток внутри пластины.
      const pts: [number, number][] = [];
      for (let k = 0; k <= 300; k++) { const x = -a / 2 + (a * k) / 300; pts.push([f.X(x), f.Y(s.flux(x))]); }
      strokeCurve(g, pts, token(SERIES.flux.color), 2.4);

      // Касательная от границы до нуля — на экстраполированной границе ã/2.
      if (d > 0) {
        const y0 = s.flux(a / 2);
        const c = token(SERIES.extrapolation.color);
        for (const sign of [-1, 1]) {
          strokeCurve(g, [[f.X((sign * a) / 2), f.Y(y0)], [f.X((sign * s.at) / 2), f.Y(0)]], c, 1.8, [5, 4]);
          g.fillStyle = c;
          g.beginPath(); g.arc(f.X((sign * s.at) / 2), f.Y(0), 4, 0, 2 * Math.PI); g.fill();
        }
        g.font = plotFont(600, 12);
        g.textBaseline = 'bottom';
        g.fillText('ã/2', f.X(s.at / 2), f.Y(0) - 8);
      }
    });
  }, [a, d]);

  return (
    <LabFrame
      n="8.1" kind="2D" title="Экстраполированная граница"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\tilde a = a + 2d', value: `= ${s.at.toFixed(2)}`, unit: 'λtr' },
        { tex: 'B^2/B^2_{d=0}', value: `= ${s.leakageRatio.toFixed(3)}` },
      ]}
      controls={<>
        <Slider label="Толщина пластины a" min={1} max={30} step={0.5} value={a} unit="λtr" format={(v) => v.toFixed(1)} onChange={setA} />
        <Segmented label="Длина экстраполяции d" value={len} onChange={(v) => setLen(v as Length)} options={[{ value: 'transport', label: '0.71 λtr' }, { value: 'diffusion', label: '2/3 λtr' }, { value: 'zero', label: '0' }]} />
      </>}
      caption="Рис. 8.1. Пластина толщиной $a$ с вакуумом по обе стороны; основная гармоника $\Phi \propto \cos(\pi x/\tilde a)$. Для тонкой пластины выбор $d$ меняет кривизну потока, а значит, утечку $B^2 = (\pi/\tilde a)^2$, на десятки процентов. Для толстой разница исчезает — поэтому «для больших сред добавкой α пренебрегают». 0.71 λtr — транспортная теория (задача Милна), 2/3 λtr — диффузионное приближение."
    >
      <canvas ref={ref} role="img" aria-label={`Поток в пластине толщиной ${a} λtr, экстраполированная толщина ${s.at.toFixed(2)} λtr`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
