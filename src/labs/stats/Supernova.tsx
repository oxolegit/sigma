import { useMemo, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { dot, text } from './draw';
import { diskPoint, galaxyMeanDistance, galaxyWithin } from './geometry';

/** Диск Галактики: радиус 50 тыс. св. лет, Солнце в 26 тыс. св. лет от центра (как на слайде). */
const R = 50, D = 26, N = 1500;
const MEAN = galaxyMeanDistance(R, D);

const SERIES = {
  near: { label: 'вспышка ближе r', color: 'accent', mark: 'ball' },
  far: { label: 'вспышка дальше r', color: 'ink-muted', mark: 'ball' },
  sun: { label: 'Солнце и круг радиуса r', color: 'signal', mark: 'line' },
  curve: { label: 'P(ρ < r) — точно', color: 'accent', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 3.2: сверхновые вспыхивают равномерно по диску — какова вероятность, что ближе r? */
export default function Supernova() {
  const [r, setR] = useState(20);
  const [seed, setSeed] = useState(1);
  const pts = useMemo(() => {
    const rng = mulberry32(seed * 31337 + 5);
    return Array.from({ length: N }, () => diskPoint(rng, R));
  }, [seed]);
  const near = pts.filter(([x, y]) => Math.hypot(x - D, y) < r).length;
  const P = galaxyWithin(r, R, D);

  const ref = useCanvas((g, w, h) => {
    // Широкий экран: диск слева, кривая справа; узкий — диск сверху, кривая снизу.
    const wide = w >= 560;
    const dh = wide ? h : Math.round(h * 0.56);
    const side = Math.min(dh - 16, wide ? w * 0.48 : w - 16);
    const cx = wide ? side / 2 + 8 : w / 2, cy = dh / 2, k = side / 2 / (R + 2);
    // Диск Галактики и точки вспышек.
    g.save();
    g.fillStyle = token('surface-1');
    g.strokeStyle = token('rule-strong');
    g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R * k, 0, 2 * Math.PI); g.fill(); g.stroke();
    g.restore();
    for (const [x, y] of pts) {
      const isNear = Math.hypot(x - D, y) < r;
      g.fillStyle = token(isNear ? SERIES.near.color : SERIES.far.color);
      g.globalAlpha = isNear ? 0.9 : 0.35;
      g.beginPath(); g.arc(cx + x * k, cy - y * k, isNear ? 2.2 : 1.6, 0, 2 * Math.PI); g.fill();
    }
    g.globalAlpha = 1;
    g.save();
    g.strokeStyle = token(SERIES.sun.color);
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.beginPath(); g.arc(cx + D * k, cy, r * k, 0, 2 * Math.PI); g.stroke();
    g.restore();
    dot(g, cx + D * k, cy, 5, token(SERIES.sun.color));
    dot(g, cx, cy, 3, token('ink'));
    text(g, 'центр', cx, cy + 8, token('ink-muted'), 'center', 'top', 500, 11);
    text(g, 'Солнце', cx + D * k, cy - 10, token(SERIES.sun.color), 'center', 'bottom');
    // Точная вероятность P(ρ < r) и текущая точка.
    g.save();
    g.translate(wide ? side + 24 : 0, wide ? 0 : dh);
    const pw = wide ? w - side - 24 : w;
    const ph = wide ? h : h - dh;
    const xt = niceTicks(0, R + D, 4), yt = niceTicks(0, 1, 4);
    const f = drawFrame(g, pw, ph, { min: 0, max: R + D, ticks: xt, format: tickFormat(xt), label: 'r, тыс. св. лет' }, { min: 0, max: 1, ticks: yt, format: tickFormat(yt), label: 'P(ρ < r)' });
    f.clip(() => {
      const c: [number, number][] = [];
      for (let i = 0; i <= 200; i++) { const x = ((R + D) * i) / 200; c.push([f.X(x), f.Y(galaxyWithin(x, R, D))]); }
      strokeCurve(g, c, token(SERIES.curve.color), 2);
      dot(g, f.X(r), f.Y(P), 5, token(SERIES.sun.color));
    });
    g.restore();
  }, [pts, r, P]);

  return (
    <LabFrame
      n="3.2" kind="2D" title="Сверхновая в Галактике" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'P(\\rho < r)', value: `= ${P.toFixed(3)}` },
        { label: `Монте-Карло: ${near} из ${N}`, value: `= ${(near / N).toFixed(3)}` },
        { label: 'среднее расстояние', value: MEAN.toFixed(1), unit: 'тыс. св. лет' },
      ]}
      controls={<>
        <Slider label="Радиус r, тыс. св. лет" min={0} max={R + D} step={0.5} value={r} format={(v) => v.toFixed(1)} onChange={setR} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((x) => x + 1)}>Новые {N} вспышек</Button></div>
      </>}
      caption="Рис. 3.2. Геометрическая вероятность: вспышки равномерны по площади диска, поэтому $P(\rho < r)$ — доля площади диска внутри круга радиуса $r$ вокруг Солнца. Пока круг целиком внутри, $P = r^2/R^2$; дальше считается площадь пересечения двух кругов. Кривая — точный ответ, точки на диске — его проверка Монте-Карло."
    >
      <canvas ref={ref} role="img" aria-label={`Вероятность вспышки ближе ${r} тыс. св. лет: ${P.toFixed(3)}`} />
    </LabFrame>
  );
}
