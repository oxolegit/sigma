import { useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, pow10Label, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { transmission } from './freePath';

const fmt = (d: number) => (v: number) => v.toFixed(d);

/** Серии рисунка: по этой таблице красится график и строится легенда. */
const SERIES = {
  curve: { label: 'I(x)/I₀ — доля без взаимодействия', color: 'accent', mark: 'line' },
  lambda: { label: 'средняя длина пробега λ', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 4.1: ослабление узкого пучка I(x)/I₀ = e^{−Σx} и средняя длина пробега λ = 1/Σ. */
export default function BeamAttenuation() {
  const [sigma, setSigma] = useState(0.4);
  const [L, setL] = useState(8);
  const [scale, setScale] = useState<'lin' | 'log'>('lin');
  const lam = 1 / sigma;
  const tL = transmission(sigma, L);

  const ref = useCanvas((g, w, h) => {
    const log = scale === 'log';
    // Логарифмическая шкала: от 1 до ближайшей декады ниже I(L)/I₀, но не меньше одной декады.
    const lo = Math.min(-1, Math.floor(Math.log10(Math.max(tL, 1e-6))));
    const yTicks = log ? Array.from({ length: -lo + 1 }, (_, i) => 10 ** -i) : [0, 0.25, 0.5, 0.75, 1];
    const f = drawFrame(
      g, w, h,
      { min: 0, max: L, ticks: niceTicks(0, L, w < 480 ? 4 : 5), format: (v) => (L < 5 ? v.toFixed(1) : String(v)), label: 'x, см' },
      log
        ? { min: 10 ** lo, max: 1, ticks: yTicks, format: (v) => pow10Label(Math.round(Math.log10(v))), label: 'I/I₀', log: true }
        : { min: 0, max: 1, ticks: yTicks, format: (v) => v.toFixed(2), label: 'I/I₀' },
    );
    if (lam <= L) markerLine(g, f, lam, `λ = ${lam.toFixed(2)} см`, token(SERIES.lambda.color));
    const pts: [number, number][] = [];
    for (let k = 0; k <= 200; k++) {
      const x = (L * k) / 200;
      pts.push([f.X(x), f.Y(transmission(sigma, x))]);
    }
    f.clip(() => strokeCurve(g, pts, token(SERIES.curve.color), 2));
  }, [sigma, L, scale]);

  return (
    <LabFrame
      n="4.1" kind="2D" title="Ослабление узкого пучка в слое"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\lambda', value: `= ${lam.toFixed(2)}`, unit: 'см' },
        { tex: 'I(L)/I_0', value: `= ${tL.toFixed(3)}` },
        { label: 'провзаимодействовало', value: (100 * (1 - tL)).toFixed(1), unit: '%' },
      ]}
      controls={<>
        <Slider tex="\Sigma_t" min={0.05} max={2} step={0.05} value={sigma} unit="см⁻¹" format={fmt(2)} onChange={setSigma} />
        <Slider label="Толщина слоя L" min={1} max={20} step={0.5} value={L} unit="см" format={fmt(1)} onChange={setL} />
        <Segmented
          label="Шкала" value={scale} onChange={(v) => setScale(v as 'lin' | 'log')}
          options={[{ value: 'lin', label: 'Линейная' }, { value: 'log', label: 'Логарифм' }]}
        />
      </>}
      caption="Рис. 4.1. Доля нейтронов, не испытавших взаимодействия на глубине $x$. На логарифмической шкале экспонента становится прямой с наклоном $-\Sigma_t$."
    >
      <canvas ref={ref} role="img" aria-label={`График I/I₀ = exp(−Σx): Σ = ${sigma.toFixed(2)} см⁻¹, λ = ${lam.toFixed(2)} см`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
