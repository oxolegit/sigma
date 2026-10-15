import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat, stepCeil } from '../../lib/plot';
import { token } from '../../lib/theme';
import { gauss } from './density';
import { bars, fnPath } from './draw';
import { poissonCdf, poissonModes, poissonParams, poissonPmf } from './poisson';

const SERIES = {
  low: { label: 'Pₙ при n ≤ k', color: 'accent', mark: 'bar' },
  tail: { label: 'хвост: P(N > k)', color: 'signal', mark: 'bar' },
  gauss: { label: 'Гаусс с тем же λ и σ = √λ', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const f3 = (v: number) => v.toFixed(3);

/** Лаборатория 5.1: распределение Пуассона — форма от λ, хвост P(N > k) через противоположное событие. */
export default function PoissonLab() {
  const [lambda, setLambda] = useState(3);
  const [k, setK] = useState(2);
  const p = poissonParams(lambda);
  const nmax = Math.max(8, Math.ceil(lambda + 4.5 * Math.sqrt(lambda) + 2));
  const kk = Math.min(k, nmax);
  const cdf = poissonCdf(lambda, kk);

  const ref = useCanvas((g, w, h) => {
    const ps = Array.from({ length: nmax + 1 }, (_, n) => poissonPmf(lambda, n));
    const ymax = stepCeil(Math.max(...ps) * 1.2);
    const xt = niceTicks(0, nmax, w < 480 ? 6 : 12), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(g, w, h, { min: -0.6, max: nmax + 0.6, ticks: xt, format: tickFormat(xt), label: 'n' }, { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'Pₙ' });
    f.clip(() => {
      bars(g, f, ps.map((y, n) => ({ x0: n - 0.38, x1: n + 0.38, y })).filter((_, n) => n <= kk), token(SERIES.low.color), 0.28);
      bars(g, f, ps.map((y, n) => ({ x0: n - 0.38, x1: n + 0.38, y })).filter((_, n) => n > kk), token(SERIES.tail.color), 0.28);
      if (lambda > 0.3) for (const part of fnPath(f, (x) => gauss.pdf(x, lambda, p.sigma), -0.6, nmax + 0.6, 400)) strokeCurve(g, part, token(SERIES.gauss.color), 1.5, [5, 4]);
      markerLine(g, f, lambda, `n̄ = λ = ${lambda.toFixed(2)}`, token('ink'));
    });
  }, [lambda, kk, nmax]);

  const modes = poissonModes(lambda);
  return (
    <LabFrame
      n="5.1" kind="2D" title="Распределение Пуассона"
      legend={Object.values(SERIES)}
      readout={[
        { tex: `P_{${kk}}`, value: `= ${f3(poissonPmf(lambda, kk))}` },
        { tex: `P(N \\le ${kk})`, value: `= ${f3(cdf)}` },
        { tex: `P(N > ${kk}) = 1 - \\sum_{n \\le ${kk}} P_n`, value: `= ${f3(1 - cdf)}` },
        { tex: '\\sigma = \\sqrt\\lambda', value: `= ${f3(p.sigma)}` },
        { tex: '\\gamma = 1/\\sqrt\\lambda', value: lambda > 0 ? `= ${f3(p.skew)}` : '—' },
      ]}
      status={{ tone: 'ok', text: `Наиболее вероятное число событий — ${modes.join(' и ')}${modes.length > 1 ? ': при целом λ вероятности Pλ₋₁ и Pλ равны' : ' — целая часть λ'}.` }}
      controls={<>
        <Slider tex="\lambda" label=" — среднее число событий" min={0.1} max={30} step={0.05} value={lambda} format={(v) => v.toFixed(2)} onChange={setLambda} />
        <Slider label="Граница k" min={0} max={nmax} step={1} value={kk} onChange={setK} />
      </>}
      caption="Рис. 5.1. $P_n = \frac{\lambda^n}{n!}e^{-\lambda}$ — вероятность ровно $n$ независимых событий, когда в среднем ожидается $\lambda$. Хвост «больше $k$» — бесконечная сумма, поэтому считают противоположное событие: $P(N > k) = 1 - (P_0 + \dots + P_k)$. При малых λ распределение скошено вправо ($\gamma = 1/\sqrt\lambda$), при больших — почти гауссово."
    >
      <canvas ref={ref} role="img" aria-label={`Пуассон при λ = ${lambda.toFixed(2)}: P(N > ${kk}) = ${f3(1 - cdf)}`} />
    </LabFrame>
  );
}
