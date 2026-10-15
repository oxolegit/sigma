import { useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, hline } from '../stats/draw';
import { AMU, ME, MN, MP, PARTICLES, cmEnergy, thresholdT } from './physics';

const nuc = (M: number, Z: number) => M * AMU - Z * ME;
/** Реакции задачи 1.28 (первая частица налетает, вторая покоится). */
const REACTIONS = [
  { value: 'a', label: 'γ + e⁻ → e⁻ + e⁻ + e⁺', m1: 0, m2: ME, final: 3 * ME },
  { value: 'b', label: 'γ + ядро → e⁻ + e⁺ + ядро', m1: 0, m2: nuc(207.976652, 82), final: 2 * ME + nuc(207.976652, 82) },
  { value: 'c', label: 'p + p → p + p + p + p̄', m1: MP, m2: MP, final: 4 * MP },
  { value: 'd', label: 'e⁻ + p → n + ν', m1: ME, m2: MP, final: MN },
  { value: 'e', label: '⁴He + ⁷Li → ¹⁰B + n', m1: nuc(4.002603, 2), m2: nuc(7.016004, 3), final: nuc(10.012937, 5) + MN },
  { value: 'f', label: 'p + p → p + p + π⁰', m1: MP, m2: MP, final: 2 * MP + PARTICLES.pi0.m },
];

const SERIES = {
  s: { label: 'энергия в с.ц.м. √s при данной T', color: 'accent', mark: 'line' },
  need: { label: 'сумма масс продуктов', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const f3 = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(4));

/** Лаборатория 2.2: порог реакции — энергия в системе центра масс должна покрыть массы продуктов. */
export default function ThresholdLab() {
  const [id, setId] = useState('c');
  const [lg, setLg] = useState(0.15);
  const r = REACTIONS.find((x) => x.value === id)!;
  const Tthr = thresholdT(r.m1, r.m2, r.final);
  const T = Tthr * 10 ** lg;
  const E = cmEnergy(T + r.m1, r.m1, r.m2) - (r.m1 + r.m2);
  const need = r.final - (r.m1 + r.m2);
  const Q = -need;
  const classic = -Q * (1 + r.m1 / r.m2);

  const ref = useCanvas((g, w, h) => {
    const lo = Tthr / 10, hi = Tthr * 10;
    const xt = decadeTicks(lo, hi, 6);
    const yMax = (cmEnergy(hi + r.m1, r.m1, r.m2) - r.m1 - r.m2) * 1.05;
    const yt = niceTicks(0, yMax, 5);
    const f = drawFrame(g, w, h, { min: lo, max: hi, ticks: xt, format: decadeLabel, label: 'T налетающей, МэВ', log: true }, { min: 0, max: yMax, ticks: yt, format: tickFormat(yt), label: '√s − m₁ − m₂, МэВ' });
    f.clip(() => {
      hline(g, f, need, token(SERIES.need.color), `нужно ${f3(need)} МэВ`);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 200; i++) { const t = lo * (hi / lo) ** (i / 200); pts.push([f.X(t), f.Y(cmEnergy(t + r.m1, r.m1, r.m2) - r.m1 - r.m2)]); }
      strokeCurve(g, pts, token(SERIES.s.color), 2.4);
      markerLine(g, f, Tthr, `порог ${f3(Tthr)} МэВ`, token(SERIES.need.color));
      dot(g, f.X(T), f.Y(E), 6, token(SERIES.s.color));
    });
  }, [id, T]);

  const above = T >= Tthr;
  return (
    <LabFrame
      n="2.2" kind="2D" title="Порог реакции"
      legend={Object.values(SERIES)}
      status={{ tone: above ? 'ok' : 'bad', text: above ? `Реакция идёт: в с.ц.м. доступно ${f3(E)} МэВ из нужных ${f3(need)}.` : `Ниже порога: доступно ${f3(E)} МэВ, а массы продуктов требуют ${f3(need)}.` }}
      readout={[
        { tex: 'T_{\\text{пор}}', value: f3(Tthr), unit: 'МэВ' },
        { tex: '|Q|', value: f3(need), unit: 'МэВ' },
        { tex: '|Q|(1 + m_1/m_2)', value: f3(classic), unit: 'МэВ' },
        { tex: 'T', value: f3(T), unit: 'МэВ' },
      ]}
      controls={<>
        <Select label="Реакция" value={id} onChange={setId} options={REACTIONS.map(({ value, label }) => ({ value, label }))} />
        <Slider label="T налетающей частицы" min={-1} max={1} step={0.01} value={lg} format={() => `${f3(T)} МэВ`} onChange={setLg} />
      </>}
      caption="Рис. 2.2. Налетающая частица тратит часть энергии на движение центра масс — оно сохраняется и на рождение не идёт. Работает только инвариант $s = (m_1^2 + m_2^2)c^4 + 2E_1m_2c^2$. Нерелятивистская оценка $|Q|(1 + m_1/m_2)$ верна, пока $|Q|$ мало по сравнению с массами. Для рождения частиц ($p\bar p$, $\pi^0$, $e^+e^-$ на электроне) она сильно занижает порог."
    >
      <canvas ref={ref} role="img" aria-label={`${r.label}: порог ${f3(Tthr)} МэВ`} />
    </LabFrame>
  );
}
