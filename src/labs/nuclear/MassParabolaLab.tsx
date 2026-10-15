import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, drawFrame, niceTicks, strokeCurve, tickFormat, stepCeil } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, text } from '../stats/draw';
import { ELEMENTS } from './nuclides';
import { ME, weizMass, zOpt } from './physics';

const SERIES = {
  ee: { label: 'чётно-чётные (и все при нечётном A)', color: 'accent', mark: 'dot' },
  oo: { label: 'нечётно-нечётные', color: 'signal', mark: 'dot' },
  decay: { label: 'β-распад к более лёгкому соседу', color: 'ink-muted', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Масса атома по капельной модели, МэВ: с электронами — β⁺ требует разницы больше 2mₑc². */
const atomic = (A: number, Z: number) => weizMass(A, Z) + Z * ME;

/** Лаборатория 5.2: массы изобар — парабола по Z, β-распады скатывают ядро к дну. */
export default function MassParabolaLab() {
  const [A, setA] = useState(117);
  const z0 = zOpt(A);
  const Zs = Array.from({ length: 11 }, (_, i) => Math.round(z0) - 5 + i);
  const base = Math.min(...Zs.map((Z) => atomic(A, Z)));
  const pts = Zs.map((Z) => ({ Z, m: atomic(A, Z) - base, oo: Z % 2 === 1 && (A - Z) % 2 === 1 }));
  const stable = pts.filter((p, i) => (i === 0 || pts[i - 1]!.m > p.m) && (i === pts.length - 1 || pts[i + 1]!.m > p.m));

  const ref = useCanvas((g, w, h) => {
    const yMax = stepCeil(Math.max(...pts.map((p) => p.m)) * 1.08 + 1);
    const xt = Zs.filter((_, i) => i % 2 === 0), yt = niceTicks(0, yMax, 5);
    const f = drawFrame(g, w, h, { min: Zs[0]! - 0.6, max: Zs[10]! + 0.6, ticks: xt, format: String, label: 'Z' }, { min: -1, max: yMax, ticks: yt, format: tickFormat(yt), label: 'M c² − min, МэВ' });
    f.clip(() => {
      // Параболы — масса без слагаемого спаривания (при дробном Z его нет), сдвинутая на ∓34/A^{3/4}.
      const pair = 34 / A ** 0.75;
      const curve = (shift: number) => {
        const c: [number, number][] = [];
        for (let i = 0; i <= 120; i++) { const Z = Zs[0]! - 0.5 + (11 * i + 0.5) / 120; c.push([f.X(Z), f.Y(atomic(A, Z) + shift - base)]); }
        return c;
      };
      if (A % 2) strokeCurve(g, curve(0), token(SERIES.ee.color), 1.5, [4, 4]);
      else { strokeCurve(g, curve(-pair), token(SERIES.ee.color), 1.5, [4, 4]); strokeCurve(g, curve(pair), token(SERIES.oo.color), 1.5, [4, 4]); }
      pts.forEach((p, i) => {
        const left = pts[i - 1], right = pts[i + 1];
        const to = [left, right].filter((q): q is typeof p => !!q && q.m < p.m).sort((a, b) => a.m - b.m)[0];
        if (to) arrow(g, f.X(p.Z), f.Y(p.m), f.X(to.Z) + (to.Z > p.Z ? -6 : 6), f.Y(to.m) - 4, token(SERIES.decay.color), 1.3, 7);
      });
      for (const p of pts) dot(g, f.X(p.Z), f.Y(p.m), 5, token(p.oo ? SERIES.oo.color : SERIES.ee.color));
      for (const s of stable) text(g, `${A}${ELEMENTS[s.Z]}`, f.X(s.Z), f.Y(s.m) - 16, token('ink'), 'center');
    });
  }, [A]);

  return (
    <LabFrame
      n="5.2" kind="2D" title="Изобары: парабола масс и β-распады"
      legend={A % 2 ? [SERIES.ee, SERIES.decay] : Object.values(SERIES)}
      readout={[
        { tex: 'Z_{\\text{опт}}', value: z0.toFixed(2) },
        { label: 'стабильные по модели', value: stable.map((s) => `${A}${ELEMENTS[s.Z]}`).join(', ') },
      ]}
      status={A % 2 ? { tone: 'ok', text: 'Нечётное A: одна парабола — стабилен ровно один изобар, к нему ведут β⁻ слева и β⁺ справа.' } : { tone: 'warn', text: `Чётное A: спаривание расщепляет точки на две параболы, разнесённые на 2·34/A^{3/4} = ${(68 / A ** 0.75).toFixed(2)} МэВ. Стабильных чётно-чётных изобаров может быть два.` }}
      controls={<Slider label="Массовое число A" min={20} max={240} step={1} value={A} onChange={setA} />}
      caption="Рис. 5.2. При постоянном $A$ формула Вайцзеккера квадратична по $Z$: асимметрия и кулон дают параболу масс. Ядро слева от дна превращает нейтрон в протон (β⁻), справа — протон в нейтрон (β⁺ или захват электрона). Дно параболы — $Z_{\text{опт}} = A/(0.015A^{2/3} + 1.973)$, задачи 3.1–3.4. Для $A = 116$ и $117$ это рисунок из ответа к задаче 3.4."
    >
      <canvas ref={ref} role="img" aria-label={`A = ${A}: Z опт = ${z0.toFixed(1)}`} />
    </LabFrame>
  );
}
