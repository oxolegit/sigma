import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { vband } from '../stats/draw';
import { ME, kin } from './physics';

/** Минимумы дифракции в опыте задачи 2.17: электроны 750 МэВ на ⁴⁰Ca. */
const MEASURED = [18, 31, 48];
const LB = kin(ME, 'T', 750).lambdaBar;
/** Форм-фактор однородного шара: F(x) = 3(sin x − x cos x)/x³. */
const F = (x: number) => (x < 1e-4 ? 1 : (3 * (Math.sin(x) - x * Math.cos(x))) / x ** 3);
const qR = (thetaDeg: number, R: number) => ((2 * Math.sin((thetaDeg * Math.PI) / 360)) / LB) * R;
/** Корни tg x = x — нули форм-фактора шара. */
const ZEROS = [4.4934, 7.7253, 10.9041];
const minimumAt = (k: number, R: number) => (360 / Math.PI) * Math.asin(Math.min(1, (ZEROS[k]! * LB) / (2 * R)));

const SERIES = {
  f: { label: '|F|² однородного шара радиуса R', color: 'accent', mark: 'line' },
  exp: { label: 'минимумы в опыте: 18°, 31°, 48°', color: 'signal', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 4.1: по углам дифракционных минимумов найти радиус ядра. */
export default function FormFactorLab() {
  const [R, setR] = useState(4.8);
  const pred = MEASURED.map((_, k) => minimumAt(k, R));
  const miss = Math.max(...pred.map((p, k) => Math.abs(p - MEASURED[k]!)));

  const ref = useCanvas((g, w, h) => {
    const xt = niceTicks(0, 60, 6);
    const yt = [1e-6, 1e-4, 1e-2, 1];
    const f = drawFrame(g, w, h, { min: 0, max: 60, ticks: xt, format: tickFormat(xt), label: 'θ, °' }, { min: 1e-7, max: 1.5, ticks: yt, format: decadeLabel, label: '|F(q)|²', log: true });
    f.clip(() => {
      for (const t of MEASURED) vband(g, f, t - 0.8, t + 0.8, token(SERIES.exp.color), 0.25);
      const pts: [number, number][] = [];
      for (let i = 1; i <= 600; i++) { const t = (60 * i) / 600; pts.push([f.X(t), f.Y(Math.max(1e-7, F(qR(t, R)) ** 2))]); }
      strokeCurve(g, pts, token(SERIES.f.color), 2.2);
    });
  }, [R]);

  return (
    <LabFrame
      n="4.1" kind="2D" title="Радиус ядра по дифракции электронов"
      legend={Object.values(SERIES)}
      status={miss < 1.5 ? { tone: 'ok', text: `Минимумы совпали с опытом: R ≈ ${R.toFixed(2)} фм, r₀ = R/A^{1/3} ≈ ${(R / Math.cbrt(40)).toFixed(2)} фм.` } : { tone: 'warn', text: `Минимумы модели — ${pred.map((p) => `${p.toFixed(0)}°`).join(', ')}. ${pred[0]! > MEASURED[0]! ? 'Ядро в модели мало — минимумы ушли на большие углы.' : 'Ядро в модели велико — минимумы прижались к малым углам.'}` }}
      readout={[
        { tex: '\\bar\\lambda', value: LB.toFixed(3), unit: 'фм' },
        { label: 'первый минимум', value: `${pred[0]!.toFixed(1)}°` },
        { tex: 'r_0 = R/A^{1/3}', value: (R / Math.cbrt(40)).toFixed(2), unit: 'фм' },
      ]}
      controls={<Slider label="Радиус ядра R" min={2.5} max={5.5} step={0.01} value={R} unit="фм" onChange={setR} />}
      caption="Рис. 4.1. Электроны с $T = 750$ МэВ имеют $\bar\lambda = 0.26$ фм — меньше ядра, поэтому видна дифракционная картина. Для однородного шара минимумы — там, где $qR = 4.49,\ 7.73,\ 10.9$, где $q = 2\sin(\theta/2)/\bar\lambda$. Все три минимума ложатся при $R \approx 3.7$ фм, то есть $r_0 \approx 1.1$ фм. Это радиус распределения заряда; $r_0 = 1.4$ фм в задачах учитывает и радиус действия ядерных сил."
    >
      <canvas ref={ref} role="img" aria-label={`R = ${R.toFixed(2)} фм, первый минимум на ${pred[0]!.toFixed(1)}°`} />
    </LabFrame>
  );
}
