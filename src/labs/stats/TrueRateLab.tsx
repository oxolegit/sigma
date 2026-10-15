import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, hline } from './draw';
import { measuredParalyzable, paralyzableIterations, paralyzableRoots, secondOrderRoots, trueRate } from './poisson';

const SERIES = {
  curve: { label: 'ν_д = ν_и·e^(−ν_и τ) — что видит детектор', color: 'accent', mark: 'line' },
  measured: { label: 'измерено: N/t', color: 'signal', mark: 'dash' },
  roots: { label: 'решения: физическое и лишнее', color: 'signal', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const fmtN = (lg: number) => Math.round(10 ** lg).toLocaleString('ru-RU');
const r1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');

/** Лаборатория 6.2: «истинная» скорость счёта по N событиям за t при мёртвом времени τ — приближения и точный корень. */
export default function TrueRateLab() {
  const [lgN, setLgN] = useState(Math.log10(2370));
  const [t, setT] = useState(10);
  const [tauUs, setTauUs] = useState(500);
  const N = Math.round(10 ** lgN), tau = tauUs * 1e-6;
  const m = N / t;
  const first = trueRate(N, t, tau);
  const second = secondOrderRoots(m, tau);
  const roots = paralyzableRoots(m, tau);
  const iters = paralyzableIterations(m, tau, 4);

  const ref = useCanvas((g, w, h) => {
    const xmin = Math.max(1, m / 4), xmax = 40 / tau;
    const peak = measuredParalyzable(1 / tau, tau);
    const ymax = Math.max(peak, m) * 1.25;
    const xt = decadeTicks(xmin, xmax), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(g, w, h, { min: xmin, max: xmax, ticks: xt, format: decadeLabel, label: 'истинная ν_и, с⁻¹', log: true }, { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'ν_д, с⁻¹' });
    f.clip(() => {
      hline(g, f, m, token(SERIES.measured.color), `N/t = ${r1(m)}`);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 400; i++) { const v = xmin * (xmax / xmin) ** (i / 400); pts.push([f.X(v), f.Y(measuredParalyzable(v, tau))]); }
      strokeCurve(g, pts, token(SERIES.curve.color), 2.2);
      if (roots) for (const r of roots) dot(g, f.X(r), f.Y(m), 6, token(SERIES.roots.color));
    });
  }, [m, tau, roots]);

  const exact = roots?.[0] ?? NaN;
  return (
    <LabFrame
      n="6.2" kind="2D" title="Истинная скорость счёта"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'измерено', value: r1(m), unit: 'с⁻¹' },
        { tex: '\\nu_{\\text{д}}\\tau', value: `= ${(m * tau).toFixed(3)}` },
        { tex: '\\nu_{\\text{и}} = \\frac{N}{t - N\\tau}', value: first.rate > 0 ? `= ${r1(first.rate)} ± ${r1(first.sigma)}` : '— (Nτ ≥ t)', unit: 'с⁻¹' },
      ]}
      status={roots
        ? { tone: m * tau < 0.2 ? 'ok' : 'warn', text: m * tau < 0.2 ? `Поправка мала (ν_дτ = ${(m * tau).toFixed(2)}): первое приближение отличается от точного корня на ${(100 * Math.abs(first.rate - exact) / exact).toFixed(1)} %.` : `Поправка велика (ν_дτ = ${(m * tau).toFixed(2)}): линейное приближение ошибается на ${(100 * Math.abs(first.rate - exact) / exact).toFixed(0)} % — нужен точный корень.` }
        : { tone: 'bad', text: 'Такой скорости детектор с этим τ показать не может: максимум ν_д = 1/(eτ). Проверьте данные.' }}
      table={
        <table>
          <thead><tr><th scope="col">способ</th><th scope="col">формула</th><th scope="col">ν_и, с⁻¹</th></tr></thead>
          <tbody>
            <tr><td>без поправки</td><td>N/t</td><td>{r1(m)}</td></tr>
            <tr><td>первое приближение</td><td>e^(ντ) ≈ 1 + ντ</td><td>{first.rate > 0 ? r1(first.rate) : '—'}</td></tr>
            <tr><td>второе приближение</td><td>+ (ντ)²/2, меньший корень</td><td>{r1(second[0])}</td></tr>
            <tr><td>итерации</td><td>ν ← ν_д·e^(ντ)</td><td>{iters.slice(1).map(r1).join(' → ')}</td></tr>
            <tr><td>точное решение</td><td>ν_д = ν e^(−ντ)</td><td>{r1(exact)}</td></tr>
            <tr><td>лишний корень</td><td>справа от 1/τ</td><td>{roots ? Math.round(roots[1]).toLocaleString('ru-RU') : '—'}</td></tr>
          </tbody>
        </table>
      }
      controls={<>
        <Slider label="Событий N" min={2} max={5} step={0.005} value={lgN} format={fmtN} onChange={setLgN} />
        <Slider label="Время t" min={1} max={100} step={1} value={t} unit="с" onChange={setT} />
        <Slider tex="\tau" label=" — мёртвое время" min={10} max={2000} step={10} value={tauUs} unit="мкс" onChange={setTauUs} />
      </>}
      caption="Рис. 6.2. Детектор видит только события, перед которыми за τ ничего не было: $\nu_{\text{д}} = \nu_{\text{и}}e^{-\nu_{\text{и}}\tau}$. Горизонталь — измеренная скорость; она пересекает кривую дважды. Физическое решение — левое, около измеренной скорости; правое (тысячи и десятки тысяч с⁻¹) — режим, где детектор «захлёбывается». Начальные числа — задача с лекции: 2370 нейтронов за 10 с при τ = 500 мкс."
    >
      <canvas ref={ref} role="img" aria-label={`Измерено ${r1(m)} с⁻¹, истинная скорость ${r1(exact)} с⁻¹`} />
    </LabFrame>
  );
}
