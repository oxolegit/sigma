import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot } from '../stats/draw';
import { electronRangeAl } from './physics';

const SERIES = {
  j: { label: 'J/J₀ = exp(−μd)', color: 'accent', mark: 'line' },
  r: { label: 'максимальный пробег — дальше ничего', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 10.2: β-спектр поглощается почти экспоненциально, но обрывается на максимальном пробеге. */
export default function BetaAbsorptionLab() {
  const [Tmax, setTmax] = useState(2.27);
  const [d, setD] = useState(0.2);
  const muRho = 22 * Tmax ** (-4 / 3);
  const R = electronRangeAl(Tmax);
  const J = d < R ? Math.exp(-muRho * d) : 0;

  const ref = useCanvas((g, w, h) => {
    const xMax = Math.max(0.3, R * 1.25);
    const xt = niceTicks(0, xMax, 5);
    const f = drawFrame(g, w, h, { min: 0, max: xMax, ticks: xt, format: tickFormat(xt), label: 'd, г/см²' }, { min: 1e-4, max: 1.3, ticks: [1e-4, 1e-3, 1e-2, 0.1, 1], format: decadeLabel, label: 'J/J₀', log: true });
    f.clip(() => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 200; i++) { const x = (R * i) / 200; pts.push([f.X(x), f.Y(Math.exp(-muRho * x))]); }
      strokeCurve(g, pts, token(SERIES.j.color), 2.4);
      markerLine(g, f, R, `R_max = ${R.toFixed(2)} г/см²`, token(SERIES.r.color));
      if (J > 0) dot(g, f.X(d), f.Y(J), 6, token('ink'));
    });
  }, [Tmax, d]);

  return (
    <LabFrame
      n="10.2" kind="2D" title="Поглощение β-частиц"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\mu_e/\\rho = 22\\,T_{\\max}^{-4/3}', value: muRho.toFixed(2), unit: 'см²/г' },
        { tex: 'd_{1/2} = \\ln 2/(\\mu_e/\\rho)', value: (Math.LN2 / muRho * 1000).toFixed(0), unit: 'мг/см²' },
        { tex: 'R_{\\max}', value: R.toFixed(3), unit: 'г/см²' },
        { tex: 'J/J_0', value: J > 0 ? J.toExponential(2) : '0' },
      ]}
      status={d < R ? { tone: 'ok', text: `Слой ${d.toFixed(2)} г/см² = ${(d / 2.7 * 10).toFixed(2)} мм алюминия ослабляет поток в ${(1 / J).toFixed(1)} раза.` } : { tone: 'warn', text: 'Толщина больше максимального пробега: проходят только тормозные γ-кванты, β-частиц нет.' }}
      controls={<>
        <Slider label="Граничная энергия β-спектра" min={0.5} max={3.5} step={0.01} value={Tmax} unit="МэВ" onChange={setTmax} />
        <Slider label="Толщина алюминия d" min={0} max={2} step={0.005} value={d} unit="г/см²" onChange={setD} />
      </>}
      caption="Рис. 10.2. β-спектр сплошной: медленные электроны застревают раньше, поэтому поток спадает почти экспоненциально, $J = J_0e^{-\mu_e d}$, хотя у каждого электрона есть свой пробег. Обрыв — на пробеге самых быстрых электронов, $R = 0.542T - 0.133$ г/см² (задачи 4.28–4.30). Препарат толще $R_{\max}$ светит только с поверхностного слоя: «насыщение»."
    >
      <canvas ref={ref} role="img" aria-label={`T_max = ${Tmax} МэВ: R_max = ${R.toFixed(2)} г/см²`} />
    </LabFrame>
  );
}
