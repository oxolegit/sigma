import { useMemo, useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { bisect, cauchy, fwhm, gauss, normalize, shape } from './density';
import { fillUnder, fnPath, hline } from './draw';

interface Dist { label: string; tex: string; pdf: (x: number) => number; cdf: (x: number) => number; q: (eta: number) => number; mean: number | null; view: [number, number] }

const gam = normalize(shape('gamma'));
const DISTS: Record<string, Dist> = {
  cauchy: { label: 'Коши', tex: 'f = \\frac{1}{\\pi}\\cdot\\frac{1}{1+x^2}', pdf: (x) => cauchy.pdf(x), cdf: (x) => cauchy.cdf(x), q: (e) => cauchy.quantile(e), mean: null, view: [-6, 6] },
  gauss: { label: 'Гаусс', tex: 'f = \\frac{1}{\\sqrt{2\\pi}}e^{-x^2/2}', pdf: (x) => gauss.pdf(x), cdf: (x) => gauss.cdf(x), q: (e) => gauss.quantile(e), mean: 0, view: [-4, 4] },
  gamma: { label: 'x²e⁻ˣ/2', tex: 'f = \\tfrac12 x^2 e^{-x}', pdf: gam.f, cdf: (x) => (x <= 0 ? 0 : 1 - Math.exp(-x) * (1 + x + (x * x) / 2)), q: (e) => bisect((x) => 1 - Math.exp(-x) * (1 + x + (x * x) / 2) - e, 0, 60), mean: 3, view: [-0.5, 11] },
};

const SERIES = {
  f: { label: 'плотность f(x)', color: 'accent', mark: 'line' },
  area: { label: 'площадь η слева от квантиля', color: 'accent', mark: 'bar' },
  F: { label: 'F(x) и уровень η', color: 'signal', mark: 'line' },
  half: { label: 'FWHM на полувысоте', color: 'ink', mark: 'line' },
  marks: { label: 'медиана, среднее', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const f3 = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '—');

/** Лаборатория 4.1: квантиль — где F(x) = η; медиана — η = ½; FWHM — ширина на половине максимума. */
export default function QuantileLab() {
  const [id, setId] = useState('cauchy');
  const [eta, setEta] = useState(0.75);
  const d = DISTS[id]!;
  const [v0, v1] = d.view;
  const xq = d.q(eta), med = d.q(0.5);
  const w = useMemo(() => fwhm(d.pdf, v0, v1), [d, v0, v1]);

  const ref = useCanvas((g, cw, h) => {
    const half = Math.round(h * 0.56);
    const xt = niceTicks(v0, v1, cw < 480 ? 6 : 10);
    const ymax = w.max * 1.2, yt = niceTicks(0, ymax, 4);
    const fr = drawFrame(g, cw, half, { min: v0, max: v1, ticks: xt, format: tickFormat(xt) }, { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'f(x)' }, { l: 48, r: 16, t: 26, b: 22 });
    fr.clip(() => {
      fillUnder(g, fr, d.pdf, v0, Math.min(xq, v1), token(SERIES.area.color), 0.22);
      for (const p of fnPath(fr, d.pdf, v0, v1, 600)) strokeCurve(g, p, token(SERIES.f.color), 2.2);
      // FWHM: отрезок на полувысоте между точками пересечения.
      const yh = fr.Y(w.max / 2);
      arrow(g, fr.X(w.mode), yh, fr.X(w.left), yh, token(SERIES.half.color), 1.5, 8);
      arrow(g, fr.X(w.mode), yh, fr.X(w.right), yh, token(SERIES.half.color), 1.5, 8);
      markerLine(g, fr, med, 'медиана', token(SERIES.marks.color), 0);
      if (d.mean !== null && Math.abs(d.mean - med) > 0.05) markerLine(g, fr, d.mean, 'среднее', token(SERIES.marks.color), 1);
    });
    g.save();
    g.translate(0, half);
    const ft = [0, 0.5, 1];
    const fr2 = drawFrame(g, cw, h - half, { min: v0, max: v1, ticks: xt, format: tickFormat(xt), label: 'x' }, { min: 0, max: 1.05, ticks: ft, format: tickFormat([0, 0.5]), label: 'F(x)' }, { l: 48, r: 16, t: 18, b: 34 });
    fr2.clip(() => {
      hline(g, fr2, eta, token(SERIES.F.color), `η = ${eta.toFixed(2)}`, [4, 4]);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 300; i++) { const x = v0 + ((v1 - v0) * i) / 300; pts.push([fr2.X(x), fr2.Y(d.cdf(x))]); }
      strokeCurve(g, pts, token(SERIES.F.color), 2);
      if (xq > v0 && xq < v1) arrow(g, fr2.X(xq), fr2.Y(eta), fr2.X(xq), fr2.Y(0) - 2, token(SERIES.F.color), 1.5, 8, [3, 3]);
    });
    g.restore();
  }, [d, eta, xq, med, w, v0, v1]);

  return (
    <LabFrame
      n="4.1" kind="2D" title="Квантиль, медиана и FWHM" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { tex: `x_{${eta.toFixed(2)}}`, value: `= ${f3(xq)}` },
        { label: 'медиана', value: f3(med) },
        { label: 'мода', value: f3(w.mode) },
        { label: 'FWHM', value: f3(w.width) },
        { label: 'среднее', value: d.mean === null ? 'не существует' : f3(d.mean) },
      ]}
      controls={<>
        <Segmented label="Распределение" value={id} onChange={setId} options={Object.entries(DISTS).map(([value, x]) => ({ value, label: x.label }))} />
        <Slider tex="\eta" label=" — вероятность" min={0.01} max={0.99} step={0.01} value={eta} format={(v) => v.toFixed(2)} onChange={setEta} />
      </>}
      caption="Рис. 4.1. Квантиль $x_\eta$ — значение, которое величина не превышает с вероятностью $\eta$: слева от него площадь $\eta$, на нижнем графике $F(x_\eta) = \eta$. Медиана — $x_{0.5}$. FWHM — ширина на половине высоты максимума. У распределения Коши интеграл $\int x f\,dx$ расходится: среднего нет, а медиана и FWHM = 2 есть."
    >
      <canvas ref={ref} role="img" aria-label={`${d.label}: квантиль ${eta.toFixed(2)} равен ${f3(xq)}, медиана ${f3(med)}, FWHM ${f3(w.width)}`} />
    </LabFrame>
  );
}
