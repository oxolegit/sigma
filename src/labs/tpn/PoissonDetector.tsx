import { useMemo, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { poissonPmf, samplePoisson, sampleStats } from './ensemble';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  sample: { label: '1000 измерений', color: 'accent', mark: 'bar' },
  theory: { label: 'распределение Пуассона', color: 'signal', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

const RUNS = 1000;
const fmtMu = (lg: number) => {
  const mu = 10 ** lg;
  return mu < 10 ? mu.toFixed(2) : mu < 100 ? mu.toFixed(1) : Math.round(mu).toLocaleString('ru-RU');
};

/** Лаборатория 10.1: 1000 повторных измерений детектором — гистограмма против P(N) = μᴺe^{−μ}/N!. */
export default function PoissonDetector() {
  const [lg, setLg] = useState(1);
  const [seed, setSeed] = useState(1);
  const mu = 10 ** lg;
  const xs = useMemo(() => {
    const rng = mulberry32(seed * 9973 + Math.round(lg * 100));
    return Array.from({ length: RUNS }, () => samplePoisson(mu, rng));
  }, [mu, lg, seed]);
  const st = sampleStats(xs);

  const ref = useCanvas((g, w, h) => {
    // Окно ±4.5σ вокруг μ; при больших μ соседние значения N объединяются в столбцы шириной bw.
    const sd = Math.sqrt(mu);
    const lo = Math.max(0, Math.floor(mu - 4.5 * sd - 1));
    const hi = Math.ceil(mu + 4.5 * sd + 1);
    const nb = Math.min(w < 480 ? 36 : 60, hi - lo + 1);
    const bw = (hi - lo + 1) / nb;
    const theory: number[] = [], counts = new Array<number>(nb).fill(0);
    for (let b = 0; b < nb; b++) {
      let s = 0;
      for (let N = Math.ceil(lo + b * bw); N < lo + (b + 1) * bw; N++) s += poissonPmf(mu, N);
      theory.push(s);
    }
    for (const x of xs) { const b = Math.floor((x - lo) / bw); if (b >= 0 && b < nb) counts[b]!++; }
    const share = counts.map((c) => c / RUNS);
    const ymax = Math.max(...theory, ...share) * 1.15;
    const xmax = lo + nb * bw;
    const xt = niceTicks(lo, xmax, w < 480 ? 4 : 7), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(
      g, w, h,
      { min: lo, max: xmax, ticks: xt, format: tickFormat(xt), label: 'число отсчётов N' },
      { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'доля измерений' },
    );
    f.clip(() => {
      g.fillStyle = token(SERIES.sample.color);
      g.globalAlpha = 0.22;
      share.forEach((v, b) => { if (v) g.fillRect(f.X(lo + b * bw), f.Y(v), f.X(lo + (b + 1) * bw) - f.X(lo + b * bw), f.Y(0) - f.Y(v)); });
      g.globalAlpha = 1;
      const pts: [number, number][] = [];
      theory.forEach((v, b) => pts.push([f.X(lo + b * bw), f.Y(v)], [f.X(lo + (b + 1) * bw), f.Y(v)]));
      strokeCurve(g, pts, token(SERIES.theory.color), 2);
    });
  }, [xs, mu]);

  return (
    <LabFrame
      n="10.1" kind="2D" title="Детектор и пуассоновский шум"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'выборочное среднее', value: st.mean.toFixed(mu < 10 ? 2 : 1) },
        { label: 'выборочное σ / √μ', value: (st.sd / Math.sqrt(mu)).toFixed(3) },
        { tex: '1/\\sqrt\\mu', value: `= ${(100 / Math.sqrt(mu)).toFixed(2)}`, unit: '%' },
      ]}
      controls={<>
        <Slider label="Среднее число отсчётов μ"min={0} max={4} step={0.05} value={lg} format={fmtMu} onChange={setLg} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((s) => s + 1)}>Измерить ещё 1000 раз</Button></div>
      </>}
      caption="Рис. 10.1. Детектор 1000 раз считает нейтроны за одинаковое время. Разброс отсчётов — пуассоновский: σ ≈ √μ при любом μ, поэтому $\sigma/\sqrt\mu$ держится около 1, а относительная ошибка $1/\sqrt\mu$ падает с ростом μ. При μ ≈ 1 распределение сильно несимметрично, при больших μ становится гауссовым."
    >
      <canvas ref={ref} role="img" aria-label={`1000 измерений при μ = ${fmtMu(lg)}: среднее ${st.mean.toFixed(2)}, относительный разброс ${(100 * st.sd / mu).toFixed(1)} %`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
