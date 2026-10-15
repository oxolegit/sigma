import { useMemo, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { bisect } from './density';
import { hline, vband } from './draw';
import { poissonMleSigma, poissonNegLogL } from './fit';
import { samplePoisson } from './poisson';

const SERIES = {
  L: { label: 'L(λ) − L_min', color: 'accent', mark: 'line' },
  band: { label: 'интервал, где L − L_min ≤ ½', color: 'accent', mark: 'bar' },
  truth: { label: 'истинное λ', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 8.2: МП-оценка среднего пуассоновского потока — минимум −ln L в выборочном среднем, ширина ямы — погрешность. */
export default function PoissonMLE() {
  const [lambda, setLambda] = useState(4);
  const [n, setN] = useState(10);
  const [seed, setSeed] = useState(1);
  const ns = useMemo(() => {
    const rng = mulberry32(seed * 2027 + 7);
    return Array.from({ length: n }, () => samplePoisson(lambda, rng));
  }, [lambda, n, seed]);
  const mean = ns.reduce((a, b) => a + b, 0) / n;
  const sigma = poissonMleSigma(ns);
  const L0 = poissonNegLogL(Math.max(mean, 1e-6), ns);
  const g = (l: number) => poissonNegLogL(l, ns) - L0 - 0.5;
  const lo = mean > 0 ? bisect(g, 1e-6, mean) : 0;
  const hi = bisect(g, Math.max(mean, 1e-6), mean + 10 * (sigma + 1));

  const ref = useCanvas((c, w, h) => {
    const x0 = Math.max(0.01, Math.min(lo, lambda) - 2 * sigma - 0.3), x1 = Math.max(hi, lambda) + 2 * sigma + 0.3;
    const xt = niceTicks(x0, x1, w < 480 ? 5 : 8), yt = niceTicks(0, 4, 4);
    const f = drawFrame(c, w, h, { min: x0, max: x1, ticks: xt, format: tickFormat(xt), label: 'λ' }, { min: 0, max: 4, ticks: yt, format: tickFormat(yt), label: 'L − L_min' });
    f.clip(() => {
      vband(c, f, lo, hi, token(SERIES.band.color), 0.14);
      hline(c, f, 0.5, token('ink-muted'), undefined, [2, 4]);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 300; i++) { const l = x0 + ((x1 - x0) * i) / 300; pts.push([f.X(l), f.Y(Math.min(10, poissonNegLogL(l, ns) - L0))]); }
      strokeCurve(c, pts, token(SERIES.L.color), 2.2);
      markerLine(c, f, lambda, `истинное λ = ${lambda}`, token(SERIES.truth.color), 0);
    });
  }, [ns, lo, hi, lambda, sigma]);

  return (
    <LabFrame
      n="8.2" kind="2D" title="Правдоподобие для λ"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'отсчёты', value: ns.length <= 12 ? ns.join(', ') : `${ns.slice(0, 10).join(', ')}, …` },
        { tex: '\\hat\\lambda = \\bar n', value: `= ${mean.toFixed(3)}` },
        { tex: '\\sigma = \\sqrt{\\hat\\lambda/N}', value: `= ${sigma.toFixed(3)}` },
        { label: 'по ΔL = ½', value: `${lo.toFixed(2)} … ${hi.toFixed(2)}` },
      ]}
      controls={<>
        <Slider tex="\lambda" label=" — истинное среднее" min={1} max={20} step={1} value={lambda} onChange={setLambda} />
        <Slider label="Измерений N" min={1} max={200} step={1} value={n} onChange={setN} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((s) => s + 1)}>Измерить заново</Button></div>
      </>}
      caption="Рис. 8.2. Детектор N раз считает события за одинаковое время. Правдоподобие $l(\lambda) = \prod P(n_i; \lambda)$; из $\partial L/\partial\lambda = \sum(1 - n_i/\lambda) = 0$ получаем $\hat\lambda = \bar n$ — МП-оценка совпала со средним. Ширина ямы — погрешность: там, где $L$ выросла на ½, отстоим от минимума на 1σ. Чем больше N, тем уже яма: $\sigma = \sqrt{\hat\lambda/N}$."
    >
      <canvas ref={ref} role="img" aria-label={`Оценка λ = ${mean.toFixed(2)} ± ${sigma.toFixed(2)} по ${n} измерениям`} />
    </LabFrame>
  );
}
