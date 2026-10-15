import { useMemo, useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { normalize, probBetween, shape, SHAPES, uniformShape } from './density';
import { fillUnder, fnPath, hline, vband } from './draw';

const SERIES = {
  f: { label: 'плотность f(x) = C·y(x)', color: 'accent', mark: 'line' },
  area: { label: 'P(x₁ < x < x₂) — площадь', color: 'accent', mark: 'bar' },
  F: { label: 'функция распределения F(x)', color: 'signal', mark: 'line' },
  mean: { label: 'x̄ и x̄ ± σ', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const f3 = (v: number) => v.toFixed(3);

/** Лаборатория 2.1: ненормированная y(x) → плотность f(x) → F(x), x̄, σ и вероятность интервала. */
export default function DensityLab() {
  const [id, setId] = useState('up');
  const [a, setA] = useState(1);
  const [b, setB] = useState(3);
  const s = id === 'uniform' ? uniformShape(Math.min(a, b - 0.2), Math.max(b, a + 0.2)) : shape(id);
  const [v0, v1] = s.view;
  const [x1, setX1] = useState(1.5);
  const [x2, setX2] = useState(2.5);
  const lo = Math.max(v0, Math.min(x1, x2)), hi = Math.min(v1, Math.max(x1, x2));
  const d = useMemo(() => normalize(s), [s.id, s.support[0], s.support[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const P = probBetween(d, lo, hi);

  const ref = useCanvas((g, w, h) => {
    const half = Math.round(h * 0.56);
    let fmax = 0;
    for (let i = 0; i <= 400; i++) fmax = Math.max(fmax, d.f(v0 + ((v1 - v0) * i) / 400));
    const xt = niceTicks(v0, v1, w < 480 ? 5 : 8);
    const yt = niceTicks(0, fmax * 1.2, 4);
    const fr = drawFrame(g, w, half, { min: v0, max: v1, ticks: xt, format: tickFormat(xt) }, { min: 0, max: fmax * 1.2, ticks: yt, format: tickFormat(yt), label: 'f(x)' }, { l: 48, r: 16, t: 26, b: 22 });
    fr.clip(() => {
      vband(g, fr, d.mean - d.sigma, d.mean + d.sigma, token(SERIES.mean.color), 0.08);
      fillUnder(g, fr, d.f, lo, hi, token(SERIES.area.color), 0.24);
      for (const p of fnPath(fr, d.f, v0, v1, 800)) strokeCurve(g, p, token(SERIES.f.color), 2.2);
      markerLine(g, fr, d.mean, `x̄ = ${f3(d.mean)}`, token(SERIES.mean.color));
    });
    g.save();
    g.translate(0, half);
    const ft = [0, 0.5, 1];
    const fr2 = drawFrame(g, w, h - half, { min: v0, max: v1, ticks: xt, format: tickFormat(xt), label: 'x' }, { min: 0, max: 1.08, ticks: ft, format: tickFormat([0, 0.5]), label: 'F(x)' }, { l: 48, r: 16, t: 18, b: 34 });
    fr2.clip(() => {
      vband(g, fr2, lo, hi, token(SERIES.area.color), 0.1);
      hline(g, fr2, d.F(lo), token(SERIES.F.color), undefined, [3, 4]);
      hline(g, fr2, d.F(hi), token(SERIES.F.color), undefined, [3, 4]);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 200; i++) { const x = v0 + ((v1 - v0) * i) / 200; pts.push([fr2.X(x), fr2.Y(d.F(x))]); }
      strokeCurve(g, pts, token(SERIES.F.color), 2);
    });
    g.restore();
  }, [d, lo, hi, v0, v1]);

  return (
    <LabFrame
      n="2.1" kind="2D" title="От функции к плотности вероятности" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { tex: `C = 1\\big/\\!\\int y\\,dx`, value: `= ${f3(d.c)}` },
        { tex: '\\bar x', value: `= ${f3(d.mean)}` },
        { tex: '\\overline{x^2}', value: `= ${f3(d.mean2)}` },
        { tex: '\\sigma', value: `= ${f3(d.sigma)}` },
        { tex: `P(${lo.toFixed(2)} < x < ${hi.toFixed(2)})`, value: `= ${f3(P)}` },
      ]}
      controls={<>
        <Select label="Функция y(x)" value={id} onChange={setId} options={SHAPES.map((x) => ({ value: x.id, label: x.label }))} />
        {id === 'uniform' && <>
          <Slider label="Левый край a" min={0.2} max={3} step={0.05} value={a} format={(v) => v.toFixed(2)} onChange={setA} />
          <Slider label="Правый край b" min={1} max={3.8} step={0.05} value={b} format={(v) => v.toFixed(2)} onChange={setB} />
        </>}
        <Slider label="Начало интервала x₁" min={v0} max={v1} step={(v1 - v0) / 400} value={x1} format={(v) => v.toFixed(2)} onChange={setX1} />
        <Slider label="Конец интервала x₂" min={v0} max={v1} step={(v1 - v0) / 400} value={x2} format={(v) => v.toFixed(2)} onChange={setX2} />
      </>}
      caption="Рис. 2.1. Сверху — плотность: площадь под ней равна 1, поэтому ненормированную $y(x)$ умножают на $C = 1/\int y\,dx$. Закрашенная площадь — вероятность попасть в $(x_1; x_2)$. Снизу — функция распределения $F(x) = \int_{-\infty}^{x} f\,dt$: та же вероятность — разность $F(x_2) - F(x_1)$ между пунктирами."
    >
      <canvas ref={ref} role="img" aria-label={`Плотность ${s.label}: C = ${f3(d.c)}, среднее ${f3(d.mean)}, σ = ${f3(d.sigma)}, вероятность интервала ${f3(P)}`} />
    </LabFrame>
  );
}
