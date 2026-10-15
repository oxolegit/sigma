import { useMemo, useState } from 'react';
import { Button, LabFrame, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { runningMean, sampleMoments } from './core';
import { hline } from './draw';

const SERIES = {
  run: { label: 'среднее первых N бросков', color: 'accent', mark: 'line' },
  band: { label: '½ ± σ/√N, σ = ½', color: 'signal', mark: 'bar' },
  half: { label: 'p = ½', color: 'ink-muted', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const MAX = 20000;

/** Лаборатория 1.2: среднее бросков монеты сходится к ½, коридор сужается как 1/√N. */
export default function CoinMean() {
  const [seed, setSeed] = useState(1);
  const [n, setN] = useState(10);
  const flips = useMemo(() => {
    const rng = mulberry32(seed * 7919 + 13);
    return Array.from({ length: MAX }, () => (rng() < 0.5 ? 1 : 0));
  }, [seed]);
  const xs = flips.slice(0, n);
  const run = useMemo(() => runningMean(xs), [xs]);
  const m = sampleMoments(xs);
  const sem = 0.5 / Math.sqrt(n);

  const ref = useCanvas((g, w, h) => {
    const nmax = Math.max(10, n);
    const xt = decadeTicks(1, nmax), yt = niceTicks(0, 1, 4);
    const f = drawFrame(g, w, h, { min: 1, max: nmax, ticks: xt, format: decadeLabel, label: 'число бросков N', log: true }, { min: 0, max: 1, ticks: yt, format: tickFormat(yt), label: 'доля «1»' });
    f.clip(() => {
      // Коридор ½ ± 0.5/√N — по всей оси N.
      g.save();
      g.globalAlpha = 0.14;
      g.fillStyle = token(SERIES.band.color);
      g.beginPath();
      const steps = 200;
      for (let i = 0; i <= steps; i++) { const k = nmax ** (i / steps); g.lineTo(f.X(k), f.Y(0.5 + 0.5 / Math.sqrt(k))); }
      for (let i = steps; i >= 0; i--) { const k = nmax ** (i / steps); g.lineTo(f.X(k), f.Y(0.5 - 0.5 / Math.sqrt(k))); }
      g.closePath(); g.fill();
      g.restore();
      hline(g, f, 0.5, token(SERIES.half.color));
      // Не больше ~1500 точек на кривой: дальше их всё равно не различить.
      const stride = Math.max(1, Math.floor(run.length / 1500));
      const pts: [number, number][] = [];
      for (let i = 0; i < run.length; i += stride) pts.push([f.X(i + 1), f.Y(run[i]!)]);
      pts.push([f.X(run.length), f.Y(run[run.length - 1]!)]);
      strokeCurve(g, pts, token(SERIES.run.color), 2);
    });
  }, [run, n]);

  const dev = Math.abs(m.mean - 0.5) / sem;
  return (
    <LabFrame
      n="1.2" kind="2D" title="Монетка: погрешность среднего"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'бросков', value: n.toLocaleString('ru-RU') },
        { tex: '\\bar x', value: `= ${m.mean.toFixed(4)}` },
        { tex: '\\sigma', value: `= ${m.sigma.toFixed(3)}` },
        { tex: '\\sigma_{\\bar x} = \\sigma/\\sqrt N', value: `= ${(m.sigma / Math.sqrt(n)).toFixed(4)}` },
      ]}
      status={{
        tone: dev <= 1 ? 'ok' : dev <= 2 ? 'warn' : 'bad',
        text: `Среднее отличается от ½ на ${dev.toFixed(1)} σ_x̄. ${dev <= 1 ? 'Внутри коридора — так бывает примерно в 68 % серий.' : dev <= 2 ? 'Между 1σ и 2σ — так бывает в каждой четвёртой серии.' : 'Дальше 2σ — редкая серия, около 5 %.'}`,
      }}
      controls={<div className="sg-lab-buttons">
        <Button variant="primary" size="sm" onClick={() => setN((k) => Math.min(MAX, k + 1))}>Бросить 1 раз</Button>
        <Button size="sm" onClick={() => setN((k) => Math.min(MAX, k + 100))}>+100</Button>
        <Button size="sm" onClick={() => setN((k) => Math.min(MAX, k * 10))}>×10</Button>
        <Button variant="ghost" size="sm" onClick={() => { setSeed((s) => s + 1); setN(10); }}>Новая серия</Button>
      </div>}
      caption="Рис. 1.2. Монетка: «1» — орёл, «0» — решка, $\sigma = \tfrac12$. Ошибка среднего $\sigma_{\bar x} = \sigma/\sqrt N$: чтобы уменьшить её вдвое, бросков нужно вчетверо больше. Ось N — логарифмическая, поэтому коридор сужается равномерно."
    >
      <canvas ref={ref} role="img" aria-label={`${n} бросков: доля единиц ${m.mean.toFixed(3)}, погрешность ${sem.toFixed(3)}`} />
    </LabFrame>
  );
}
