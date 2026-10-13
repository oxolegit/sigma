import { useMemo, useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { sci } from '../../lib/format';
import { decadeLabel, decadeTicks, drawFrame, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { resonance } from './quantum';

/** Серии рисунка: по этой таблице рисуются кривые и строится легенда. */
const SERIES = {
  cold: { label: 'T = 0, без уширения', color: 'ink-muted', mark: 'dash' },
  hot: { label: 'с доплеровским уширением', color: 'accent', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

const E0 = 6.67;

/** Лаборатория 9.3: первый резонанс ²³⁸U по Брейту — Вигнеру и его доплеровское уширение. */
export default function BreitWignerDoppler() {
  const [Gn, setGn] = useState(1.52);
  const [Gg, setGg] = useState(23);
  const [T, setT] = useState(300);
  const r = useMemo(() => resonance(E0, Gn / 1000, Gg / 1000, T), [Gn, Gg, T]);

  const ref = useCanvas((g, w, h) => {
    const lo = E0 - 0.6, hi = E0 + 0.6;
    const xt = [6.2, 6.4, 6.6, 6.8, 7.0];
    const f = drawFrame(
      g, w, h,
      { min: lo, max: hi, ticks: w < 480 ? [6.2, 6.6, 7.0] : xt, format: tickFormat(xt), label: 'E, эВ' },
      { min: 1, max: 2e5, ticks: decadeTicks(1, 1e5, 6), format: decadeLabel, label: 'σc, барн', log: true },
    );
    const cold: [number, number][] = [], hot: [number, number][] = [];
    r.E.forEach((e, i) => { if (i % 2 || e < lo || e > hi) return; cold.push([f.X(e), f.Y(r.cold[i]!)]); hot.push([f.X(e), f.Y(Math.max(r.hot[i]!, 1e-3))]); });
    f.clip(() => {
      strokeCurve(g, cold, token(SERIES.cold.color), 1.5, [5, 4]);
      strokeCurve(g, hot, token(SERIES.hot.color), 2.4);
    });
  }, [r]);

  return (
    <LabFrame
      n="9.3" kind="2D" title="Резонанс Брейта — Вигнера и Доплер"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\tau = \\hbar/\\Gamma', value: `= ${sci(r.tau, 2)}`, unit: 'с' },
        { tex: '\\Gamma_\\gamma/\\Gamma', value: `= ${r.branching.toFixed(3)}` },
        { label: 'пик σc: T = 0 / T', value: `${sci(r.peakCold, 3)} / ${sci(r.peakHot, 3)}`, unit: 'б' },
        { label: 'площадь: T = 0 / T', value: `${r.areaCold.toFixed(0)} / ${r.areaHot.toFixed(0)}`, unit: 'б·эВ' },
        { tex: '\\Delta', value: T > 0 ? `= ${(1000 * r.D).toFixed(1)} мэВ (Γ = ${(Gn + Gg).toFixed(1)} мэВ)` : '= 0' },
      ]}
      controls={<>
        <Slider tex="\Gamma_n" min={0.3} max={40} step={0.1} value={Gn} unit="мэВ" format={(v) => v.toFixed(1)} onChange={setGn} />
        <Slider tex="\Gamma_\gamma" min={5} max={60} step={0.5} value={Gg} unit="мэВ" format={(v) => v.toFixed(1)} onChange={setGg} />
        <Slider label="Температура среды T" min={0} max={2500} step={10} value={T} unit="K" format={(v) => v.toFixed(0)} onChange={setT} />
      </>}
      caption="Рис. 9.3. Первый резонанс ²³⁸U, $E_0 = 6.67$ эВ. С ростом температуры пик снижается и расширяется, а площадь под резонансом сохраняется: свёртка с гауссианом сохраняет интеграл. Рост поглощения при нагреве появляется только с учётом провала потока в резонансе — самоэкранировки."
    >
      <canvas ref={ref} role="img" aria-label={`Резонанс захвата: пик ${sci(r.peakCold, 3)} б без уширения и ${sci(r.peakHot, 3)} б при ${T} K`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
