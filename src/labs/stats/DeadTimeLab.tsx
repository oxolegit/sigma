import { useMemo, useState } from 'react';
import { Button, LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { text } from './draw';
import { poissonTimes } from './geometry';
import { deadFraction, deadFractionTwoChannels, simulateDeadTime } from './poisson';

const SERIES = {
  ok: { label: 'событие записано', color: 'accent', mark: 'bar' },
  lost: { label: 'событие потеряно', color: 'signal', mark: 'bar' },
  dead: { label: 'мёртвое время τ после события', color: 'ink-muted', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

/** Сколько событий разыгрывать для подсчёта доли потерь. */
const EVENTS = 40000;
const fmtRate = (lg: number) => Math.round(10 ** lg).toLocaleString('ru-RU');
const fmtTau = (lg: number) => { const t = 10 ** lg; return t >= 1000 ? `${(t / 1000).toFixed(2)} мс` : `${t.toFixed(0)} мкс`; };

/** Лаборатория 6.1: детектор с мёртвым временем — какая доля событий теряется и что даёт второй канал. */
export default function DeadTimeLab() {
  const [lgNu, setLgNu] = useState(Math.log10(2000));
  const [lgTau, setLgTau] = useState(Math.log10(50));
  const [ch, setCh] = useState('1');
  const [seed, setSeed] = useState(1);
  const nu = 10 ** lgNu, tau = 10 ** lgTau * 1e-6, channels = ch === '2' ? 2 : 1;
  const x = nu * tau;
  const sim = useMemo(() => {
    const rng = mulberry32(seed * 3571 + 9);
    const times = poissonTimes(rng, nu, EVENTS / nu);
    const reg = simulateDeadTime(times, tau, channels);
    return { times, reg, lost: reg.filter((r) => !r).length / reg.length };
  }, [nu, tau, channels, seed]);
  const theory = channels === 1 ? deadFraction(nu, tau) : deadFractionTwoChannels(nu, tau);

  // Окно на рисунке — около 24 событий, начиная с первой потери (если она есть рядом).
  const firstLost = sim.reg.findIndex((r) => !r);
  const i0 = firstLost > 6 && firstLost < sim.times.length - 24 ? firstLost - 6 : 0;
  const t0 = sim.times[i0]! - 0.5 / nu, span = 24 / nu;

  const ref = useCanvas((g, w, h) => {
    const pad = 12, X = (t: number) => pad + ((t - t0) / span) * (w - 2 * pad);
    const axis = h * 0.42, lane = Math.min(16, (h - axis - 20) / 5);
    const ev = sim.times.map((t, i) => ({ t, ok: sim.reg[i]! })).filter((e) => e.t >= t0 - tau && e.t <= t0 + span);
    // Окна τ после каждого события — по дорожкам, чтобы перекрытия были видны.
    const ends: number[] = [];
    g.save();
    for (const e of ev) {
      let l = ends.findIndex((end) => end <= e.t);
      if (l < 0) { l = ends.length; ends.push(0); }
      ends[l] = e.t + tau;
      const y = axis + 10 + l * (lane + 3);
      g.globalAlpha = 0.28;
      g.fillStyle = token(SERIES.dead.color);
      g.fillRect(X(e.t), y, Math.max(2, X(e.t + tau) - X(e.t)), lane);
    }
    g.globalAlpha = 1;
    g.strokeStyle = token('rule-strong');
    g.beginPath(); g.moveTo(pad, axis); g.lineTo(w - pad, axis); g.stroke();
    for (const e of ev) {
      if (e.t < t0) continue;
      g.fillStyle = token(e.ok ? SERIES.ok.color : SERIES.lost.color);
      const top = e.ok ? axis - h * 0.3 : axis - h * 0.18;
      g.fillRect(X(e.t) - 2, top, 4, axis - top);
      if (!e.ok) text(g, '✕', X(e.t), top - 4, token(SERIES.lost.color), 'center', 'bottom', 700, 13);
    }
    g.restore();
    text(g, `${(span * 1e3).toFixed(span < 0.01 ? 2 : 1)} мс`, w - pad, h - 4, token('ink-muted'), 'right', 'bottom', 500, 11);
  }, [sim, t0, span, tau]);

  return (
    <LabFrame
      n="6.1" kind="2D" title="Детектор с мёртвым временем"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'x = \\nu\\tau', value: `= ${x.toFixed(3)}` },
        { label: `потеряно в имитации ${EVENTS.toLocaleString('ru-RU')} событий`, value: `${(100 * sim.lost).toFixed(2)} %` },
        { tex: channels === 1 ? '1 - e^{-x}' : '1 - e^{-x}(1 + x)', value: `= ${(100 * theory).toFixed(2)} %` },
      ]}
      controls={<>
        <Slider tex="\nu" label=" — скорость счёта" min={1} max={4} step={0.01} value={lgNu} unit="с⁻¹" format={fmtRate} onChange={setLgNu} />
        <Slider tex="\tau" label=" — мёртвое время" min={0.5} max={3.7} step={0.01} value={lgTau} format={fmtTau} onChange={setLgTau} />
        <Segmented label="Каналы обработки" value={ch} onChange={setCh} options={[{ value: '1', label: 'один' }, { value: '2', label: 'два («пинг-понг»)' }]} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((s) => s + 1)}>Новый поток</Button></div>
      </>}
      caption="Рис. 6.1. После каждого события установка «глуха» время τ. Событие теряется, если за τ до него уже что-то пришло: вероятность этого $1 - P_0 = 1 - e^{-\nu\tau}$. С вторым каналом теряются только события, перед которыми за τ пришло два и больше: $1 - P_0 - P_1 = 1 - e^{-x}(1+x) \approx x^2/2$. Под осью — окна τ после каждого события: событие теряется, если начинается внутри чужого окна (при двух каналах — внутри двух окон сразу)."
    >
      <canvas ref={ref} role="img" aria-label={`При ντ = ${x.toFixed(3)} теряется ${(100 * theory).toFixed(2)} % событий`} />
    </LabFrame>
  );
}
