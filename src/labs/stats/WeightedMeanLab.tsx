import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { errorBar, hband, hline } from './draw';
import { weightedMean } from './fit';

const SERIES = {
  points: { label: 'измерения aᵢ ± σᵢ', color: 'ink', mark: 'dot' },
  weighted: { label: 'взвешенное среднее ± σ', color: 'accent', mark: 'bar' },
  plain: { label: 'простое среднее', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Три измерения с лекции. */
const START = [[3.05, 0.07], [2.98, 0.05], [3.09, 0.11]] as const;

/** Лаборатория 7.1: общее среднее нескольких измерений с разными погрешностями — веса 1/σᵢ². */
export default function WeightedMeanLab() {
  const [vals, setVals] = useState<number[]>(START.map(([v]) => v));
  const [sigs, setSigs] = useState<number[]>(START.map(([, s]) => s));
  const r = weightedMean(vals, sigs);
  const plain = vals.reduce((a, b) => a + b, 0) / vals.length;

  const ref = useCanvas((g, w, h) => {
    const lo = Math.min(...vals.map((v, i) => v - sigs[i]!)) - 0.03, hi = Math.max(...vals.map((v, i) => v + sigs[i]!)) + 0.03;
    const yt = niceTicks(lo, hi, 5);
    const f = drawFrame(g, w, h, { min: 0.4, max: vals.length + 0.6, ticks: vals.map((_, i) => i + 1), format: (v) => `a${'₁₂₃₄'[v - 1] ?? v}`, label: 'измерение' }, { min: lo, max: hi, ticks: yt, format: tickFormat(yt), label: 'a' });
    f.clip(() => {
      hband(g, f, r.mean - r.sigma, r.mean + r.sigma, token(SERIES.weighted.color), 0.18);
      hline(g, f, r.mean, token(SERIES.weighted.color), `${r.mean.toFixed(3)} ± ${r.sigma.toFixed(3)}`, []);
      hline(g, f, plain, token(SERIES.plain.color));
      vals.forEach((v, i) => errorBar(g, f, i + 1, v, sigs[i]!, token(SERIES.points.color)));
    });
  }, [vals, sigs, r.mean, r.sigma, plain]);

  const set = (arr: number[], i: number, v: number) => arr.map((x, j) => (j === i ? v : x));
  return (
    <LabFrame
      n="7.1" kind="2D" title="Взвешенное среднее"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\bar a = \\frac{\\sum a_i/\\sigma_i^2}{\\sum 1/\\sigma_i^2}', value: `= ${r.mean.toFixed(4)}` },
        { tex: '\\sigma_{\\bar a} = \\frac{1}{\\sqrt{\\sum 1/\\sigma_i^2}}', value: `= ${r.sigma.toFixed(4)}` },
        { label: 'веса', value: r.weights.map((x) => `${(100 * x).toFixed(0)} %`).join(' · ') },
        { label: 'простое среднее', value: plain.toFixed(4) },
      ]}
      controls={<>
        {vals.map((v, i) => (
          <Slider key={`v${i}`} label={`a${'₁₂₃'[i]}`} min={2.8} max={3.3} step={0.01} value={v} format={(x) => x.toFixed(2)} onChange={(x) => setVals(set(vals, i, x))} />
        ))}
        {sigs.map((s, i) => (
          <Slider key={`s${i}`} label={`σ${'₁₂₃'[i]}`} min={0.01} max={0.3} step={0.01} value={s} format={(x) => x.toFixed(2)} onChange={(x) => setSigs(set(sigs, i, x))} />
        ))}
      </>}
      caption="Рис. 7.1. Минимум $S(a) = \sum (a_i - a)^2/\sigma_i^2$ — взвешенное среднее с весами $1/\sigma_i^2$: точное измерение весит больше. Погрешность результата меньше любой из исходных. Увеличьте $\sigma_3$ — третье измерение почти перестанет влиять; сделайте его точнее остальных — среднее подтянется к нему."
    >
      <canvas ref={ref} role="img" aria-label={`Взвешенное среднее ${r.mean.toFixed(3)} ± ${r.sigma.toFixed(3)}, простое ${plain.toFixed(3)}`} />
    </LabFrame>
  );
}
