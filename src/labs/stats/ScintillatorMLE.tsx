import { useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { bisect } from './density';
import { hline, text } from './draw';
import { BAR, mlePosition, negLogL, ratioPosition } from './fit';
import { samplePoisson } from './poisson';

const SERIES = {
  L: { label: 'L(x) − L_min = −ln l(x) + const', color: 'accent', mark: 'line' },
  mle: { label: 'оценка МП: минимум L', color: 'accent', mark: 'dash' },
  ratio: { label: 'оценка по отношению A₁/A₂', color: 'ink-muted', mark: 'dash' },
  truth: { label: 'где частица прошла на самом деле', color: 'signal', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Интервал ±1σ по правдоподобию: L(x) − L_min = ½. */
function interval(a1: number, a2: number, xh: number): [number, number] {
  const L0 = negLogL(xh, a1, a2);
  const g = (x: number) => negLogL(x, a1, a2) - L0 - 0.5;
  const lo = g(0) > 0 ? bisect(g, 0, xh) : 0;
  const hi = g(BAR.length) > 0 ? bisect(g, xh, BAR.length) : BAR.length;
  return [lo, hi];
}

/** Лаборатория 8.1: где частица пересекла сцинтиллятор — по амплитудам двух ФЭУ методом максимального правдоподобия. */
export default function ScintillatorMLE() {
  const [a1, setA1] = useState(18);
  const [a2, setA2] = useState(30);
  const [truth, setTruth] = useState<number | null>(null);
  const [seed, setSeed] = useState(1);
  const xh = mlePosition(a1, a2), xr = ratioPosition(a1, a2);
  const [lo, hi] = interval(a1, a2, xh);

  const shoot = () => {
    const rng = mulberry32(seed * 7717 + 3);
    setSeed((s) => s + 1);
    const x = 0.3 + rng() * (BAR.length - 0.6);
    const l1 = BAR.a0 * Math.exp(-x / BAR.d), l2 = BAR.a0 * Math.exp(-(BAR.length - x) / BAR.d);
    setTruth(x);
    setA1(Math.max(1, samplePoisson(l1, rng)));
    setA2(Math.max(1, samplePoisson(l2, rng)));
  };

  const ref = useCanvas((g, w, h) => {
    // Сверху — сцинтиллятор с двумя ФЭУ.
    const top = Math.min(84, h * 0.3), pad = 48;
    const X = (x: number) => pad + (x / BAR.length) * (w - pad - 16);
    const y = top / 2 + 4, bh = 18;
    g.save();
    g.fillStyle = token('surface-1');
    g.strokeStyle = token('rule-strong');
    g.fillRect(X(0), y - bh / 2, X(BAR.length) - X(0), bh);
    g.strokeRect(X(0) + 0.5, y - bh / 2 + 0.5, X(BAR.length) - X(0) - 1, bh - 1);
    g.fillStyle = token('ink-muted');
    for (const [x0, dir] of [[X(0), -1], [X(BAR.length), 1]] as const) {
      g.beginPath(); g.moveTo(x0, y - bh / 2); g.lineTo(x0 + dir * 22, y - bh); g.lineTo(x0 + dir * 22, y + bh); g.lineTo(x0, y + bh / 2); g.closePath(); g.fill();
    }
    g.restore();
    text(g, `ФЭУ 1: ${a1}`, X(0), y + bh + 4, token('ink'), 'left', 'top', 600, 12);
    text(g, `ФЭУ 2: ${a2}`, X(BAR.length), y + bh + 4, token('ink'), 'right', 'top', 600, 12);
    g.save();
    g.globalAlpha = 0.25;
    g.fillStyle = token(SERIES.mle.color);
    g.fillRect(X(lo), y - bh / 2, X(hi) - X(lo), bh);
    g.restore();
    const tick = (x: number, color: string, width: number) => { g.save(); g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(X(x), y - bh); g.lineTo(X(x), y + bh / 2); g.stroke(); g.restore(); };
    if (truth !== null) tick(truth, token(SERIES.truth.color), 3);
    tick(xh, token(SERIES.mle.color), 2.5);
    // Снизу — функция L(x).
    g.save();
    g.translate(0, top + 8);
    const L0 = negLogL(xh, a1, a2);
    let lmax = 0;
    for (let i = 0; i <= 100; i++) lmax = Math.max(lmax, negLogL((BAR.length * i) / 100, a1, a2) - L0);
    // Ось — до 8: важна форма ямы у минимума, а не высота краёв.
    const ymax = Math.min(Math.max(3, lmax * 1.05), 8);
    const xt = niceTicks(0, BAR.length, 6), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(g, w, h - top - 8, { min: 0, max: BAR.length, ticks: xt, format: tickFormat(xt), label: 'x от ФЭУ 1, м' }, { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'L − L_min' }, { l: pad, r: 16, t: 22, b: 34 });
    f.clip(() => {
      hline(g, f, 0.5, token('ink-muted'), undefined, [2, 4]);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 300; i++) { const x = (BAR.length * i) / 300; pts.push([f.X(x), f.Y(negLogL(x, a1, a2) - L0)]); }
      strokeCurve(g, pts, token(SERIES.L.color), 2.2);
      markerLine(g, f, xh, `x̂ = ${xh.toFixed(2)} м`, token(SERIES.mle.color), 0);
      markerLine(g, f, xr, `по отношению ${xr.toFixed(2)} м`, token(SERIES.ratio.color), 1);
      if (truth !== null) markerLine(g, f, truth, `истина ${truth.toFixed(2)} м`, token(SERIES.truth.color), 2);
    });
    g.restore();
  }, [a1, a2, xh, xr, lo, hi, truth]);

  return (
    <LabFrame
      n="8.1" kind="2D" title="Где прошла частица" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\hat x', value: `= ${xh.toFixed(2)}`, unit: 'м' },
        { label: 'интервал ±1σ (ΔL = ½)', value: `${lo.toFixed(2)} … ${hi.toFixed(2)}`, unit: 'м' },
        { label: 'по отношению A₁/A₂', value: xr.toFixed(2), unit: 'м' },
      ]}
      controls={<>
        <Slider tex="A_1" label=" — амплитуда ФЭУ 1" min={1} max={60} step={1} value={a1} unit="ф.э." onChange={(v) => { setA1(v); setTruth(null); }} />
        <Slider tex="A_2" label=" — амплитуда ФЭУ 2" min={1} max={60} step={1} value={a2} unit="ф.э." onChange={(v) => { setA2(v); setTruth(null); }} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={shoot}>Пропустить частицу</Button>
          <Button variant="ghost" size="sm" onClick={() => { setA1(18); setA2(30); setTruth(null); }}>Задача с лекции</Button>
        </div>
      </>}
      caption="Рис. 8.1. Сцинтиллятор 6 м, свет ослабевает как $A(x) = A_0e^{-x/d}$, $A_0 = 50$ ф.э., $d = 2$ м. Число фотоэлектронов — пуассоновское: $P(A_i) = \lambda_i^{A_i}e^{-\lambda_i}/A_i!$, где $\lambda_1 = A_0e^{-x/d}$, $\lambda_2 = A_0e^{-(6-x)/d}$. Правдоподобие $l(x) = P(A_1)P(A_2)$, а $L = -\ln l$ — минимизируем. Где $L$ поднялась на ½ — границы интервала ±1σ (закрашен на стержне)."
    >
      <canvas ref={ref} role="img" aria-label={`Амплитуды ${a1} и ${a2}: оценка ${xh.toFixed(2)} м от первого ФЭУ`} />
    </LabFrame>
  );
}
