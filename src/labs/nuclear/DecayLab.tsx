import { useState } from 'react';
import { LabFrame, Select, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { ME, PARTICLES, twoBody } from './physics';

const { pi, pi0, mu, K } = PARTICLES;
/** Распады задач 1.7–1.10 и пара для сравнения. */
const DECAYS = [
  { value: 'pimu', label: 'π⁺ → μ⁺ + ν (1.7)', M: pi.m, m1: mu.m, m2: 0, n: ['μ⁺', 'ν'], parent: 'π⁺' },
  { value: 'pi0ee', label: 'π⁰ → e⁺ + e⁻ (1.8)', M: pi0.m, m1: ME, m2: ME, n: ['e⁺', 'e⁻'], parent: 'π⁰' },
  { value: 'Ke', label: 'K⁻ → e⁻ + ν̃ (1.9)', M: K.m, m1: ME, m2: 0, n: ['e⁻', 'ν̃'], parent: 'K⁻' },
  { value: 'Kpipi', label: 'K⁻ → π⁻ + π⁰ (1.10)', M: K.m, m1: pi.m, m2: pi0.m, n: ['π⁻', 'π⁰'], parent: 'K⁻' },
  { value: 'Kmu', label: 'K⁺ → μ⁺ + ν', M: K.m, m1: mu.m, m2: 0, n: ['μ⁺', 'ν'], parent: 'K⁺' },
];

const SERIES = {
  rest: { label: 'энергия покоя продуктов', color: 'ink-muted', mark: 'bar' },
  t1: { label: 'кинетическая энергия первого', color: 'accent', mark: 'bar' },
  t2: { label: 'кинетическая энергия второго', color: 'signal', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

const r = (v: number) => (v < 1 ? v.toFixed(3) : v.toFixed(2));

/** Лаборатория 2.1: распад покоящейся частицы на две — импульсы равны, энергия делится неравно. */
export default function DecayLab() {
  const [id, setId] = useState('pimu');
  const d = DECAYS.find((x) => x.value === id)!;
  const res = twoBody(d.M, d.m1, d.m2);

  const ref = useCanvas((g, w, h) => {
    const cx = w / 2, cy = h * 0.32;
    // Импульсы: равные стрелки в разные стороны.
    const L = Math.min(w * 0.38, 220);
    g.save();
    g.fillStyle = token('ink');
    g.beginPath(); g.arc(cx, cy, 7, 0, 2 * Math.PI); g.fill();
    arrow(g, cx + 10, cy, cx + 10 + L, cy, token(SERIES.t1.color), 3, 12);
    arrow(g, cx - 10, cy, cx - 10 - L, cy, token(SERIES.t2.color), 3, 12);
    g.font = plotFont(600, 13);
    g.textBaseline = 'bottom';
    g.textAlign = 'right'; g.fillStyle = token(SERIES.t1.color); g.fillText(`${d.n[0]}: pc = ${r(res.pc)} МэВ`, cx + 10 + L, cy - 10);
    g.textAlign = 'left'; g.fillStyle = token(SERIES.t2.color); g.fillText(`${d.n[1]}: pc = ${r(res.pc)} МэВ`, cx - 10 - L, cy - 10);
    g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = token('ink'); g.fillText(`${d.parent} покоится`, cx, cy + 12);

    // Энергия Mc² по частям: m₁c² + T₁ + m₂c² + T₂.
    const x0 = 16, x1 = w - 16, by = h * 0.66, bh = 30;
    const parts = [
      { v: d.m1, c: SERIES.rest.color, t: `m(${d.n[0]})` },
      { v: res.T1, c: SERIES.t1.color, t: `T(${d.n[0]})` },
      { v: d.m2, c: SERIES.rest.color, t: `m(${d.n[1]})` },
      { v: res.T2, c: SERIES.t2.color, t: `T(${d.n[1]})` },
    ];
    let x = x0;
    g.font = plotFont(500, 11);
    for (const p of parts) {
      const pw = ((x1 - x0) * p.v) / d.M;
      if (pw > 0.5) {
        g.fillStyle = token(p.c); g.globalAlpha = 0.28; g.fillRect(x, by, pw, bh);
        g.globalAlpha = 1; g.strokeStyle = token(p.c); g.lineWidth = 1.5; g.strokeRect(x + 0.5, by + 0.5, pw - 1, bh - 1);
        if (pw > 48) { g.fillStyle = token('ink'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.t, x + pw / 2, by + bh / 2); }
      }
      x += pw;
    }
    g.fillStyle = token('ink-muted'); g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(`Mc² = ${r(d.M)} МэВ`, x0, by + bh + 8);
    g.restore();
  }, [id]);

  return (
    <LabFrame
      n="2.1" kind="2D" title="Распад покоящейся частицы"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'pc', value: r(res.pc), unit: 'МэВ' },
        { label: `T(${d.n[0]})`, value: r(res.T1), unit: 'МэВ' },
        { label: `T(${d.n[1]})`, value: r(res.T2), unit: 'МэВ' },
        { tex: '(M - m_1 - m_2)c^2', value: r(d.M - d.m1 - d.m2), unit: 'МэВ' },
      ]}
      status={{ tone: 'ok', text: res.T1 < res.T2 ? `Импульсы равны, но лёгкий ${d.n[1]} уносит больше энергии: ${r(res.T2)} против ${r(res.T1)} МэВ.` : res.T1 === res.T2 ? 'Массы равны — энергия делится пополам.' : `Импульсы равны, ${d.n[0]} легче — его энергия больше.` }}
      controls={<Select label="Распад" value={id} onChange={setId} options={DECAYS.map(({ value, label }) => ({ value, label }))} />}
      caption="Рис. 2.1. Покоившаяся частица импульса не имела — продукты разлетаются с равными и противоположными импульсами. Энергия $Mc^2$ делится так: $E_1 = (M^2 + m_1^2 - m_2^2)c^2/2M$. Чем легче продукт, тем больше его доля: нейтрино без массы уносит почти всё."
    >
      <canvas ref={ref} role="img" aria-label={`${d.label}: pc = ${r(res.pc)} МэВ`} />
    </LabFrame>
  );
}
