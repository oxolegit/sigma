import { useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { sci } from '../../lib/format';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot } from '../stats/draw';
import { NA, rutherfordDSigma, rutherfordFraction } from './physics';

const FOILS = {
  Au: { label: 'золото', Z: 79, A: 196.97, rho: 19.3 },
  Al: { label: 'алюминий', Z: 13, A: 26.98, rho: 2.7 },
} as const;
const ANGLES = [15, 45, 75, 105, 135, 165];
const deg = Math.PI / 180;

const SERIES = {
  curve: { label: 'ожидаемое число за 2 мин', color: 'accent', mark: 'line' },
  pts: { label: 'углы задачи 4.3', color: 'signal', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 8.2: опыт Резерфорда — сколько α-частиц поймает детектор под углом θ. */
export default function RutherfordCountsLab() {
  const [foil, setFoil] = useState<keyof typeof FOILS>('Au');
  const [T, setT] = useState(5.3);
  const [um, setUm] = useState(5);
  const F = FOILS[foil];
  const nA = ((F.rho / F.A) * NA) * um * 1e-4;
  const N = 2.5e5 * 120, dOmega = 0.5 / 25 ** 2;
  const counts = (t: number) => N * nA * rutherfordDSigma(2, F.Z, T, t * deg) * 1e-26 * dOmega;
  const back = rutherfordFraction(2, F.Z, T, nA, 90 * deg, Math.PI);

  const ref = useCanvas((g, w, h) => {
    const xt = niceTicks(0, 180, 6);
    const lo = 1e-3, hi = 1e5;
    const f = drawFrame(g, w, h, { min: 0, max: 180, ticks: xt, format: tickFormat(xt), label: 'θ, °' }, { min: lo, max: hi, ticks: decadeTicks(lo, hi, 5), format: decadeLabel, label: 'срабатываний', log: true });
    f.clip(() => {
      const pts: [number, number][] = [];
      for (let t = 3; t <= 180; t += 0.5) pts.push([f.X(t), f.Y(counts(t))]);
      strokeCurve(g, pts, token(SERIES.curve.color), 2.4);
      for (const t of ANGLES) dot(g, f.X(t), f.Y(counts(t)), 5, token(SERIES.pts.color));
    });
  }, [foil, T, um]);

  return (
    <LabFrame
      n="8.2" kind="2D" title="Опыт Резерфорда: счёт под углом"
      legend={Object.values(SERIES)}
      readout={[
        ...ANGLES.slice(0, 3).map((t) => ({ label: `${t}°`, value: counts(t) >= 10 ? counts(t).toFixed(0) : counts(t).toFixed(2) })),
        { label: 'доля назад, θ > 90°', value: sci(back, 2) },
      ]}
      status={{ tone: 'ok', text: `Назад отражается одна α-частица из ${sci(1 / back, 2)} — но отражается: у атома есть маленькое тяжёлое ядро.` }}
      controls={<>
        <Segmented label="Фольга" value={foil} onChange={(v) => setFoil(v as keyof typeof FOILS)} options={Object.entries(FOILS).map(([value, f]) => ({ value, label: f.label }))} />
        <Slider label="Энергия α-частиц T" min={3} max={10} step={0.1} value={T} unit="МэВ" onChange={setT} />
        <Slider label="Толщина фольги" min={1} max={20} step={0.5} value={um} unit="мкм" onChange={setUm} />
      </>}
      caption="Рис. 8.2. Условия задачи 4.3: поток $2.5\cdot10^5$ α/с, 2 мин, детектор 0.5 см² на 25 см. Число $dN = N\,n a\left(\frac{zZe^2}{4\pi\varepsilon_0\,4T}\right)^2\frac{d\Omega}{\sin^4(\theta/2)}$ падает от 15° к 165° в тысячи раз. Удвоить скорость — уменьшить счёт в 16 раз, золото на алюминий — в 36 раз (задача 4.4)."
    >
      <canvas ref={ref} role="img" aria-label={`Под 15° — ${counts(15).toFixed(0)} срабатываний`} />
    </LabFrame>
  );
}
