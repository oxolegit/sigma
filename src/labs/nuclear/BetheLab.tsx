import { useState } from 'react';
import { LabFrame, Segmented, Select, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, text } from '../stats/draw';
import { MATERIALS, MP, PARTICLES, bethe, kin, type MaterialKey } from './physics';

const PARTS = [
  { key: 'p', color: 'accent', mark: 'line' },
  { key: 'alpha', color: 'signal', mark: 'line' },
  { key: 'mu', color: 'ink', mark: 'dash' },
] as const;
const SERIES = Object.fromEntries(PARTS.map((p) => [p.key, { label: PARTICLES[p.key].name, color: p.color, mark: p.mark }])) as Record<(typeof PARTS)[number]['key'], LegendItem>;

/** Потери частицы на сетке по T или по βγ; формула (4.2) без поправки на плотность. */
function curve(M: number, z: number, m: (typeof MATERIALS)[MaterialKey], axis: 'T' | 'bg') {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 260; i++) {
    const bg = 10 ** (-1.3 + (5.3 * i) / 260);
    const T = kin(M, 'pc', bg * M).T;
    const y = bethe(T, M, z, m.Z, m.A, m.I, false);
    if (y > 0 && Number.isFinite(y)) pts.push({ x: axis === 'T' ? T : bg, y });
  }
  // Ниже максимума формула не работает (частица подхватывает электроны) — обрезаем по пику.
  const peak = pts.reduce((k, p, i) => (p.y > pts[k]!.y ? i : k), 0);
  return pts.slice(peak);
}

/** Лаборатория 9.1: удельные ионизационные потери от энергии и от скорости (задачи 4.7, 4.8). */
export default function BetheLab() {
  const [mk, setMk] = useState<MaterialKey>('Al');
  const [axis, setAxis] = useState<'T' | 'bg'>('T');
  const m = MATERIALS[mk];
  const curves = PARTS.map((p) => ({ ...p, pts: curve(PARTICLES[p.key].m, PARTICLES[p.key].z, m, axis) }));
  const proton = curve(MP, 1, m, 'bg');
  const min = proton.reduce((a, p) => (p.y < a.y ? p : a));

  const ref = useCanvas((g, w, h) => {
    const [x0, x1] = axis === 'T' ? [0.1, 1e5] : [0.05, 1e4];
    const f = drawFrame(g, w, h, { min: x0, max: x1, ticks: decadeTicks(x0, x1, 7), format: decadeLabel, label: axis === 'T' ? 'T, МэВ' : 'βγ = p/Mc', log: true }, { min: 0.8, max: 2000, ticks: [1, 10, 100, 1000], format: decadeLabel, label: '−dE/dx, МэВ/(г/см²)', log: true });
    f.clip(() => {
      for (const c of curves) strokeCurve(g, c.pts.map((p) => [f.X(p.x), f.Y(p.y)]), token(c.color), 2.2, c.mark === 'dash' ? [6, 5] : []);
      if (axis === 'bg') {
        dot(g, f.X(min.x), f.Y(min.y), 5, token('ink'));
        text(g, `минимум ионизации ≈ ${min.y.toFixed(2)} при βγ ≈ ${min.x.toFixed(1)}`, f.X(min.x), f.Y(min.y) + 18, token('ink'), 'center');
      }
    });
  }, [mk, axis]);

  return (
    <LabFrame
      n="9.1" kind="2D" title="Ионизационные потери: кривая Бете"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'минимум для z = 1', value: min.y.toFixed(2), unit: 'МэВ/(г/см²)' },
        { tex: '\\beta\\gamma_{\\min}', value: min.x.toFixed(1) },
        { tex: 'Z/A', value: (m.Z / m.A).toFixed(3) },
      ]}
      status={{ tone: 'ok', text: axis === 'T' ? 'По энергии кривые сдвинуты: при одной T тяжёлая частица медленнее и тормозится сильнее. α теряет больше всех — у неё z² = 4.' : 'По скорости p и μ ложатся на одну кривую: потери зависят только от z и β, не от массы. α — та же форма, в 4 раза выше.' }}
      controls={<>
        <Segmented label="По оси x" value={axis} onChange={(v) => setAxis(v as 'T' | 'bg')} options={[{ value: 'T', label: 'энергия T' }, { value: 'bg', label: 'скорость βγ' }]} />
        <Select label="Вещество" value={mk} onChange={(v) => setMk(v as MaterialKey)} options={(['C', 'Al', 'Fe', 'Cu', 'Pb'] as const).map((k) => ({ value: k, label: `${MATERIALS[k].name}, Z = ${MATERIALS[k].Z}` }))} />
      </>}
      caption="Рис. 9.1. Формула Бете $-\frac{dE}{dx} = K\frac{z^2Z}{A\beta^2}\left[\frac12\ln\frac{2m_ec^2\beta^2\gamma^2T_{\max}}{I^2} - \beta^2\right]$. При малых скоростях работает $1/\beta^2$ — медленная частица дольше тянет за собой электроны. Минимум — около $\beta\gamma \approx 3$, примерно 1.5–2 МэВ/(г/см²) почти для любого вещества. Дальше — логарифмический рост: поле летящей частицы сплющивается и достаёт дальше."
    >
      <canvas ref={ref} role="img" aria-label={`Минимум ионизации в веществе ${m.name}: ${min.y.toFixed(2)} МэВ/(г/см²)`} />
    </LabFrame>
  );
}
