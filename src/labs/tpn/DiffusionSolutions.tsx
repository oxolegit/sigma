import { useState } from 'react';
import { Button, LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { sci } from '../../lib/format';
import { decadeLabel, decadeTicks, drawFrame, markerLine, niceTicks, plotFont, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { medium, randomWalk, sourceFlux, type Geometry } from './diffusion';

/** Серии рисунка: по этой таблице рисуются оба графика и строится легенда. */
const SERIES = {
  flux: { label: 'решение уравнения диффузии Φ (q = 1)', color: 'accent', mark: 'line' },
  length: { label: 'длина диффузии L и √6·L', color: 'signal', mark: 'dash' },
  tracks: { label: 'траектории Монте-Карло (проекция на xy)', color: 'ink-muted', mark: 'zigzag' },
  ends: { label: 'точки поглощения', color: 'ink', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

type Walk = ReturnType<typeof randomWalk> & { key: string };
const AXIS: Record<Geometry, string> = { point: 'r', plane: 'x', line: 'ρ' };

/** Лаборатория 8.2: решения уравнения диффузии и «честное» случайное блуждание с изотропным рассеянием. */
export default function DiffusionSolutions() {
  const [geometry, setGeometry] = useState<Geometry>('point');
  const [sigmaS, setSigmaS] = useState(1);
  const [logSa, setLogSa] = useState(-1.3);
  const [walk, setWalk] = useState<Walk | null>(null);
  const sigmaA = 10 ** logSa;
  const { D, L, sigmaT } = medium(sigmaS, sigmaA);
  const key = `${sigmaS}|${logSa}`;
  const fresh = walk?.key === key ? walk : null;
  const r2 = 6 * L * L;

  const run = () => setWalk({ ...randomWalk(sigmaS, sigmaA, 3000, mulberry32(Math.round(sigmaS * 1e3 + logSa * 1e5)), 25), key });

  const ref = useCanvas((g, w, h) => {
    const h1 = Math.round(h * 0.5);
    // Верх: решение в логарифмическом масштабе.
    const f = (r: number) => sourceFlux(geometry, r, 1, D, L);
    const pts: number[][] = [];
    let mx = 0, mn = Infinity;
    for (let i = 1; i <= 300; i++) { const r = 0.05 * L + (i * (5 * L - 0.05 * L)) / 300; const v = f(r); pts.push([r, v]); mx = Math.max(mx, v); mn = Math.min(mn, v); }
    const ymin = 10 ** Math.floor(Math.log10(mn)), ymax = 10 ** Math.ceil(Math.log10(mx));
    const xt = niceTicks(0, 5 * L, w < 480 ? 4 : 6);
    const fr = drawFrame(
      g, w, h1,
      { min: 0, max: 5 * L, ticks: xt, format: tickFormat(xt), label: `${AXIS[geometry]}, см` },
      { min: ymin, max: ymax, ticks: decadeTicks(ymin, ymax, 4), format: decadeLabel, label: 'Φ', log: true },
    );
    fr.clip(() => strokeCurve(g, pts.map(([r, v]) => [fr.X(r!), fr.Y(v!)]), token(SERIES.flux.color), 2.4));
    markerLine(g, fr, L, 'L', token(SERIES.length.color));
    if (geometry === 'point') markerLine(g, fr, Math.sqrt(6) * L, '√6·L', token(SERIES.length.color), 1);

    // Низ: проекции траекторий и точки поглощения.
    g.save();
    g.translate(0, h1);
    const h2 = h - h1, cx = w / 2, cy = h2 / 2 + 6;
    if (!fresh) {
      g.fillStyle = token('ink-muted');
      g.font = plotFont(500, 13);
      g.textAlign = 'center';
      g.fillText('Траектории появятся после запуска', cx, cy);
    } else {
      const S = Math.min(w, h2) / 2 / (2.6 * L);
      g.strokeStyle = token(SERIES.length.color);
      g.setLineDash([4, 4]);
      g.beginPath(); g.arc(cx, cy, 2 * L * S, 0, 2 * Math.PI); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = token(SERIES.tracks.color);
      g.globalAlpha = 0.6;
      g.lineWidth = 0.9;
      for (const p of fresh.paths) {
        g.beginPath();
        p.forEach(([x, y], i) => (i ? g.lineTo(cx + x * S, cy - y * S) : g.moveTo(cx + x * S, cy - y * S)));
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = token(SERIES.ends.color);
      for (const [x, y] of fresh.ends) { g.beginPath(); g.arc(cx + x * S, cy - y * S, 1.6, 0, 2 * Math.PI); g.fill(); }
      g.fillStyle = token('accent');
      g.beginPath(); g.arc(cx, cy, 4, 0, 2 * Math.PI); g.fill();
      g.fillStyle = token('ink-muted');
      g.font = plotFont(500, 11);
      g.textAlign = 'left';
      g.fillText('пунктир: √⟨x² + y²⟩ = 2L', 8, h2 - 8);
    }
    g.restore();
  }, [geometry, sigmaS, logSa, fresh]);

  return (
    <LabFrame
      n="8.2" kind="2D" title="Решения и случайное блуждание" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'D = 1/(3\\Sigma_t)', value: `= ${D.toFixed(3)}`, unit: 'см' },
        { tex: 'L', value: `= ${sci(L, 3)}`, unit: 'см' },
        { tex: '6L^2', value: `= ${sci(r2, 3)}`, unit: 'см²' },
        { label: '⟨r²⟩ Монте-Карло', value: fresh ? `${sci(fresh.r2, 3)} см² (${fresh.r2 >= r2 ? '+' : ''}${(100 * (fresh.r2 / r2 - 1)).toFixed(1)} %)` : 'запустите' },
        { label: 'столкновений в среднем', value: fresh ? `${fresh.collisions.toFixed(1)} (теория ${(sigmaT / sigmaA).toFixed(1)})` : '—' },
      ]}
      controls={<>
        <Segmented label="Геометрия источника" value={geometry} onChange={(v) => setGeometry(v as Geometry)} options={[{ value: 'point', label: 'Точка' }, { value: 'plane', label: 'Плоскость' }, { value: 'line', label: 'Нить' }]} />
        <Slider tex="\Sigma_s" min={0.2} max={2} step={0.05} value={sigmaS} unit="см⁻¹" format={(v) => v.toFixed(2)} onChange={setSigmaS} />
        <Slider tex="\Sigma_a" min={-3} max={-0.3} step={0.05} value={logSa} unit="см⁻¹" format={(v) => sci(10 ** v, 2)} onChange={setLogSa} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={run}>Запустить 3000 историй</Button>
        </div>
      </>}
      caption="Рис. 8.2. Сверху — решение уравнения диффузии для выбранного источника, снизу — проекции первых траекторий «честного» Монте-Карло с изотропным рассеянием. Для бесконечной среды $\langle r^2\rangle = 2/(\Sigma_a\Sigma_t)$ точно: каждый пролёт даёт $\langle l^2\rangle = 2/\Sigma_t^2$, а пролётов в среднем $\Sigma_t/\Sigma_a$. Это совпадает с $6L^2$ при $D = 1/(3\Sigma_t)$, и Монте-Карло подтверждает это с точностью до статистики даже при не очень слабом поглощении."
    >
      <canvas ref={ref} role="img" aria-label={`Решение для ${geometry === 'point' ? 'точечного' : geometry === 'plane' ? 'плоского' : 'нитевидного'} источника, L = ${sci(L, 3)} см`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
