import { useMemo, useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot } from '../stats/draw';
import { NUCLIDES } from './nuclides';
import { WEIZ, binding, weizTerms, zOpt } from './physics';

const SERIES = {
  vol: { label: 'объём: α = 15.6 МэВ', color: 'ink-muted', mark: 'dash' },
  surf: { label: 'минус поверхность', color: 'signal', mark: 'line' },
  coul: { label: 'минус кулон', color: 'correct', mark: 'line' },
  total: { label: 'минус асимметрия = ε по формуле', color: 'accent', mark: 'line' },
  table: { label: 'ε по таблице масс', color: 'ink', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

/** Слагаемые на нуклон вдоль дорожки стабильности (Z = Z_opt, без спаривания). */
function perNucleon(A: number) {
  const t = weizTerms(A, zOpt(A));
  const v = t.volume / A, s = v + t.surface / A, c = s + t.coulomb / A, a = c + t.asymmetry / A;
  return { v, s, c, a, t };
}

/** Лаборатория 5.1: из чего складывается энергия связи — объём, поверхность, кулон, асимметрия. */
export default function WeizsackerLab() {
  const [A, setA] = useState(120);
  const table = useMemo(() => NUCLIDES.filter((x) => x.A >= 4 && x.Z > 0).map((x) => [x.A, binding(x.A, x.Z) / x.A] as const), []);
  const p = perNucleon(A);
  const Z = Math.round(zOpt(A));

  const ref = useCanvas((g, w, h) => {
    const xt = niceTicks(0, 250, 5), yt = niceTicks(0, 16, 8);
    const f = drawFrame(g, w, h, { min: 0, max: 250, ticks: xt, format: tickFormat(xt), label: 'A' }, { min: 0, max: 17, ticks: yt, format: tickFormat(yt), label: 'МэВ на нуклон' });
    f.clip(() => {
      const curve = (k: 'v' | 's' | 'c' | 'a') => { const pts: [number, number][] = []; for (let a = 4; a <= 250; a += 1) pts.push([f.X(a), f.Y(perNucleon(a)[k])]); return pts; };
      strokeCurve(g, curve('v'), token(SERIES.vol.color), 1.5, [6, 5]);
      strokeCurve(g, curve('s'), token(SERIES.surf.color), 2);
      strokeCurve(g, curve('c'), token(SERIES.coul.color), 2);
      strokeCurve(g, curve('a'), token(SERIES.total.color), 2.6);
      for (const [a, e] of table) dot(g, f.X(a), f.Y(e), 2.6, token(SERIES.table.color));
      markerLine(g, f, A, `A = ${A}`, token('ink-muted'));
    });
  }, [A]);

  const t = p.t;
  return (
    <LabFrame
      n="5.1" kind="2D" title="Капля: из чего складывается энергия связи"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'Z_{\\text{опт}}', value: Z },
        { tex: '\\alpha A', value: t.volume.toFixed(0), unit: 'МэВ' },
        { tex: '-\\beta A^{2/3}', value: t.surface.toFixed(0), unit: 'МэВ' },
        { tex: '-\\gamma Z(Z-1)/A^{1/3}', value: t.coulomb.toFixed(0), unit: 'МэВ' },
        { tex: '-\\delta(A-2Z)^2/A', value: t.asymmetry.toFixed(0), unit: 'МэВ' },
        { tex: '\\varepsilon = W/A', value: p.a.toFixed(2), unit: 'МэВ' },
      ]}
      status={A < 40 ? { tone: 'warn', text: 'Лёгкие ядра: велика доля поверхностных нуклонов — у них меньше соседей, связь слабее.' } : A > 150 ? { tone: 'warn', text: `Тяжёлые ядра: кулоновское отталкивание ${(-t.coulomb / A).toFixed(1)} МэВ на нуклон растёт как Z²/A^{4/3} и съедает связь.` } : { tone: 'ok', text: 'Середина: поверхность и кулон вместе отнимают меньше всего — здесь максимум ε ≈ 8.7 МэВ.' }}
      controls={<Slider label="Массовое число A" min={10} max={250} step={1} value={A} onChange={setA} />}
      caption={`Рис. 5.1. Каждое слагаемое — от одного свойства капли. Объём: все нуклоны связаны с соседями одинаково, ${WEIZ.a} МэВ на нуклон. Поверхность: у нуклонов снаружи соседей меньше. Кулон: каждый протон отталкивается от всех остальных. Асимметрия: принцип Паули делает выгодным N ≈ Z. Точки — таблица сборника; лёгкие ядра капля описывает хуже всего.`}
    >
      <canvas ref={ref} role="img" aria-label={`A = ${A}: ε = ${p.a.toFixed(2)} МэВ на нуклон`} />
    </LabFrame>
  );
}
