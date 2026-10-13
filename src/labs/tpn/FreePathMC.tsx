import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { densityHistogram, firstCollisionDensity, sampleFreePath, transmission } from './freePath';

const BINS = 25;

/** Серии рисунка: по этой таблице красится график и строится легенда. */
const SERIES = {
  hist: { label: 'точки первого столкновения (МК)', color: 'accent', mark: 'bar' },
  theory: { label: 'теория w(x) = Σe^{−Σx}', color: 'accent-strong', mark: 'line' },
  layer: { label: 'толщина слоя X', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const fmt = (d: number) => (v: number) => v.toFixed(d);

/** Лаборатория 4.2: Монте-Карло пробега. Розыгрыш x = −ln ξ / Σ сравнивается с w(x) = Σe^{−Σx}. */
export default function FreePathMC() {
  const [sigma, setSigma] = useState(0.5);
  const [X, setX] = useState(2);
  const xs = useRef<number[]>([]);
  const rng = useRef(mulberry32(2007));
  const [n, setN] = useState(0);

  const add = useCallback((count: number) => {
    for (let i = 0; i < count; i++) xs.current.push(sampleFreePath(sigma, rng.current));
    setN(xs.current.length);
  }, [sigma]);

  // Новое сечение — новая выборка: старые пробеги разыграны с другим Σ.
  useEffect(() => {
    xs.current = [];
    add(300);
  }, [add]);

  const N = xs.current.length;
  const mean = N ? xs.current.reduce((a, b) => a + b, 0) / N : NaN;
  const passed = N ? xs.current.filter((x) => x > X).length / N : NaN;

  const ref = useCanvas((g, w, h) => {
    const xmax = Math.max(5 / sigma, X * 1.15);
    const ymax = sigma * 1.15;
    const f = drawFrame(
      g, w, h,
      { min: 0, max: xmax, ticks: niceTicks(0, xmax, w < 480 ? 4 : 6), format: (v) => (xmax < 6 ? v.toFixed(1) : String(v)), label: 'x, см' },
      { min: 0, max: ymax, ticks: niceTicks(0, ymax, 4), format: (v) => v.toFixed(ymax < 0.6 ? 2 : 1), label: 'w(x), 1/см' },
    );
    const hist = densityHistogram(xs.current, BINS, xmax);
    const bw = xmax / BINS;
    f.clip(() => {
      // Заливка — цвет серии с прозрачностью 0.22, как знак «столбец» в легенде.
      g.fillStyle = token(SERIES.hist.color);
      g.strokeStyle = token(SERIES.hist.color);
      g.lineWidth = 1;
      hist.forEach((v, b) => {
        if (!v) return;
        const x0 = f.X(b * bw), x1 = f.X((b + 1) * bw), y = f.Y(v), y0 = f.Y(0);
        g.globalAlpha = 0.22;
        g.fillRect(x0, y, x1 - x0, y0 - y);
        g.globalAlpha = 1;
        g.strokeRect(Math.round(x0) + 0.5, Math.round(y) + 0.5, Math.round(x1 - x0), Math.round(y0 - y));
      });
      const pts: [number, number][] = [];
      for (let k = 0; k <= 200; k++) {
        const x = (xmax * k) / 200;
        pts.push([f.X(x), f.Y(firstCollisionDensity(sigma, x))]);
      }
      strokeCurve(g, pts, token(SERIES.theory.color), 2);
    });
    markerLine(g, f, X, `X = ${X.toFixed(1)} см`, token(SERIES.layer.color));
  }, [sigma, X, n]);

  return (
    <LabFrame
      n="4.2" kind="2D" title="Монте-Карло пробега"
      actions={<Button variant="ghost" size="sm" onClick={() => { xs.current = []; setN(0); }}>Сбросить</Button>}
      legend={Object.values(SERIES)}
      readout={[
        { label: 'нейтронов', value: String(N) },
        { label: 'средний пробег', value: N ? mean.toFixed(2) : '–', unit: 'см' },
        { tex: '\\lambda = 1/\\Sigma_t', value: `= ${(1 / sigma).toFixed(2)}`, unit: 'см' },
        { label: 'прошли слой: МК / теория', value: `${N ? passed.toFixed(3) : '–'} / ${transmission(sigma, X).toFixed(3)}` },
      ]}
      controls={<>
        <Slider tex="\Sigma_t" min={0.2} max={2} step={0.05} value={sigma} unit="см⁻¹" format={fmt(2)} onChange={setSigma} />
        <Slider label="Толщина слоя X" min={0.1} max={8} step={0.1} value={X} unit="см" format={fmt(1)} onChange={setX} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={() => add(200)}>+ 200 нейтронов</Button>
          <Button size="sm" onClick={() => add(5000)}>+ 5000</Button>
        </div>
      </>}
      caption="Рис. 4.2. Каждому нейтрону разыгрывается пробег $x = -\ln\xi/\Sigma_t$, где $\xi$ — случайное число из (0, 1). Гистограмма точек первого столкновения ложится на теоретическую плотность $w(x) = \Sigma_t e^{-\Sigma_t x}$; чем больше нейтронов, тем точнее средний пробег совпадает с $\lambda$."
    >
      <canvas ref={ref} role="img" aria-label={`Гистограмма пробегов: ${N} нейтронов, средний пробег ${N ? mean.toFixed(2) : 'нет'} см, теория λ = ${(1 / sigma).toFixed(2)} см`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
