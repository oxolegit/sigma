import { useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, plotFont, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { fn, FUNCTIONS, secantSlope, tangent } from './derivative';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  graph: { label: 'график y = f(x)', color: 'ink', mark: 'line' },
  secant: { label: 'секущая через x₀ и x₀ + Δx', color: 'signal', mark: 'dash' },
  tangent: { label: 'касательная в x₀', color: 'accent', mark: 'line' },
  points: { label: 'точки x₀ и x₀ + Δx', color: 'ink', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** Лаборатория 1.1: секущая поворачивается к касательной, когда Δx → 0. */
export default function SecantTangent() {
  const [id, setId] = useState('sq');
  const [x0, setX0] = useState(1);
  const [dx, setDx] = useState(1);
  const f = fn(id);
  const p = Math.min(Math.max(x0, f.dom[0]), f.dom[1]);
  // Δx не даём выйти за область определения (у √x — левее нуля).
  const h = Math.abs(dx) < 1e-9 ? 1e-9 : p + dx < f.dom[0] ? f.dom[0] - p || 1e-9 : dx;
  const sec = secantSlope(f, p, h);
  const d = f.df(p);
  const left = secantSlope(f, p, -0.001), right = secantSlope(f, p, 0.001);

  const ref = useCanvas((g, w, hh) => {
    const xt = niceTicks(f.x[0], f.x[1], w < 480 ? 5 : 8), yt = niceTicks(f.y[0], f.y[1], 5);
    const fr = drawFrame(g, w, hh, { min: f.x[0], max: f.x[1], ticks: xt, format: tickFormat(xt), label: 'x' }, { min: f.y[0], max: f.y[1], ticks: yt, format: tickFormat(yt), label: 'y' });
    const curve = (fun: (x: number) => number, color: string, width: number, dash: number[] = []) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 400; i++) {
        const x = f.x[0] + ((f.x[1] - f.x[0]) * i) / 400;
        const y = fun(x);
        if (Number.isFinite(y)) pts.push([fr.X(x), fr.Y(y)]);
      }
      strokeCurve(g, pts, color, width, dash);
    };
    fr.clip(() => {
      curve((x) => (x < f.dom[0] - 1e-9 && f.id === 'sqrt' ? NaN : f.f(x)), token(SERIES.graph.color), 2.2);
      curve((x) => f.f(p) + sec * (x - p), token(SERIES.secant.color), 1.8, [7, 5]);
      if (Number.isFinite(d)) curve(tangent(f, p), token(SERIES.tangent.color), 2);
      // Точки касания и второй точки секущей.
      for (const x of [p, p + h]) {
        g.fillStyle = token(SERIES.points.color);
        g.strokeStyle = token('surface-1');
        g.lineWidth = 2;
        g.beginPath(); g.arc(fr.X(x), fr.Y(f.f(x)), 5.5, 0, 2 * Math.PI); g.fill(); g.stroke();
      }
      // Δx и Δy — катеты треугольника секущей.
      g.strokeStyle = token('ink-muted');
      g.setLineDash([3, 3]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(fr.X(p), fr.Y(f.f(p))); g.lineTo(fr.X(p + h), fr.Y(f.f(p)));
      g.lineTo(fr.X(p + h), fr.Y(f.f(p + h)));
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = token('ink-muted');
      g.font = plotFont(600, 12);
      g.textAlign = 'center';
      g.textBaseline = f.f(p + h) >= f.f(p) ? 'top' : 'bottom';
      g.fillText('Δx', fr.X(p + h / 2), fr.Y(f.f(p)) + (f.f(p + h) >= f.f(p) ? 4 : -4));
      g.textAlign = h > 0 ? 'left' : 'right';
      g.textBaseline = 'middle';
      g.fillText('Δy', fr.X(p + h) + (h > 0 ? 6 : -6), fr.Y((f.f(p) + f.f(p + h)) / 2));
    });
  }, [id, p, h]);

  const status = Number.isFinite(d)
    ? { tone: Math.abs(sec - d) < 0.01 ? 'ok' as const : 'warn' as const, text: Math.abs(sec - d) < 0.01 ? `Секущая почти совпала с касательной: при малом Δx наклон Δy/Δx ≈ f′(x₀) = ${fmt(d)}.` : `Наклон секущей ${fmt(sec)} пока отличается от f′(x₀) = ${fmt(d)} на ${fmt(Math.abs(sec - d))}. Уменьшайте Δx.` }
    : { tone: 'bad' as const, text: `В точке x₀ = ${fmt(p, 2)} производной нет: справа Δy/Δx → ${fmt(right, 2)}, слева → ${fmt(left, 2)}. Пределы с разных сторон разные — у графика излом.` };

  return (
    <LabFrame
      n="1.1" kind="2D" title="Секущая и касательная"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\Delta y/\\Delta x', value: `= ${fmt(sec)}` },
        { tex: `f'(x_0) = ${f.dtex.replace(/x/g, 'x_0')}`, value: `= ${fmt(d)}` },
        { label: 'разница', value: Number.isFinite(d) ? fmt(Math.abs(sec - d)) : '—' },
      ]}
      status={status}
      controls={<>
        <Select label="Функция" value={id} onChange={setId} options={FUNCTIONS.map((x) => ({ value: x.id, label: x.label }))} />
        <Slider label="Точка x₀" min={f.dom[0]} max={f.dom[1]} step={0.01} value={p} format={(v) => v.toFixed(2)} onChange={setX0} />
        <Slider label="Приращение Δx" min={-1.5} max={1.5} step={0.001} value={dx} format={(v) => v.toFixed(3)} onChange={setDx} />
      </>}
      caption="Рис. 1.1. Секущая проходит через точки графика с абсциссами $x_0$ и $x_0+\Delta x$; её наклон — отношение $\Delta y/\Delta x$. Когда $\Delta x \to 0$, секущая поворачивается к касательной, а отношение стремится к $f'(x_0)$ — это и есть определение производной. У $|x|$ в нуле пределы справа и слева разные, касательной нет."
    >
      <canvas ref={ref} role="img" aria-label={`График ${f.label}: в x₀ = ${fmt(p, 2)} наклон секущей ${fmt(sec)}, производная ${fmt(d)}`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
