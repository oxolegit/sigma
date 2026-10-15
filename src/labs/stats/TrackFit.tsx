import { useMemo, useState } from 'react';
import { Button, LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { dot, text } from './draw';
import { linearFit, sumSquares } from './fit';

const SERIES = {
  points: { label: 'координаты трека', color: 'ink', mark: 'ball' },
  line: { label: 'ваша прямая y = kx + b', color: 'accent', mark: 'line' },
  resid: { label: 'отклонения yᵢ − (kxᵢ + b)', color: 'signal', mark: 'dash' },
  best: { label: 'минимум S — решение МНК', color: 'signal', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const LECTURE = { x: [0, 10, 20, 30], y: [19, 31, 38, 47] };

/** Лаборатория 7.2: подберите прямую руками и сравните с МНК; снизу — карта S(k, b) с минимумом. */
export default function TrackFit() {
  const [set, setSet] = useState('lecture');
  const [seed, setSeed] = useState(1);
  const data = useMemo(() => {
    if (set === 'lecture') return LECTURE;
    const rng = mulberry32(seed * 977 + 1);
    const x = Array.from({ length: 10 }, (_, i) => i * 3.5);
    // Нормальный шум σ = 3 мм вокруг y = 0.8x + 15 (Бокс — Мюллер).
    return { x, y: x.map((v) => 0.8 * v + 15 + 3 * Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())) };
  }, [set, seed]);
  const fit = linearFit(data.x, data.y);
  const [k, setK] = useState(0.6);
  const [b, setB] = useState(25);
  const S = sumSquares(data.x, data.y, k, b);
  const kr: [number, number] = [0, 2], br: [number, number] = [5, 35];

  const ref = useCanvas((g, w, h) => {
    const top = Math.round(h * 0.55);
    const xt = niceTicks(-2, 34, w < 480 ? 5 : 8), yt = niceTicks(5, 55, 5);
    const f = drawFrame(g, w, top, { min: -2, max: 34, ticks: xt, format: tickFormat(xt), label: 'x, мм' }, { min: 5, max: 55, ticks: yt, format: tickFormat(yt), label: 'y, мм' }, { l: 48, r: 16, t: 26, b: 30 });
    f.clip(() => {
      g.save();
      g.strokeStyle = token(SERIES.resid.color);
      g.lineWidth = 1.5;
      g.setLineDash([4, 3]);
      data.x.forEach((x, i) => { g.beginPath(); g.moveTo(f.X(x), f.Y(data.y[i]!)); g.lineTo(f.X(x), f.Y(k * x + b)); g.stroke(); });
      g.restore();
      strokeCurve(g, [[f.X(-2), f.Y(k * -2 + b)], [f.X(34), f.Y(k * 34 + b)]], token(SERIES.line.color), 2.2);
      data.x.forEach((x, i) => dot(g, f.X(x), f.Y(data.y[i]!), 5, token(SERIES.points.color)));
    });
    // Карта S(k, b): чем темнее, тем меньше сумма квадратов (логарифмическая шкала).
    g.save();
    g.translate(0, top);
    const kt = niceTicks(kr[0], kr[1], 4), bt = niceTicks(br[0], br[1], 3);
    const m = drawFrame(g, w, h - top, { min: kr[0], max: kr[1], ticks: kt, format: tickFormat(kt), label: 'k' }, { min: br[0], max: br[1], ticks: bt, format: tickFormat(bt), label: 'b' }, { l: 48, r: 16, t: 14, b: 30 });
    const cell = 6, smin = fit.S, lmax = Math.log(sumSquares(data.x, data.y, kr[1], br[1]) / Math.max(smin, 1e-9) + 1);
    g.fillStyle = token('accent');
    for (let px = 0; px < m.width; px += cell) {
      for (let py = 0; py < m.height; py += cell) {
        const kk = kr[0] + ((px + cell / 2) / m.width) * (kr[1] - kr[0]);
        const bb = br[1] - ((py + cell / 2) / m.height) * (br[1] - br[0]);
        const v = Math.min(1, Math.log(sumSquares(data.x, data.y, kk, bb) / Math.max(smin, 1e-9) + 1) / lmax);
        g.globalAlpha = Math.max(0, 0.75 * (1 - v) ** 2);
        g.fillRect(m.left + px, m.top + py, cell, cell);
      }
    }
    g.globalAlpha = 1;
    dot(g, m.X(fit.k), m.Y(fit.b), 6, token(SERIES.best.color));
    dot(g, m.X(Math.min(kr[1], Math.max(kr[0], k))), m.Y(Math.min(br[1], Math.max(br[0], b))), 5, token(SERIES.line.color));
    text(g, 'ваши k, b', m.X(Math.min(kr[1], Math.max(kr[0], k))) + 9, m.Y(Math.min(br[1], Math.max(br[0], b))), token('ink'), 'left', 'middle', 500, 11);
    g.restore();
  }, [data, k, b, fit.k, fit.b, fit.S]);

  const ratio = S / Math.max(fit.S, 1e-9);
  return (
    <LabFrame
      n="7.2" kind="2D" title="МНК: трек частицы" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'S(k, b) = \\sum (y_i - kx_i - b)^2', value: `= ${S.toFixed(2)}` },
        { tex: 'S_{\\min}', value: `= ${fit.S.toFixed(2)}` },
        { label: 'МНК', value: `y = ${fit.k.toFixed(3)}x + ${fit.b.toFixed(2)}` },
      ]}
      status={{ tone: ratio < 1.05 ? 'ok' : ratio < 2 ? 'warn' : 'bad', text: ratio < 1.05 ? 'Вы нашли минимум суммы квадратов — это и есть прямая МНК.' : `Сумма квадратов в ${ratio.toFixed(1)} раза больше минимальной. Двигайте k и b к тёмному пятну на карте.` }}
      controls={<>
        <Segmented label="Данные" value={set} onChange={setSet} options={[{ value: 'lecture', label: 'трек с лекции' }, { value: 'noise', label: '10 точек с шумом' }]} />
        <Slider label="Наклон k" min={kr[0]} max={kr[1]} step={0.005} value={k} format={(v) => v.toFixed(3)} onChange={setK} />
        <Slider label="Сдвиг b" min={br[0]} max={br[1]} step={0.05} value={b} unit="мм" format={(v) => v.toFixed(2)} onChange={setB} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={() => { setK(fit.k); setB(fit.b); }}>Поставить МНК</Button>
          {set === 'noise' && <Button size="sm" onClick={() => setSeed((s) => s + 1)}>Новый шум</Button>}
        </div>
      </>}
      caption="Рис. 7.2. Сверху — точки трека и ваша прямая; пунктиры — отклонения. МНК выбирает $k$ и $b$, при которых сумма их квадратов $S$ минимальна: $\partial S/\partial k = \partial S/\partial b = 0$. Снизу — карта $S(k, b)$: чем темнее, тем меньше $S$. Минимум один и вытянут вдоль диагонали — $k$ и $b$ связаны: круче прямая — ниже её начало."
    >
      <canvas ref={ref} role="img" aria-label={`Сумма квадратов ${S.toFixed(2)}, минимум ${fit.S.toFixed(2)} при k = ${fit.k.toFixed(3)}, b = ${fit.b.toFixed(2)}`} />
    </LabFrame>
  );
}
