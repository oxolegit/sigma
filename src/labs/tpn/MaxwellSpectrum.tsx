import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { densitySpectrum, fluxSpectrum, kT, oneOverVAverage, T0, vMean, vT } from './ensemble';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  density: { label: 'плотность n(E)', color: 'accent', mark: 'line' },
  flux: { label: 'поток Φ(E) = n(E)V', color: 'signal', mark: 'dash' },
  mode: { label: 'наиболее вероятные энергии', color: 'ink', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Энергии на оси — в мэВ (при комнатной температуре kT = 25 мэВ); шкала постоянная, чтобы при нагреве спектр сдвигался. */
const MEV = 1000;

/** Лаборатория 10.2: максвелловский спектр тепловых нейтронов по плотности и по потоку. */
export default function MaxwellSpectrum() {
  const [T, setT] = useState(T0);
  const th = kT(T) * MEV;
  const xmax = 300;

  const ref = useCanvas((g, w, h) => {
    const ymax = 1.15 * densitySpectrum(th / 2, th);
    const xt = niceTicks(0, xmax, w < 480 ? 4 : 8), yt = niceTicks(0, ymax, 4);
    const f = drawFrame(
      g, w, h,
      { min: 0, max: xmax, ticks: xt, format: tickFormat(xt), label: 'E, мэВ' },
      { min: 0, max: ymax, ticks: yt, format: tickFormat(yt), label: 'доля на 1 мэВ' },
    );
    const n: [number, number][] = [], phi: [number, number][] = [];
    for (let i = 0; i <= 400; i++) {
      const E = (xmax * i) / 400;
      n.push([f.X(E), f.Y(densitySpectrum(E, th))]);
      phi.push([f.X(E), f.Y(fluxSpectrum(E, th))]);
    }
    f.clip(() => {
      strokeCurve(g, n, token(SERIES.density.color), 2);
      strokeCurve(g, phi, token(SERIES.flux.color), 2, [7, 5]);
    });
    markerLine(g, f, th / 2, 'kT/2 — максимум n(E)', token(SERIES.mode.color));
    markerLine(g, f, th, 'kT — максимум Φ(E)', token(SERIES.mode.color), 1);
  }, [th]);

  return (
    <LabFrame
      n="10.2" kind="2D" title="Максвелловский спектр: плотность и поток"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'kT', value: (kT(T)).toFixed(4), unit: 'эВ' },
        { tex: 'V_T', value: `= ${Math.round(vT(T)).toLocaleString('ru-RU')}`, unit: 'м/с' },
        { tex: '\\bar V', value: `= ${Math.round(vMean(T)).toLocaleString('ru-RU')}`, unit: 'м/с' },
        { label: 'средняя энергия: n / Φ', value: `${(1.5 * kT(T)).toFixed(4)} / ${(2 * kT(T)).toFixed(4)}`, unit: 'эВ' },
        { tex: '\\bar\\sigma/\\sigma_0\\ (1/V)', value: `= ${oneOverVAverage(T).toFixed(3)}` },
      ]}
      controls={<Slider label="Температура среды" min={100} max={1200} step={1} value={T} unit="К" format={(v) => v.toFixed(v === T0 ? 1 : 0)} onChange={setT} />}
      caption="Рис. 10.2. Поток сдвинут к большим энергиям: быстрые нейтроны чаще пересекают площадки. При $T = 293.6$ К получаются $kT = 0.0253$ эВ и $V_T = 2200$ м/с — «тепловая точка». Для 1/V-поглотителя среднее по потоку сечение равно $\frac{\sqrt\pi}{2}\sigma_0\sqrt{T_0/T}$: при нагреве оно падает как $1/\sqrt T$."
    >
      <canvas ref={ref} role="img" aria-label={`Спектры Максвелла при T = ${Math.round(T)} К: максимум плотности ${(th / 2).toFixed(1)} мэВ, максимум потока ${th.toFixed(1)} мэВ`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
