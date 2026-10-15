import { useMemo, useState } from 'react';
import { LabFrame, Select, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, text } from '../stats/draw';
import { ELEMENTS, NUCLIDES } from './nuclides';
import { binding, hasNuclide, sepAlpha, sepN, sepP } from './physics';

const LIST = NUCLIDES.filter((x) => x.A >= 2 && x.Z > 0);
const key = (A: number, Z: number) => `${A}-${Z}`;

const SERIES = {
  all: { label: 'ядра таблицы сборника', color: 'ink-muted', mark: 'ball' },
  now: { label: 'выбранное ядро', color: 'accent', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const f = (v: number) => v.toFixed(2);

/** Лаборатория 3.1: энергия связи, удельная энергия связи и энергии отделения по таблице масс. */
export default function BindingLab() {
  const [id, setId] = useState(key(56, 26));
  const [A, Z] = id.split('-').map(Number) as [number, number];
  const points = useMemo(() => LIST.map((x) => ({ A: x.A, Z: x.Z, e: binding(x.A, x.Z) / x.A })), []);
  const W = binding(A, Z);
  const sep = (ok: boolean, fn: () => number) => (ok ? f(fn()) : '—');

  const ref = useCanvas((g, w, h) => {
    const xt = niceTicks(0, 240, 6), yt = niceTicks(0, 9, 5);
    const fr = drawFrame(g, w, h, { min: 0, max: 245, ticks: xt, format: tickFormat(xt), label: 'A' }, { min: 0, max: 9.5, ticks: yt, format: tickFormat(yt), label: 'ε = W/A, МэВ' });
    fr.clip(() => {
      for (const p of points) dot(g, fr.X(p.A), fr.Y(p.e), 3, token(SERIES.all.color));
      dot(g, fr.X(A), fr.Y(W / A), 7, token(SERIES.now.color));
      text(g, `${A}${ELEMENTS[Z]}: ${f(W / A)} МэВ`, fr.X(A) + (A > 160 ? -12 : 12), fr.Y(W / A) - 16, token(SERIES.now.color), A > 160 ? 'right' : 'left');
    });
  }, [id]);

  return (
    <LabFrame
      n="3.1" kind="2D" title="Энергия связи по таблице масс"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'W', value: f(W), unit: 'МэВ' },
        { tex: '\\varepsilon = W/A', value: f(W / A), unit: 'МэВ' },
        { tex: '\\varepsilon_n', value: sep(hasNuclide(A - 1, Z), () => sepN(A, Z)), unit: 'МэВ' },
        { tex: '\\varepsilon_p', value: sep(hasNuclide(A - 1, Z - 1), () => sepP(A, Z)), unit: 'МэВ' },
        { tex: '\\varepsilon_\\alpha', value: sep(A > 4 && hasNuclide(A - 4, Z - 2), () => sepAlpha(A, Z)), unit: 'МэВ' },
      ]}
      status={W / A > 8.7 ? { tone: 'ok', text: 'Вершина кривой: железо и никель связаны прочнее всех — энергию дают и синтез лёгких, и деление тяжёлых.' } : A > 200 ? { tone: 'warn', text: 'Тяжёлое ядро: на нуклон связь слабее, чем у середины таблицы. Деление выгодно, а εα < 0 — значит, α-распад разрешён.' } : A <= 12 ? { tone: 'warn', text: 'Лёгкое ядро: удельная связь скачет — ⁴He, ⁸Be, ¹²C, ¹⁶O, кратные α-частице, связаны сильнее соседей.' } : undefined}
      controls={<Select label="Ядро" value={id} onChange={setId} options={LIST.map((x) => ({ value: key(x.A, x.Z), label: `${x.A}${ELEMENTS[x.Z]} · M = ${x.M}` }))} />}
      caption="Рис. 3.1. $W = [Z M(^1\text{H}) + N m_n - M(A, Z)]c^2$ по атомным массам таблицы П.1.7: электроны атома сокращаются с электронами водорода. Энергия отделения — та же разность масс «продукт + частица − ядро»; «—» значит, что продукта нет в таблице. Почти у всех ядер ε ≈ 8 МэВ: ядерные силы насыщаются."
    >
      <canvas ref={ref} role="img" aria-label={`${A}${ELEMENTS[Z]}: W = ${f(W)} МэВ, ε = ${f(W / A)} МэВ`} />
    </LabFrame>
  );
}
