import { useState } from 'react';
import { LabFrame, Segmented, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, markerLine, niceTicks, stepCeil, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { CAPTURES_PER_MWD, T_HALF_NP239, chainAt, gramsOf, irradiate, type Chain } from './physics';

/** Реакторы и их мощность, МВт. */
const REACTORS = [
  { value: 'cp1', label: 'CP-1, 200 Вт (1942)', P: 2e-4 },
  { value: 'x10', label: 'X-10, 1 МВт (1943)', P: 1 },
  { value: 'b', label: 'Хэнфорд B, 250 МВт (1944)', P: 250 },
] as const;
type ReactorId = (typeof REACTORS)[number]['value'];

/** Одна таблица на кривые и легенду; форма линии дублирует цвет. */
const SERIES: Record<keyof Chain, LegendItem & { key: keyof Chain; width: number; dash: number[] }> = {
  u: { key: 'u', label: '²³⁹U, T½ = 23 мин', color: 'ink-muted', mark: 'dot', width: 1.6, dash: [2, 3] },
  np: { key: 'np', label: '²³⁹Np, T½ = 2.36 сут', color: 'signal', mark: 'dash', width: 2.2, dash: [7, 5] },
  pu: { key: 'pu', label: '²³⁹Pu', color: 'accent', mark: 'line', width: 2.6, dash: [] },
};

/** Масса в удобных единицах: мкг, мг, г, кг. */
function mass(g: number): { v: string; unit: string } {
  const a = Math.abs(g);
  const [k, unit] = a >= 1e3 ? [1e-3, 'кг'] : a >= 1 ? [1, 'г'] : a >= 1e-3 ? [1e3, 'мг'] : [1e6, 'мкг'];
  const x = g * k;
  return { v: x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2), unit };
}
const massText = (g: number) => { const m = mass(g); return `${m.v} ${m.unit}`; };

/** Лаборатория 19.2: уравнения Бейтмана — ²³⁸U захватывает нейтрон, через два β⁻-распада получается ²³⁹Pu. */
export default function PuChainLab() {
  const [rid, setRid] = useState<ReactorId>('b');
  const [time, setTime] = useState(30);
  const [cool, setCool] = useState(14);
  const [scale, setScale] = useState<'lin' | 'log'>('lin');
  const P = REACTORS.find((r) => r.value === rid)!.P;
  const R = P * CAPTURES_PER_MWD;
  const { stop, end } = irradiate(R, time, cool);
  const gain = end.pu - stop.pu;
  const week = chainAt(R, time, time + 7).pu - stop.pu;

  const ref = useCanvas((g, w, h) => {
    const tMax = time + cool;
    const xt = niceTicks(0, tMax, 6);
    const top = stepCeil(gramsOf(end.pu) * 1.08);
    const unitK = top >= 1e3 ? 1e-3 : top >= 1 ? 1 : top >= 1e-3 ? 1e3 : 1e6;
    const unit = mass(top).unit;
    const log = scale === 'log';
    const yMin = log ? top * 1e-6 : 0;
    const yt = log ? decadeTicks(yMin, top, 7) : niceTicks(0, top, 5);
    const f = drawFrame(g, w, h,
      { min: 0, max: tMax, ticks: xt, format: tickFormat(xt), label: 'сутки' },
      { min: yMin, max: top, ticks: yt, format: log ? (v) => decadeLabel(v * unitK) : (v) => tickFormat(yt.map((x) => x * unitK))(v * unitK), label: `масса, ${unit}`, log });
    f.clip(() => {
      const N = 400;
      const series: Record<keyof Chain, [number, number][]> = { u: [], np: [], pu: [] };
      for (let i = 0; i <= N; i++) {
        const t = (tMax * i) / N;
        const c = chainAt(R, time, t);
        for (const k of ['u', 'np', 'pu'] as const) series[k].push([f.X(t), f.Y(Math.max(gramsOf(c[k]), yMin))]);
      }
      for (const s of Object.values(SERIES)) strokeCurve(g, series[s.key], token(s.color), s.width, s.dash);
    });
    markerLine(g, f, time, 'останов', token('ink-muted'));
    if (cool >= 7) markerLine(g, f, time + 7, '+ неделя', token('rule-strong'), 2);
  }, [R, time, cool, scale, end.pu]);

  return (
    <LabFrame
      n="19.2" id="lab-pu-chain" title="Накопление плутония"
      legend={Object.values(SERIES).map(({ label, color, mark }) => ({ label, color, mark }))}
      readout={[
        { label: 'Pu при останове', value: mass(gramsOf(stop.pu)).v, unit: mass(gramsOf(stop.pu)).unit },
        { label: 'Np при останове', value: mass(gramsOf(stop.np)).v, unit: mass(gramsOf(stop.np)).unit },
        { label: 'Pu после выдержки', value: mass(gramsOf(end.pu)).v, unit: mass(gramsOf(end.pu)).unit },
        { label: 'прибавка за выдержку', value: stop.pu > 0 ? `+${((gain / stop.pu) * 100).toFixed(1)} %` : '–' },
      ]}
      status={cool < 7
        ? { tone: 'warn', text: `Выдержка ${cool} сут — меньше недели: в топливе ещё ${massText(gramsOf(end.np))} нептуния, он продолжит превращаться в плутоний. За полную неделю прибыло бы ${massText(gramsOf(week))}.` }
        : { tone: 'ok', text: `За неделю после останова прибыло ${massText(gramsOf(week))} Pu — ${((week / stop.np) * 100).toFixed(0)} % нептуния (T½ = ${T_HALF_NP239} сут). Поэтому облучённые блоки выдерживали, прежде чем растворять: и плутоний «дозревает», и короткоживущая активность спадает.` }}
      controls={<>
        <Select label="Реактор" value={rid} onChange={(v) => setRid(v as ReactorId)} options={REACTORS.map(({ value, label }) => ({ value, label }))} />
        <Slider label="Время облучения" min={1} max={120} step={1} value={time} unit="сут" onChange={setTime} />
        <Slider label="Выдержка после останова" min={0} max={30} step={1} value={cool} unit="сут" onChange={setCool} />
        <Segmented label="Шкала" value={scale} onChange={(v) => setScale(v as 'lin' | 'log')} options={[{ value: 'lin', label: 'линейная' }, { value: 'log', label: 'логарифмическая' }]} />
      </>}
      caption="Рис. 19.2. Цепочка $^{238}\text{U}(n,\gamma)\,^{239}\text{U} \xrightarrow{\beta^-} {}^{239}\text{Np} \xrightarrow{\beta^-} {}^{239}\text{Pu}$ при постоянной скорости захвата $R$, решение уравнений Бейтмана. $R$ — оценка ≈ $2.5\cdot10^{21}$ захватов на МВт·сут, около грамма плутония на мегаватт-сутки. Уран-239 почти сразу выходит на равновесие $R/\lambda_U$ — его мало, он виден на логарифмической шкале. Нептуний копится до $R/\lambda_{Np}$ — это запас плутония «в пути»."
    >
      <canvas ref={ref} role="img" aria-label={`После ${time} сут облучения и ${cool} сут выдержки — ${massText(gramsOf(end.pu))} плутония`} />
    </LabFrame>
  );
}
