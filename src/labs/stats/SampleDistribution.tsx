import { useId, useMemo, useState } from 'react';
import { LabFrame, Select, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { distribution, parseSample, sampleMoments } from './core';
import { bars, vband } from './draw';

/** Наборы с лекции: задачи «найти xᵢ, pᵢ, P(xᵢ), ΣP, μ₁, μ₂, σ». */
const SETS = [
  { value: 'a', label: '10 чисел с лекции', data: '10 1 4 3 9 8 1 7 2 9' },
  { value: 'b', label: '15 чисел от 1 до 10', data: '10 6 10 10 3 6 6 1 10 7 10 8 3 6 7' },
  { value: 'c', label: '20 чисел от 1 до 5', data: '1 5 2 3 3 4 1 5 5 2 3 3 3 4 2 1 4 2 3 2' },
  { value: 'd', label: 'ещё 20 чисел от 1 до 5', data: '2 4 2 5 2 1 3 4 3 3 5 5 5 3 2 3 5 2 2 5' },
  { value: 'e', label: '15 чисел от 1 до 12', data: '2 11 8 2 4 10 9 8 10 1 12 12 1 9 12' },
  { value: 'coin', label: 'монетка: 50 бросков', data: '10101100001100101011 100010110001100001110110111011' },
];

const SERIES = {
  p: { label: 'P(xᵢ) — доля значения', color: 'accent', mark: 'bar' },
  mean: { label: 'среднее μ₁', color: 'signal', mark: 'dash' },
  sigma: { label: 'μ₁ ± σ', color: 'signal', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

const read = (text: string) => text.split(/\s+/).flatMap((chunk) => parseSample(chunk));
const f3 = (v: number) => (Number.isFinite(v) ? v.toFixed(3).replace(/\.?0+$/, '') : '—');

/** Лаборатория 1.1: выборка → распределение P(xᵢ) → моменты μ₁, μ₂, σ и погрешность среднего. */
export default function SampleDistribution() {
  const [set, setSet] = useState('a');
  const [text, setText] = useState(SETS[0]!.data);
  const inputId = useId();
  const xs = useMemo(() => read(text), [text]);
  const ok = xs.length >= 2;
  const d = useMemo(() => distribution(xs), [xs]);
  const m = useMemo(() => (ok ? sampleMoments(xs) : null), [xs, ok]);

  const ref = useCanvas((g, w, h) => {
    if (!ok || !m) return;
    const lo = Math.min(...d.x), hi = Math.max(...d.x);
    const gap = d.x.length > 1 ? Math.min(...d.x.slice(1).map((v, i) => v - d.x[i]!)) : 1;
    const bw = Math.min(gap, 1) * 0.7;
    const xmin = Math.min(lo - 1, m.mean - m.sigma - 0.5), xmax = Math.max(hi + 1, m.mean + m.sigma + 0.5);
    const ymax = Math.max(...d.p) * 1.25;
    const xt = niceTicks(xmin, xmax, w < 480 ? 6 : 10), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(g, w, h, { min: xmin, max: xmax, ticks: xt, format: tickFormat(xt), label: 'xᵢ' }, { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'P(xᵢ)' });
    f.clip(() => {
      vband(g, f, m.mean - m.sigma, m.mean + m.sigma, token(SERIES.sigma.color), 0.1);
      bars(g, f, d.x.map((x, i) => ({ x0: x - bw / 2, x1: x + bw / 2, y: d.p[i]! })), token(SERIES.p.color));
      markerLine(g, f, m.mean, `μ₁ = ${f3(m.mean)}`, token(SERIES.mean.color));
    });
  }, [d, m, ok]);

  return (
    <LabFrame
      n="1.1" kind="2D" title="Выборка → распределение → моменты"
      legend={Object.values(SERIES)}
      readout={m ? [
        { label: 'N', value: String(m.n) },
        { tex: '\\mu_1 = \\bar x', value: `= ${f3(m.mean)}` },
        { tex: '\\mu_2 = \\overline{x^2}', value: `= ${f3(m.mean2)}` },
        { tex: '\\sigma = \\sqrt{\\mu_2-\\mu_1^2}', value: `= ${f3(m.sigma)}` },
        { tex: '\\sigma_{\\bar x} = \\sigma/\\sqrt N', value: `= ${f3(m.sem)}` },
      ] : [{ label: 'нужно хотя бы два числа', value: '' }]}
      table={ok ? (
        <table>
          <thead><tr><th scope="col">xᵢ</th><th scope="col">сколько раз</th><th scope="col">P(xᵢ)</th></tr></thead>
          <tbody>
            {d.x.map((x, i) => <tr key={x}><td>{x}</td><td>{d.count[i]}</td><td>{f3(d.p[i]!)}</td></tr>)}
            <tr><td>Σ</td><td>{xs.length}</td><td>{f3(d.p.reduce((a, b) => a + b, 0))}</td></tr>
          </tbody>
        </table>
      ) : undefined}
      controls={<>
        <Select label="Набор" value={set} onChange={(v) => { setSet(v); setText(SETS.find((s) => s.value === v)?.data ?? ''); }} options={SETS.map(({ value, label }) => ({ value, label }))} />
        <label className="sg-lab-text" htmlFor={inputId}>
          <span>Числа выборки <small>— через пробел; можно вписать свои</small></span>
          <textarea id={inputId} rows={2} value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} />
        </label>
      </>}
      caption="Рис. 1.1. Столбец — доля, с которой значение встречается в выборке: $P(x_i) = n_i/N$, сумма долей равна 1. Среднее — $\mu_1 = \sum x_i P(x_i)$, средний квадрат — $\mu_2 = \sum x_i^2 P(x_i)$, разброс — $\sigma = \sqrt{\mu_2 - \mu_1^2}$. Погрешность среднего в $\sqrt N$ раз меньше разброса."
    >
      <canvas ref={ref} role="img" aria-label={m ? `Распределение выборки из ${m.n} чисел: среднее ${f3(m.mean)}, σ = ${f3(m.sigma)}` : 'Выборка пуста'} />
    </LabFrame>
  );
}
