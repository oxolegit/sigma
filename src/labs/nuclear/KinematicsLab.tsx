import { useState } from 'react';
import { LabFrame, Segmented, Select, Slider, type LegendItem } from '../../components';
import { sci } from '../../lib/format';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, hline } from '../stats/draw';
import { HBARC_ROUND, PARTICLES, betaClassic, kin, type KinKey, type ParticleKey } from './physics';

const PARTS: ParticleKey[] = ['e', 'mu', 'pi', 'p', 'alpha'];
const KNOWN: { value: KinKey; label: string }[] = [
  { value: 'T', label: 'T' },
  { value: 'pc', label: 'pc' },
  { value: 'lambdaBar', label: 'ƛ' },
  { value: 'gamma', label: 'γ' },
];

const SERIES = {
  rel: { label: 'β(T) — релятивистская формула', color: 'accent', mark: 'line' },
  cl: { label: 'β = √(2T/mc²) — классическая', color: 'signal', mark: 'dash' },
  now: { label: 'частица сейчас', color: 'accent', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

/** Где величина живёт на шкале, в долях от mc²: lg(T/mc²) от −4 до 3. */
const toKin = (m: number, known: KinKey, lg: number) => {
  const T = m * 10 ** lg;
  const k = kin(m, 'T', T, HBARC_ROUND);
  return { k, value: known === 'T' ? k.T : known === 'pc' ? k.pc : known === 'gamma' ? k.gamma : k.lambdaBar };
};
const show = (v: number) => (v >= 1e4 || v < 1e-2 ? sci(v, 3) : String(Number(v.toPrecision(4))));

/** Лаборатория 1.1: одна известная величина — все остальные; где кончается классика. */
export default function KinematicsLab() {
  const [part, setPart] = useState<ParticleKey>('e');
  const [known, setKnown] = useState<KinKey>('T');
  const [lg, setLg] = useState(0.77);
  const P = PARTICLES[part];
  const { k, value } = toKin(P.m, known, lg);
  const bc = betaClassic(P.m, k.T);
  const err = bc / k.beta - 1;

  const ref = useCanvas((g, w, h) => {
    const lo = P.m * 1e-4, hi = P.m * 1e3;
    const xt = decadeTicks(lo, hi, 8), yt = niceTicks(0, 1.4, 7);
    const f = drawFrame(g, w, h, { min: lo, max: hi, ticks: xt, format: decadeLabel, label: 'T, МэВ', log: true }, { min: 0, max: 1.4, ticks: yt, format: tickFormat(yt), label: 'β = v/c' });
    f.clip(() => {
      hline(g, f, 1, token('ink-muted'), 'скорость света');
      const rel: [number, number][] = [], cl: [number, number][] = [];
      for (let i = 0; i <= 300; i++) {
        const T = lo * (hi / lo) ** (i / 300);
        rel.push([f.X(T), f.Y(kin(P.m, 'T', T).beta)]);
        cl.push([f.X(T), f.Y(Math.min(betaClassic(P.m, T), 2))]);
      }
      strokeCurve(g, cl, token(SERIES.cl.color), 2, [6, 5]);
      strokeCurve(g, rel, token(SERIES.rel.color), 2.4);
      dot(g, f.X(k.T), f.Y(k.beta), 6, token(SERIES.now.color));
    });
  }, [part, k.T, k.beta]);

  const regime = k.T < 0.01 * P.m
    ? { tone: 'ok' as const, text: `T ≪ mc²: классика ошибается всего на ${(100 * err).toFixed(2)} % — можно T = mv²/2.` }
    : k.T > 10 * P.m
      ? { tone: 'warn' as const, text: `T ≫ mc²: ультрарелятивистская частица, pc ≈ E ≈ T, β ≈ 1. Классическая скорость больше c в ${bc.toFixed(1)} раз.` }
      : { tone: 'warn' as const, text: `T сравнима с mc² = ${show(P.m)} МэВ: нужны релятивистские формулы, классика ошибается на ${(100 * err).toFixed(0)} %.` };

  const unit = known === 'lambdaBar' ? 'фм' : known === 'gamma' ? '' : 'МэВ';
  return (
    <LabFrame
      n="1.1" kind="2D" title="Одна величина — все остальные"
      legend={Object.values(SERIES)}
      status={regime}
      readout={[
        { tex: 'T', value: show(k.T), unit: 'МэВ' },
        { tex: 'E = T + mc^2', value: show(k.E), unit: 'МэВ' },
        { tex: 'pc', value: show(k.pc), unit: 'МэВ' },
        { tex: '\\beta', value: k.beta > 0.999 ? `1 − ${sci(1 - k.beta, 2)}` : k.beta.toFixed(4) },
        { tex: '\\gamma', value: show(k.gamma) },
        { tex: '\\bar\\lambda = \\hbar c/pc', value: show(k.lambdaBar), unit: 'фм' },
      ]}
      controls={<>
        <Select label="Частица" value={part} onChange={(v) => setPart(v as ParticleKey)} options={PARTS.map((p) => ({ value: p, label: `${PARTICLES[p].name} · ${show(PARTICLES[p].m)} МэВ` }))} />
        <Segmented label="Известно" value={known} onChange={(v) => setKnown(v as KinKey)} options={KNOWN} />
        <Slider label={KNOWN.find((x) => x.value === known)!.label} min={-4} max={3} step={0.01} value={lg} format={() => `${show(value)}${unit ? ` ${unit}` : ''}`} onChange={setLg} />
      </>}
      caption="Рис. 1.1. Цепочка всегда одна: известное → $pc$ → $E = \sqrt{(pc)^2 + (mc^2)^2}$ → остальное. Длина волны — через конверсионную константу $\hbar c \approx 200$ МэВ·фм. Пока $T \ll mc^2$, кривые совпадают; когда $T$ сравнимо с энергией покоя, классическая формула обгоняет релятивистскую и уходит за скорость света."
    >
      <canvas ref={ref} role="img" aria-label={`${P.name}: T = ${show(k.T)} МэВ, β = ${k.beta.toFixed(3)}`} />
    </LabFrame>
  );
}
