import { useMemo, useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { vband } from '../stats/draw';
import { MATERIALS, PARTICLES, alphaRangeAir, bethe, protonRangeAir } from './physics';

const air = MATERIALS.air;
const SERIES = {
  loss: { label: 'потери на сантиметр пути, −dT/dx', color: 'accent', mark: 'line' },
  energy: { label: 'остаток энергии T(x), в масштабе', color: 'signal', mark: 'dash' },
  ends: { label: 'первый и последний сантиметр', color: 'ink-muted', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

/** Торможение в воздухе шагами по 0.5 мм: −dT/dx по формуле Бете (4.2), пока она применима. */
function track(M: number, z: number, T0: number) {
  const dx = 0.05;
  const pts: { x: number; T: number; loss: number }[] = [];
  let T = T0, x = 0;
  while (T > 0.15 * z * z && pts.length < 40000) {
    const loss = bethe(T, M, z, air.Z, air.A, air.I, false) * air.rho;
    if (!(loss > 0)) break;
    pts.push({ x, T, loss });
    T -= loss * dx; x += dx;
  }
  return { pts, range: x };
}

/** Лаборатория 9.2: кривая Брэгга — частица теряет больше всего в конце пробега (задача 4.17). */
export default function BraggLab() {
  const [kind, setKind] = useState<'alpha' | 'p'>('alpha');
  const [T0, setT0] = useState(6.5);
  const P = PARTICLES[kind];
  const t = useMemo(() => track(P.m, P.z, T0), [kind, T0]);
  // Оси — по самой большой энергии ползунка: при движении T₀ шкала стоит, меняется только кривая.
  const scale = useMemo(() => { const m = track(P.m, P.z, 10); return { x: m.range * 1.05, y: Math.max(...m.pts.map((p) => p.loss)) * 1.12 }; }, [kind]);
  const first = T0 - (t.pts.find((p) => p.x >= 1)?.T ?? 0);
  const last = t.pts.find((p) => p.x >= t.range - 1)?.T ?? 0;
  const emp = kind === 'alpha' ? alphaRangeAir(T0) : protonRangeAir(T0);

  const ref = useCanvas((g, w, h) => {
    const xMax = scale.x, yMax = scale.y;
    const xt = niceTicks(0, xMax, 6), yt = niceTicks(0, yMax, 5);
    const f = drawFrame(g, w, h, { min: 0, max: xMax, ticks: xt, format: tickFormat(xt), label: 'x, см воздуха' }, { min: 0, max: yMax, ticks: yt, format: tickFormat(yt), label: 'МэВ/см' });
    f.clip(() => {
      vband(g, f, 0, 1, token(SERIES.ends.color), 0.14);
      vband(g, f, Math.max(0, t.range - 1), t.range, token(SERIES.ends.color), 0.14);
      strokeCurve(g, t.pts.map((p) => [f.X(p.x), f.Y((p.T / 10) * yMax * 0.9)]), token(SERIES.energy.color), 1.8, [6, 5]);
      strokeCurve(g, t.pts.map((p) => [f.X(p.x), f.Y(p.loss)]), token(SERIES.loss.color), 2.4);
    });
  }, [t, scale]);

  return (
    <LabFrame
      n="9.2" kind="2D" title="Кривая Брэгга"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'пробег по Бете', value: t.range.toFixed(2), unit: 'см' },
        { label: 'пробег по формуле (4.5)', value: emp.toFixed(2), unit: 'см' },
        { label: 'потеря на 1-м см', value: first.toFixed(2), unit: 'МэВ' },
        { label: 'на последнем см', value: last.toFixed(2), unit: 'МэВ' },
      ]}
      status={{ tone: 'ok', text: `На последнем сантиметре частица теряет в ${(last / first).toFixed(1)} раза больше, чем на первом: медленная частица тормозится сильнее (∝ 1/β²).` }}
      controls={<>
        <Segmented label="Частица" value={kind} onChange={(v) => setKind(v as 'alpha' | 'p')} options={[{ value: 'alpha', label: 'α-частица' }, { value: 'p', label: 'протон' }]} />
        <Slider label="Начальная энергия T₀" min={2} max={10} step={0.1} value={T0} unit="МэВ" onChange={setT0} />
      </>}
      caption="Рис. 9.2. Потери на каждом шаге — по формуле Бете, энергия убывает до нуля. Пик в конце пробега — пик Брэгга. На нём держится протонная терапия: доза попадает в опухоль на заданной глубине, а не в кожу. Эмпирические пробеги задач 4.16–4.19 близки к интегралу по Бете. У самого конца формула не работает: частица подхватывает электроны и теряет заряд."
    >
      <canvas ref={ref} role="img" aria-label={`Пробег ${t.range.toFixed(1)} см, на последнем сантиметре потеря ${last.toFixed(2)} МэВ`} />
    </LabFrame>
  );
}
