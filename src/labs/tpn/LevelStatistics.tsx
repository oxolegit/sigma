import { useMemo, useState } from 'react';
import { Button, LabFrame, Segmented, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, strokeCurve } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { ladderCapture, levelLadder, poisson, porterThomas, wigner } from './quantum';

/** Серии рисунка: по этой таблице рисуются все три графика и строится легенда. */
const SERIES = {
  capture: { label: 'сечение захвата σc(E) лестницы', color: 'accent', mark: 'line' },
  sample: { label: 'гистограмма выборки', color: 'accent', mark: 'bar' },
  law: { label: 'Вигнер / Портер — Томас', color: 'ink', mark: 'line' },
  poisson: { label: 'Пуассон', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

type Law = 'wigner' | 'poisson';

/** Нормированная гистограмма значений на [0, max] в виде ступенек (x, плотность). */
function histogram(values: number[], max: number, bins: number): [number, number][] {
  const h = new Array<number>(bins).fill(0), bw = max / bins;
  for (const v of values) { const b = Math.floor(v / bw); if (b < bins) h[b]!++; }
  return h.flatMap((c, i) => { const d = c / (values.length * bw); return [[i * bw, d], [(i + 1) * bw, d]] as [number, number][]; });
}

/** Лаборатория 9.4: статистический ансамбль резонансов — расстояния и ширины. */
export default function LevelStatistics() {
  const [law, setLaw] = useState<Law>('wigner');
  const [seed, setSeed] = useState(1);
  const levels = useMemo(() => levelLadder(law, mulberry32(seed * 7919 + (law === 'wigner' ? 0 : 1))), [law, seed]);

  const ref = useCanvas((g, w, h) => {
    const h1 = Math.round(h * 0.45);
    // Верх: сечение лестницы резонансов.
    const f = drawFrame(g, w, h1, { min: 0, max: 400, ticks: [0, 100, 200, 300, 400], label: 'E, эВ' }, { min: 0.01, max: 1e5, ticks: decadeTicks(0.01, 1e5, 4), format: decadeLabel, label: 'σc, барн', log: true });
    const grid: number[] = [];
    for (let i = 0; i <= 2500; i++) grid.push(0.5 + (i * 399.5) / 2500);
    for (const r of levels) if (r.E < 400) { const G = r.Gn + 0.023; for (let k = -30; k <= 30; k++) grid.push(r.E + (k * G) / 4); }
    grid.sort((a, b) => a - b);
    f.clip(() => strokeCurve(g, grid.filter((E) => E > 0.5 && E <= 400).map((E) => [f.X(E), f.Y(ladderCapture(levels, E))]), token(SERIES.capture.color), 1.2));

    // Низ: гистограммы расстояний и ширин рядом.
    const mean = levels.reduce((s, l) => s + l.spacing, 0) / levels.length;
    const panel = (x0: number, pw: number, values: number[], ymax: number, xLabel: string, yLabel: string, laws: [(v: number) => number, keyof typeof SERIES][]) => {
      g.save();
      g.translate(x0, h1);
      const fr = drawFrame(g, pw, h - h1, { min: 0, max: 4, ticks: [0, 1, 2, 3, 4], label: xLabel }, { min: 0, max: ymax, ticks: [0, ymax / 2, ymax], format: (v) => v.toFixed(1), label: yLabel }, { l: 36, r: 10, t: 26, b: 34 });
      const hist = histogram(values, 4, 20);
      fr.clip(() => {
        const c = token(SERIES.sample.color);
        g.fillStyle = c;
        g.globalAlpha = 0.22;
        for (let i = 0; i < hist.length; i += 2) {
          const [a, d] = hist[i]!, [b] = hist[i + 1]!;
          g.fillRect(fr.X(a), fr.Y(d), fr.X(b) - fr.X(a), fr.Y(0) - fr.Y(d));
        }
        g.globalAlpha = 1;
        for (const [fn, key] of laws) {
          const pts: [number, number][] = [];
          for (let v = 0.02; v <= 4; v += 0.02) pts.push([fr.X(v), fr.Y(fn(v))]);
          strokeCurve(g, pts, token(SERIES[key].color), 2, key === 'poisson' ? [5, 4] : []);
        }
      });
      g.restore();
    };
    panel(0, w / 2, levels.map((l) => l.spacing / mean), 1.2, 's = D/⟨D⟩', 'P(s)', [[wigner, 'law'], [poisson, 'poisson']]);
    panel(w / 2, w / 2, levels.map((l) => l.x), 1.6, 'x = Γn/⟨Γn⟩', 'P(x)', [[porterThomas, 'law']]);
  }, [levels]);

  const close = levels.filter((l) => l.spacing < 0.2).length / levels.length;

  return (
    <LabFrame
      n="9.4" kind="2D" title="Статистический ансамбль резонансов" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'уровней', value: String(levels.length) },
        { label: 'близких пар (s < 0.2)', value: `${(100 * close).toFixed(1)} %` },
        { label: 'ожидание: Вигнер / Пуассон', value: '3.1 % / 18.1 %' },
      ]}
      controls={<>
        <Segmented label="Закон расстояний" value={law} onChange={(v) => setLaw(v as Law)} options={[{ value: 'wigner', label: 'Вигнер' }, { value: 'poisson', label: 'Пуассон' }]} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((x) => x + 1)}>Новая лестница</Button></div>
      </>}
      caption="Рис. 9.4. Сверху — сечение захвата «лестницы» из 400 уровней со средним расстоянием 20 эВ; снизу слева — распределение расстояний между соседними уровнями, справа — распределение нейтронных ширин. По Вигнеру уровни «отталкиваются»: очень близкие пары редки. Для независимых уровней было бы распределение Пуассона. Ширины по Портеру — Томасу: много слабых резонансов и немного сильных — отсюда «гребёнка» разной высоты."
    >
      <canvas ref={ref} role="img" aria-label={`Лестница из ${levels.length} уровней по закону ${law === 'wigner' ? 'Вигнера' : 'Пуассона'}: близких пар ${(100 * close).toFixed(1)} %`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
