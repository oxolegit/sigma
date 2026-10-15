import { useMemo, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat, stepCeil } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { histogram, median, sampleMoments } from './core';
import { bars, fnPath } from './draw';
import { triangle, triangleMedian } from './geometry';

const SERIES = {
  hist: { label: 'Монте-Карло', color: 'accent', mark: 'bar' },
  pdf: { label: 'f(S) = ln(Sₘₐₓ/S)/Sₘₐₓ', color: 'signal', mark: 'line' },
  mean: { label: 'среднее ⟨S⟩', color: 'signal', mark: 'dash' },
  median: { label: 'медиана', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const T = triangle(100);
const MED = triangleMedian(100);
const BINS = 25;
const fmtN = (lg: number) => Math.round(10 ** lg).toLocaleString('ru-RU');

/** Лаборатория 3.1: a и h равномерно на (0; 100), площадь S = ah/2 — распределение, среднее и медиана. */
export default function TriangleArea() {
  const [lg, setLg] = useState(3);
  const [seed, setSeed] = useState(1);
  const n = Math.round(10 ** lg);
  const s = useMemo(() => {
    const rng = mulberry32(seed * 7907 + n);
    return Array.from({ length: n }, () => (100 * rng() * 100 * rng()) / 2);
  }, [n, seed]);
  const m = sampleMoments(s);
  const med = median(s);
  const counts = useMemo(() => histogram(s, 0, T.smax, BINS), [s]);
  const bw = T.smax / BINS;

  const ref = useCanvas((g, w, h) => {
    const dens = counts.map((c) => c / (n * bw));
    const ymax = stepCeil(Math.max(dens[0] ?? 0, T.pdf(bw / 2)) * 1.1);
    const xt = niceTicks(0, T.smax, w < 480 ? 5 : 10), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(g, w, h, { min: 0, max: T.smax, ticks: xt, format: tickFormat(xt), label: 'площадь S' }, { min: 0, max: ymax, ticks: yt, format: (v) => (v * 1e4).toFixed(0), label: 'f(S), ×10⁻⁴' });
    f.clip(() => {
      bars(g, f, dens.map((y, k) => ({ x0: k * bw, x1: (k + 1) * bw, y })), token(SERIES.hist.color));
      for (const p of fnPath(f, T.pdf, 1, T.smax - 1, 600)) strokeCurve(g, p, token(SERIES.pdf.color), 2);
      markerLine(g, f, T.mean, `⟨S⟩ = ${T.mean}`, token(SERIES.mean.color), 0);
      markerLine(g, f, MED, `медиана ≈ ${Math.round(MED)}`, token(SERIES.median.color), 1);
    });
  }, [counts, n]);

  return (
    <LabFrame
      n="3.1" kind="2D" title="Треугольник случайной площади"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'Монте-Карло: ⟨S⟩', value: m.mean.toFixed(0) },
        { label: 'σ', value: m.sigma.toFixed(0) },
        { label: 'медиана', value: med.toFixed(0) },
        { label: 'теория: ⟨S⟩', value: String(T.mean) },
        { label: 'σ', value: T.sigma.toFixed(0) },
        { label: 'медиана', value: MED.toFixed(0) },
      ]}
      controls={<>
        <Slider label="Сколько треугольников" min={1} max={5} step={0.05} value={lg} format={fmtN} onChange={setLg} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((x) => x + 1)}>Разыграть заново</Button></div>
      </>}
      caption="Рис. 3.1. Основание $a$ и высота $h$ — независимые и равномерные на $(0; 100)$. Средняя площадь — просто $\langle a\rangle\langle h\rangle/2 = 50\cdot50/2 = 1250$. Но распределение $S$ не равномерное: маленьких площадей много (плотность уходит в бесконечность у нуля), поэтому медиана ≈ 934 заметно левее среднего."
    >
      <canvas ref={ref} role="img" aria-label={`${n} треугольников: средняя площадь ${m.mean.toFixed(0)}, медиана ${med.toFixed(0)}`} />
    </LabFrame>
  );
}
