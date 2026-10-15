import { useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { sci } from '../../lib/format';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { fillUnder, hline } from './draw';
import { protonLifetime, zeroEventLimit } from './poisson';

const LEVELS = [
  { value: '0.842', label: '1σ · 84 %' },
  { value: '0.9', label: '90 %' },
  { value: '0.95', label: '95 %' },
];

const SERIES = {
  p0: { label: 'P₀ = e^(−λ) — ни одного события', color: 'accent', mark: 'line' },
  level: { label: 'уровень 1 − CL', color: 'signal', mark: 'dash' },
  excluded: { label: 'исключённые λ', color: 'signal', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 5.2: ноль событий — верхний предел λ и нижний предел времени жизни протона. */
export default function ZeroEvents() {
  const [cl, setCl] = useState('0.9');
  const [lgMass, setLgMass] = useState(6);
  const [years, setYears] = useState(1);
  const level = Number(cl);
  const lmax = zeroEventLimit(level);
  const p = protonLifetime(10 ** lgMass, years, lmax);

  const ref = useCanvas((g, w, h) => {
    const xt = niceTicks(0, 5, 5), yt = niceTicks(0, 1, 4);
    const f = drawFrame(g, w, h, { min: 0, max: 5, ticks: xt, format: tickFormat(xt), label: 'λ' }, { min: 0, max: 1.05, ticks: yt, format: tickFormat(yt), label: 'P₀' });
    f.clip(() => {
      fillUnder(g, f, (x) => Math.exp(-x), lmax, 5, token(SERIES.excluded.color), 0.16);
      hline(g, f, 1 - level, token(SERIES.level.color), `1 − CL = ${(1 - level).toFixed(3)}`);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 200; i++) { const x = (5 * i) / 200; pts.push([f.X(x), f.Y(Math.exp(-x))]); }
      strokeCurve(g, pts, token(SERIES.p0.color), 2.2);
      markerLine(g, f, lmax, `λ < ${lmax.toFixed(2)}`, token(SERIES.level.color));
    });
  }, [level, lmax]);

  return (
    <LabFrame
      n="5.2" kind="2D" title="Ноль событий — тоже результат"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\lambda_{\\max} = -\\ln(1-\\text{CL})', value: `= ${lmax.toFixed(3)}` },
        { label: 'протонов в детекторе', value: sci(p.protons, 2) },
        { tex: '\\tau_p >', value: sci(p.tau, 2), unit: 'лет' },
      ]}
      controls={<>
        <Segmented label="Уровень доверия CL" value={cl} onChange={setCl} options={LEVELS} />
        <Slider label="Масса воды" min={3} max={7.7} step={0.05} value={lgMass} format={(v) => `${sci(10 ** v, 2)} кг`} onChange={setLgMass} />
        <Slider label="Время набора" min={1} max={20} step={1} value={years} unit="лет" onChange={setYears} />
      </>}
      caption="Рис. 5.2. Событий не было — но это не значит, что λ = 0: при λ = 2 ноль событий выпадает в 13.5 % опытов. Закрашены λ, при которых ноль выпадал бы реже, чем в $1 - \text{CL}$ опытов, — их исключаем. Из $\lambda = N_p t/\tau_p < \lambda_{\max}$ получается нижний предел времени жизни протона. Масса 10⁶ кг — детектор с лекции, 5·10⁷ кг — порядок крупнейших водных детекторов."
    >
      <canvas ref={ref} role="img" aria-label={`При CL ${level * 100} % верхний предел λ = ${lmax.toFixed(2)}`} />
    </LabFrame>
  );
}
