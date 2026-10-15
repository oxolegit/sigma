import { useMemo, useState } from 'react';
import { Button, LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { histogram, sampleMoments } from './core';
import { inverseSampler, normalize, shape, SHAPES } from './density';
import { bars, fnPath } from './draw';

const SERIES = {
  hist: { label: 'гистограмма: nₖ/(N·Δx)', color: 'accent', mark: 'bar' },
  f: { label: 'плотность f(x)', color: 'signal', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

const fmtN = (lg: number) => Math.round(10 ** lg).toLocaleString('ru-RU');

/** Лаборатория 2.2: N случайных чисел с плотностью f(x) — гистограмма приближается к f, когда N растёт. */
export default function HistogramDensity() {
  const [id, setId] = useState('gamma');
  const [lg, setLg] = useState(2);
  const [bins, setBins] = useState(20);
  const [seed, setSeed] = useState(1);
  const s = shape(id);
  const n = Math.round(10 ** lg);
  const d = useMemo(() => normalize(s), [s]);
  const sample = useMemo(() => {
    const draw = inverseSampler(d, s.support[0], s.support[1], 2000);
    const rng = mulberry32(seed * 104729 + n);
    return Array.from({ length: n }, () => draw(rng()));
  }, [d, s, n, seed]);
  const m = sampleMoments(sample);
  const [v0, v1] = s.view;
  // Бины — по той части оси, где есть плотность: от края носителя до края рисунка.
  const h0 = Math.max(v0, s.support[0]), h1 = Math.min(v1, s.support[1]);
  const counts = useMemo(() => histogram(sample, h0, h1, bins), [sample, h0, h1, bins]);
  const bw = (h1 - h0) / bins;

  const ref = useCanvas((g, w, h) => {
    const dens = counts.map((c) => c / (n * bw));
    let fmax = 0;
    for (let i = 0; i <= 400; i++) fmax = Math.max(fmax, d.f(v0 + ((v1 - v0) * i) / 400));
    const ymax = Math.max(fmax, ...dens) * 1.15;
    const xt = niceTicks(v0, v1, w < 480 ? 5 : 8), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(g, w, h, { min: v0, max: v1, ticks: xt, format: tickFormat(xt), label: 'x' }, { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'плотность' });
    f.clip(() => {
      bars(g, f, dens.map((y, k) => ({ x0: h0 + k * bw, x1: h0 + (k + 1) * bw, y })), token(SERIES.hist.color));
      for (const p of fnPath(f, d.f, v0, v1, 800)) strokeCurve(g, p, token(SERIES.f.color), 2.2);
    });
  }, [counts, d, n, bw, h0, v0, v1]);

  return (
    <LabFrame
      n="2.2" kind="2D" title="Гистограмма стремится к плотности"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'выборка: x̄', value: m.mean.toFixed(3) },
        { label: 'σ', value: m.sigma.toFixed(3) },
        { label: 'теория: x̄', value: d.mean.toFixed(3) },
        { label: 'σ', value: d.sigma.toFixed(3) },
      ]}
      controls={<>
        <Select label="Плотность" value={id} onChange={setId} options={SHAPES.filter((x) => x.id !== 'uniform').map((x) => ({ value: x.id, label: x.label }))} />
        <Slider label="Сколько чисел N" min={1} max={5} step={0.05} value={lg} format={fmtN} onChange={setLg} />
        <Slider label="Число бинов" min={4} max={80} step={1} value={bins} onChange={setBins} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((x) => x + 1)}>Новая выборка</Button></div>
      </>}
      caption="Рис. 2.2. Числа разыграны с плотностью $f(x)$ методом обратной функции: $x = F^{-1}(r)$, где $r$ равномерно на $(0; 1)$. Высота столбца — доля чисел в бине, делённая на ширину бина: так гистограмма и плотность в одних единицах. При малом N много шума, при слишком узких бинах — тоже; при большом N столбцы ложатся на кривую."
    >
      <canvas ref={ref} role="img" aria-label={`${n} чисел, ${bins} бинов: выборочное среднее ${m.mean.toFixed(3)} против ${d.mean.toFixed(3)}`} />
    </LabFrame>
  );
}
