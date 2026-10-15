import { useMemo, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { plotFont } from '../../lib/plot';
import { mulberry32 } from '../../lib/rng';
import { token } from '../../lib/theme';
import { text } from './draw';
import { coincidences, poissonTimes, randomCoincidenceRate } from './geometry';

const SERIES = {
  pulse: { label: 'импульс детектора', color: 'ink-muted', mark: 'bar' },
  hit: { label: 'случайное совпадение: |t₁ − t₂| < τ', color: 'accent', mark: 'bar' },
  window: { label: 'окно ±τ вокруг импульса первого', color: 'signal', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

/** Длительность имитации, с: совпадений набирается достаточно, чтобы сравнить с 2τν₁ν₂. */
const T = 2;

/** Лаборатория 3.3: два независимых детектора и схема совпадений — темп случайных совпадений 2τν₁ν₂. */
export default function Coincidences() {
  const [nu1, setNu1] = useState(10);
  const [nu2, setNu2] = useState(8);
  const [tau, setTau] = useState(2);
  const [seed, setSeed] = useState(1);
  const sim = useMemo(() => {
    const rng = mulberry32(seed * 6151 + 3);
    const a = poissonTimes(rng, nu1 * 1e3, T), b = poissonTimes(rng, nu2 * 1e3, T);
    return { a, b, hits: coincidences(a, b, tau * 1e-6) };
  }, [nu1, nu2, tau, seed]);
  const theory = randomCoincidenceRate(nu1 * 1e3, nu2 * 1e3, tau * 1e-6);
  const measured = sim.hits.length / T;

  // Окно на рисунке — около 25 импульсов первого детектора; начинаем с первого совпадения, чтобы оно было видно.
  const span = 25 / (nu1 * 1e3);
  const start = Math.max(0, (sim.hits[0]?.[0] ?? 0) - span * 0.4);

  const ref = useCanvas((g, w, h) => {
    const pad = 64, x = (t: number) => pad + ((t - start) / span) * (w - pad - 16);
    const rows = [h * 0.3, h * 0.7];
    const ph = Math.min(48, h * 0.22);
    // Окно ±τ — доли процента ширины рисунка; рисуем не уже 3 px, чтобы его было видно.
    const win = Math.max(3, ((tau * 1e-6) / span) * (w - pad - 16));
    const inView = (t: number) => t >= start && t <= start + span;
    const hitA = new Set(sim.hits.map(([t]) => t)), hitB = new Set(sim.hits.map(([, t]) => t));
    g.save();
    g.strokeStyle = token('rule-strong');
    g.lineWidth = 1;
    rows.forEach((y) => { g.beginPath(); g.moveTo(pad, y); g.lineTo(w - 16, y); g.stroke(); });
    // Окна ±τ вокруг импульсов первого детектора.
    g.globalAlpha = 0.16;
    g.fillStyle = token(SERIES.window.color);
    sim.a.filter(inView).forEach((t) => g.fillRect(x(t) - win, rows[0]! - ph, 2 * win, rows[1]! - rows[0]! + ph));
    g.globalAlpha = 1;
    const pulse = (t: number, y: number, hit: boolean) => {
      g.fillStyle = token(hit ? SERIES.hit.color : SERIES.pulse.color);
      g.fillRect(x(t) - 2, y - ph, 4, ph);
    };
    sim.a.filter(inView).forEach((t) => pulse(t, rows[0]!, hitA.has(t)));
    sim.b.filter(inView).forEach((t) => pulse(t, rows[1]!, hitB.has(t)));
    g.restore();
    text(g, 'ν₁', 12, rows[0]! - ph / 2, token('ink'), 'left', 'middle', 600, 14);
    text(g, 'ν₂', 12, rows[1]! - ph / 2, token('ink'), 'left', 'middle', 600, 14);
    g.font = plotFont();
    text(g, `${(span * 1e3).toFixed(2)} мс`, w - 16, h - 6, token('ink-muted'), 'right', 'bottom', 500, 11);
  }, [sim, start, span, tau]);

  const z = (measured - theory) / Math.sqrt(theory / T || 1);
  return (
    <LabFrame
      n="3.3" kind="2D" title="Случайные совпадения"
      legend={Object.values(SERIES)}
      readout={[
        { label: `за ${T} с совпадений`, value: String(sim.hits.length) },
        { label: 'темп', value: measured.toFixed(0), unit: 'с⁻¹' },
        { tex: '2\\tau\\nu_1\\nu_2', value: `= ${theory.toFixed(0)}`, unit: 'с⁻¹' },
      ]}
      status={{ tone: Math.abs(z) < 2 ? 'ok' : 'warn', text: Math.abs(z) < 2 ? 'Счёт совпадений согласуется с формулой 2τν₁ν₂ в пределах статистической погрешности.' : 'Отклонение больше 2σ — запустите ещё раз: так бывает в ~5 % запусков.' }}
      controls={<>
        <Slider tex="\nu_1" label=" — первый детектор" min={1} max={50} step={1} value={nu1} unit="кГц" onChange={setNu1} />
        <Slider tex="\nu_2" label=" — второй детектор" min={1} max={50} step={1} value={nu2} unit="кГц" onChange={setNu2} />
        <Slider tex="\tau" label=" — окно совпадений" min={0.2} max={10} step={0.1} value={tau} unit="мкс" format={(v) => v.toFixed(1)} onChange={setTau} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={() => setSeed((x) => x + 1)}>Ещё {T} секунды</Button></div>
      </>}
      caption="Рис. 3.3. Детекторы срабатывают независимо, пуассоновскими потоками. Импульс второго попадает в окно $\pm\tau$ вокруг импульса первого с вероятностью $\nu_2\cdot 2\tau$; таких окон в секунду $\nu_1$, отсюда темп случайных совпадений $\nu_{\text{сл}} = 2\tau\nu_1\nu_2$. Это фон, который схема совпадений выдаёт даже без настоящих частиц."
    >
      <canvas ref={ref} role="img" aria-label={`Совпадений ${sim.hits.length} за ${T} с, по формуле ${(theory * T).toFixed(0)}`} />
    </LabFrame>
  );
}
