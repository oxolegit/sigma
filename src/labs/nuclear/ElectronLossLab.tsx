import { useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, markerLine, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot } from '../stats/draw';
import { MATERIALS, criticalEnergy, radLength, radToIon, type MaterialKey } from './physics';

const MATS: MaterialKey[] = ['N', 'C', 'Al', 'Fe', 'Cu', 'Pb'];
const SERIES = {
  rad: { label: 'радиационные T/l_рад', color: 'accent', mark: 'line' },
  ion: { label: 'ионизационные (по 4.12)', color: 'signal', mark: 'line' },
  sum: { label: 'сумма', color: 'ink', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const f2 = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));

/** Лаборатория 10.1: у электрона два канала потерь — ионизация и тормозное излучение. */
export default function ElectronLossLab() {
  const [mk, setMk] = useState<MaterialKey>('Cu');
  const [lgT, setLgT] = useState(Math.log10(70));
  const [mm, setMm] = useState(1);
  const m = MATERIALS[mk];
  const l = radLength(m.Z, m.A);
  const T0 = 10 ** lgT;
  const rad = (T: number) => T / l;
  const ion = (T: number) => rad(T) / radToIon(T, m.Z);
  const Tc = criticalEnergy(m.Z);
  const xg = (mm / 10) * m.rho;
  const Tout = T0 * Math.exp(-xg / l);

  const ref = useCanvas((g, w, h) => {
    const x0 = 1, x1 = 1e4;
    const ys = [0.01, 0.1, 1, 10, 100, 1000];
    const f = drawFrame(g, w, h, { min: x0, max: x1, ticks: decadeTicks(x0, x1, 5), format: decadeLabel, label: 'T, МэВ', log: true }, { min: 0.01, max: 2000, ticks: ys, format: decadeLabel, label: '−dE/dx, МэВ/(г/см²)', log: true });
    f.clip(() => {
      const line = (fn: (T: number) => number) => Array.from({ length: 121 }, (_, i) => { const T = x0 * (x1 / x0) ** (i / 120); return [f.X(T), f.Y(fn(T))] as [number, number]; });
      strokeCurve(g, line(rad), token(SERIES.rad.color), 2.4);
      strokeCurve(g, line(ion), token(SERIES.ion.color), 2.4);
      strokeCurve(g, line((T) => rad(T) + ion(T)), token(SERIES.sum.color), 1.6, [6, 5]);
      markerLine(g, f, Tc, `T_крит = ${f2(Tc)} МэВ`, token('ink-muted'));
      dot(g, f.X(T0), f.Y(rad(T0) + ion(T0)), 6, token('ink'));
      // Энергия на выходе из пластины: точка сдвигается влево, когда толщину увеличивают.
      markerLine(g, f, Tout, `после ${mm} мм: ${f2(Tout)} МэВ`, token('signal'), 1);
      dot(g, f.X(Tout), f.Y(rad(Tout) + ion(Tout)), 6, token('signal'));
    });
  }, [mk, T0, Tout, mm]);

  return (
    <LabFrame
      n="10.1" kind="2D" title="Электрон: ионизация против излучения"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'l_{\\text{рад}}', value: `${f2(l)} г/см² = ${f2(l / m.rho)} см` },
        { tex: 'T_{\\text{крит}} = 800/Z', value: f2(Tc), unit: 'МэВ' },
        { tex: '\\text{рад}/\\text{ион} = TZ/800', value: f2(radToIon(T0, m.Z)) },
        { label: `после ${mm} мм`, value: f2(Tout), unit: 'МэВ' },
      ]}
      status={T0 > Tc ? { tone: 'ok', text: `T > T_крит: электрон теряет энергию в основном на излучение, в ${f2(radToIon(T0, m.Z))} раза больше, чем на ионизацию. Энергия падает экспоненциально: T = T₀·exp(−x/l_рад).` } : { tone: 'warn', text: 'T < T_крит: преобладает ионизация — как у тяжёлых частиц, потери почти постоянны.' }}
      controls={<>
        <Select label="Вещество" value={mk} onChange={(v) => setMk(v as MaterialKey)} options={MATS.map((k) => ({ value: k, label: `${MATERIALS[k].name}, Z = ${MATERIALS[k].Z}` }))} />
        <Slider label="Энергия электрона T₀" min={0} max={4} step={0.01} value={lgT} format={() => `${f2(T0)} МэВ`} onChange={setLgT} />
        <Slider label="Толщина пластины" min={0.1} max={50} step={0.1} value={mm} unit="мм" onChange={setMm} />
      </>}
      caption="Рис. 10.1. Тормозное излучение растёт с энергией: $-dE/dx = T/l_{\text{рад}}$, $l_{\text{рад}}^{-1} = 4\alpha r_e^2\frac{N_A}{A}Z(Z+1)\ln\frac{183}{Z^{1/3}}$. Ионизационные потери электрона почти постоянны. Кривые пересекаются при критической энергии $\approx 800/Z$ МэВ: в свинце это 10 МэВ, в воздухе больше 100. Поэтому электронно-фотонные ливни удобно ловить тяжёлыми веществами."
    >
      <canvas ref={ref} role="img" aria-label={`${m.name}: критическая энергия ${f2(Tc)} МэВ`} />
    </LabFrame>
  );
}
