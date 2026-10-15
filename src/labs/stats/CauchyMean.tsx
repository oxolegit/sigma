import { useMemo, useState } from 'react';
import { Button, LabFrame, Segmented, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { median, runningMean } from './core';
import { cauchy } from './density';
import { hline } from './draw';

const SERIES = {
  mean: { label: 'среднее первых N', color: 'accent', mark: 'line' },
  median: { label: 'медиана первых N', color: 'signal', mark: 'dash' },
  zero: { label: 'центр распределения', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const N = 20000;

/** Лаборатория 4.3: у Коши нарастающее среднее не успокаивается — редкие огромные значения сбивают его; медиана сходится. */
export default function CauchyMean() {
  const [dist, setDist] = useState('cauchy');
  const [seed, setSeed] = useState(1);
  const xs = useMemo(() => {
    const rng = mulberry32(seed * 4099 + (dist === 'cauchy' ? 1 : 2));
    return Array.from({ length: N }, () => {
      const u = rng();
      if (dist === 'cauchy') return cauchy.quantile(u);
      const v = rng();
      return Math.sqrt(-2 * Math.log(1 - u)) * Math.cos(2 * Math.PI * v);
    });
  }, [dist, seed]);
  const run = useMemo(() => runningMean(xs), [xs]);
  // Медиана — в 160 точках, равномерных по логарифму N.
  const meds = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      const k = Math.max(1, Math.round(N ** (i / 160)));
      if (out.length && out[out.length - 1]![0] === k) continue;
      out.push([k, median(xs.slice(0, k))]);
    }
    return out;
  }, [xs]);

  const ref = useCanvas((g, w, h) => {
    const xt = decadeTicks(1, N), yt = niceTicks(-3, 3, 6);
    const f = drawFrame(g, w, h, { min: 1, max: N, ticks: xt, format: decadeLabel, label: 'N', log: true }, { min: -3, max: 3, ticks: yt, format: tickFormat(yt), label: 'оценка центра' });
    f.clip(() => {
      hline(g, f, 0, token(SERIES.zero.color));
      const pts: [number, number][] = [];
      for (let i = 0; i < 160; i++) { const k = Math.max(1, Math.round(N ** (i / 159))); pts.push([f.X(k), f.Y(Math.max(-50, Math.min(50, run[k - 1]!)))]); }
      strokeCurve(g, pts, token(SERIES.mean.color), 2);
      strokeCurve(g, meds.map(([k, m]) => [f.X(k), f.Y(m)]), token(SERIES.median.color), 2, [6, 3]);
    });
  }, [run, meds]);

  const last = run[N - 1]!, med = meds[meds.length - 1]![1];
  return (
    <LabFrame
      n="4.3" kind="2D" title="Среднее, которое не сходится"
      legend={Object.values(SERIES)}
      readout={[
        { label: `среднее ${N.toLocaleString('ru-RU')} чисел`, value: last.toFixed(3) },
        { label: 'медиана', value: med.toFixed(3) },
        { label: 'наибольшее |x|', value: Math.max(...xs.map(Math.abs)).toFixed(0) },
      ]}
      controls={<>
        <Segmented label="Распределение" value={dist} onChange={setDist} options={[{ value: 'cauchy', label: 'Коши' }, { value: 'gauss', label: 'Гаусс' }]} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((x) => x + 1)}>Новая выборка</Button></div>
      </>}
      caption="Рис. 4.3. Нарастающее среднее и медиана выборки. У Гаусса обе оценки сходятся к центру с ошибкой $\sim 1/\sqrt N$. У Коши хвосты $\sim 1/x^2$ такие тяжёлые, что одно число в тысячи единиц время от времени сбивает среднее — оно не сходится ни к чему. Медиана устойчива: ей важен порядок чисел, а не их величина."
    >
      <canvas ref={ref} role="img" aria-label={`Среднее ${last.toFixed(2)}, медиана ${med.toFixed(3)}`} />
    </LabFrame>
  );
}
