import { useMemo, useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { sci } from '../../lib/format';
import { drawFrame, markerLine, niceTicks, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { maxwell, spectrumStats, watt } from './fission';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  chi: { label: 'спектр χ(E)', color: 'accent', mark: 'line' },
  above: { label: 'нейтроны выше Ec', color: 'accent', mark: 'bar' },
  mean: { label: 'средняя энергия', color: 'signal', mark: 'dash' },
  mode: { label: 'наиболее вероятная', color: 'ink', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const MODELS = { watt: { fn: watt, name: 'Уатт' }, maxwell: { fn: (E: number) => maxwell(E), name: 'Максвелл' } } as const;
type Model = keyof typeof MODELS;

/** Лаборатория 2.3: спектр мгновенных нейтронов деления и доля, рождающаяся выше заданной энергии. */
export default function FissionSpectrum() {
  const [model, setModel] = useState<Model>('watt');
  const [Ec, setEc] = useState(1);
  const chi = MODELS[model].fn;
  const st = useMemo(() => spectrumStats(chi), [chi]);
  const frac = st.above(Ec);

  const ref = useCanvas((g, w, h) => {
    const f = drawFrame(
      g, w, h,
      { min: 0, max: 10, ticks: niceTicks(0, 10, w < 480 ? 5 : 10), label: 'E, МэВ' },
      { min: 0, max: 0.4, ticks: [0, 0.1, 0.2, 0.3, 0.4], format: (v) => v.toFixed(1), label: 'χ(E), 1/МэВ' },
    );
    const pts: [number, number][] = [];
    for (let E = 0.002; E <= 10; E += 0.02) pts.push([f.X(E), f.Y(chi(E))]);
    f.clip(() => {
      // Площадь под кривой выше Ec — доля нейтронов.
      if (Ec < 10) {
        g.fillStyle = token(SERIES.above.color);
        g.globalAlpha = 0.22;
        g.beginPath();
        g.moveTo(f.X(Ec), f.Y(0));
        for (let E = Ec; E <= 10; E += 0.02) g.lineTo(f.X(E), f.Y(chi(E)));
        g.lineTo(f.X(10), f.Y(0));
        g.closePath();
        g.fill();
        g.globalAlpha = 1;
      }
      strokeCurve(g, pts, token(SERIES.chi.color), 2);
    });
    markerLine(g, f, st.mean, `среднее ${st.mean.toFixed(2)}`, token(SERIES.mean.color));
    markerLine(g, f, st.mode, `максимум ${st.mode.toFixed(2)}`, token(SERIES.mode.color), 1);
  }, [model, Ec]);

  return (
    <LabFrame
      n="2.3" kind="2D" title="Спектр деления ²³⁵U"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'средняя энергия', value: st.mean.toFixed(2), unit: 'МэВ' },
        { label: 'наиболее вероятная', value: st.mode.toFixed(2), unit: 'МэВ' },
        { label: 'доля выше Ec', value: frac > 1e-3 ? (100 * frac).toFixed(1) : sci(100 * frac, 2), unit: '%' },
      ]}
      controls={<>
        <Segmented label="Аппроксимация" value={model} onChange={(v) => setModel(v as Model)} options={[{ value: 'watt', label: 'Уатт' }, { value: 'maxwell', label: 'Максвелл' }]} />
        <Slider label="Порог Ec" min={0} max={15} step={0.05} value={Ec} unit="МэВ" format={(v) => v.toFixed(2)} onChange={setEc} />
      </>}
      caption="Рис. 2.3. Поставьте $E_c = 1$ МэВ — примерно порог деления ²³⁸U: около 70 % нейтронов деления рождаются выше него, но до деления ²³⁸U доходят немногие — раньше они замедляются при неупругом рассеянии. При 12 МэВ доля порядка $10^{-4}$ (около 0.02 %), поэтому спектр обрезают на 12 МэВ. Максвелловская аппроксимация — с $T = 1.32$ МэВ."
    >
      <canvas ref={ref} role="img" aria-label={`Спектр деления (${MODELS[model].name}): средняя энергия ${st.mean.toFixed(2)} МэВ, выше ${Ec} МэВ — ${(100 * frac).toFixed(1)} %`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
