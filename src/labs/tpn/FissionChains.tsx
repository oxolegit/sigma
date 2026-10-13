import { useMemo, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, strokeCurve } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { chain, extinctFraction, extinction, fissionProbability } from './ensemble';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  alive: { label: 'цепочка жива к 40-му поколению', color: 'accent', mark: 'line' },
  dead: { label: 'цепочка угасла (крестик — где)', color: 'ink-muted', mark: 'line' },
  mean: { label: 'среднее по ансамблю kᵍ', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const RUNS = 40, GENS = 40, CAP = 1e4;
const MANY = 5000, MANY_GENS = 200, MANY_CAP = 400;

/** Лаборатория 10.4: 40 цепочек деления от одного нейтрона и вероятность угасания q. */
export default function FissionChains() {
  const [k, setK] = useState(1.05);
  const [seed, setSeed] = useState(1);
  const [many, setMany] = useState<{ k: number; q: number } | null>(null);
  const runs = useMemo(() => {
    const rng = mulberry32(seed * 7919 + Math.round(k * 100));
    return Array.from({ length: RUNS }, () => chain(k, GENS, CAP, rng));
  }, [k, seed]);
  const q = extinction(k);
  const dead = runs.filter((h) => h[GENS] === 0).length;

  const ref = useCanvas((g, w, h) => {
    const f = drawFrame(
      g, w, h,
      { min: 0, max: GENS, ticks: [0, 10, 20, 30, 40], label: 'поколение g' },
      { min: 0.5, max: 1e6, ticks: decadeTicks(1, 1e6, w < 480 ? 4 : 7), format: decadeLabel, label: 'число нейтронов', log: true },
    );
    f.clip(() => {
      // Сначала угасшие, поверх — живые.
      for (const alive of [false, true]) {
        const s = alive ? SERIES.alive : SERIES.dead;
        for (const hist of runs) {
          if ((hist[GENS]! > 0) !== alive) continue;
          const pts: [number, number][] = [];
          let end = -1;
          for (let gen = 0; gen < hist.length; gen++) {
            if (hist[gen] === 0) { end = gen; break; }
            pts.push([f.X(gen), f.Y(hist[gen]!)]);
          }
          strokeCurve(g, pts, token(s.color), alive ? 1.8 : 1);
          if (end > 0) {
            // Крестик на месте угасания: форма, а не только цвет, отличает угасшие цепочки.
            const x = f.X(end - 1), y = f.Y(hist[end - 1]!);
            g.strokeStyle = token(s.color);
            g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x - 4, y + 4); g.lineTo(x + 4, y - 4); g.stroke();
          }
        }
      }
      const det: [number, number][] = [];
      for (let gen = 0; gen <= GENS; gen++) det.push([f.X(gen), f.Y(k ** gen)]);
      strokeCurve(g, det, token(SERIES.mean.color), 2.2, [7, 5]);
    });
  }, [runs, k]);

  const estimate = () => {
    const rng = mulberry32(seed * 104729 + Math.round(k * 100));
    setMany({ k, q: extinctFraction(k, MANY, MANY_GENS, MANY_CAP, rng) });
  };

  return (
    <LabFrame
      n="10.4" kind="2D" title="Цепочки деления от одного нейтрона"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'вероятность деления p = k/ν̄', value: fissionProbability(k).toFixed(3) },
        { label: 'угасание q (теория)', value: `${(100 * q).toFixed(1)} %` },
        { label: `угасли из ${RUNS} к 40-му поколению`, value: String(dead) },
        { label: `угасли из ${MANY.toLocaleString('ru-RU')}`, value: many && many.k === k ? `${(100 * many.q).toFixed(1)} %` : '–' },
      ]}
      controls={<>
        <Slider label="Коэффициент размножения k" min={0.8} max={1.3} step={0.01} value={k} format={(v) => v.toFixed(2)} onChange={setK} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={() => setSeed((s) => s + 1)}>Ещё 40 цепочек</Button>
          <Button variant="ghost" size="sm" onClick={estimate}>Оценить по 5000 цепочек</Button>
        </div>
      </>}
      caption="Рис. 10.4. Каждый нейтрон делит ядро с вероятностью $p = k/\bar\nu$ и даёт ν нейтронов по таблице P(ν) для ²³⁵U. Шкала числа нейтронов логарифмическая. Даже при $k > 1$ большинство цепочек гаснет в первых поколениях. Вырвавшиеся выше $10^4$ нейтронов дальше растут почти точно как $k^g$: при больших числах флуктуации малы (снова $1/\sqrt N$), и дальше их считаем без розыгрыша."
    >
      <canvas ref={ref} role="img" aria-label={`40 цепочек при k = ${k.toFixed(2)}: угасли ${dead}, теоретическая вероятность угасания ${(100 * q).toFixed(1)} %`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
