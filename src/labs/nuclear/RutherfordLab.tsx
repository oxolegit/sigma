import { useMemo, useState } from 'react';
import { LabFrame, Segmented, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, text } from '../stats/draw';
import { rMinHeadOn } from './physics';

const TARGETS = [{ value: '79', label: 'золото, Z = 79' }, { value: '47', label: 'серебро, Z = 47' }, { value: '29', label: 'медь, Z = 29' }, { value: '13', label: 'алюминий, Z = 13' }];
const FAN = [0.12, 0.25, 0.4, 0.6, 0.9, 1.3, 2, 3];

const SERIES = {
  fan: { label: 'траектории при разных прицельных параметрах', color: 'ink-muted', mark: 'line' },
  sel: { label: 'выбранная траектория', color: 'accent', mark: 'line' },
  nucleus: { label: 'ядро', color: 'signal', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

/**
 * Траектория в единицах d = zZe²/(4πε₀T): начальная скорость 1, ускорение ±r̂/(2r²).
 * Ядро тяжёлое и стоит на месте; интегрирование — Верле с шагом, мельчающим у ядра.
 */
function trajectory(b: number, sign: 1 | -1, L = 9): [number, number][] {
  let x = -L, y = b, vx = 1, vy = 0;
  const pts: [number, number][] = [[x, y]];
  const acc = (px: number, py: number) => { const r = Math.hypot(px, py); const k = (sign * 0.5) / (r * r * r); return [k * px, k * py] as const; };
  let [ax, ay] = acc(x, y);
  for (let i = 0; i < 20000 && Math.hypot(x, y) < L + 1; i++) {
    const dt = 0.004 * Math.max(0.05, Math.min(1, Math.hypot(x, y)));
    x += vx * dt + 0.5 * ax * dt * dt; y += vy * dt + 0.5 * ay * dt * dt;
    const [nx, ny] = acc(x, y);
    vx += 0.5 * (ax + nx) * dt; vy += 0.5 * (ay + ny) * dt; ax = nx; ay = ny;
    if (i % 4 === 0) pts.push([x, y]);
  }
  pts.push([x, y]);
  return pts;
}

/** Лаборатория 8.1: рассеяние в кулоновском поле — прицельный параметр задаёт угол. */
export default function RutherfordLab() {
  const [sign, setSign] = useState<'1' | '-1'>('1');
  const [b, setB] = useState(0.5);
  const [Z, setZ] = useState('79');
  const [T, setT] = useState(5);
  const s = Number(sign) as 1 | -1;
  const d = rMinHeadOn(2, Number(Z), T);
  const theta = 2 * Math.atan(1 / (2 * b));
  const rmin = s > 0 ? 0.5 * (1 + 1 / Math.sin(theta / 2)) : 0.5 * (1 / Math.sin(theta / 2) - 1);
  const fan = useMemo(() => FAN.flatMap((v) => [trajectory(v, s), trajectory(-v, s)]), [s]);
  const sel = useMemo(() => trajectory(b, s), [b, s]);

  const ref = useCanvas((g, w, h) => {
    const view = 4.5, scale = Math.min(w / (2 * view), h / (1.6 * view));
    const X = (x: number) => w / 2 + x * scale, Y = (y: number) => h / 2 - y * scale;
    for (const t of fan) strokeCurve(g, t.map(([x, y]) => [X(x), Y(y)]), token(SERIES.fan.color), 1.1);
    strokeCurve(g, sel.map(([x, y]) => [X(x), Y(y)]), token(SERIES.sel.color), 2.6);
    g.save(); g.strokeStyle = token('ink-muted'); g.setLineDash([4, 4]); g.beginPath(); g.arc(X(0), Y(0), rmin * scale, 0, 2 * Math.PI); g.stroke(); g.restore();
    dot(g, X(0), Y(0), 6, token(SERIES.nucleus.color));
    text(g, `r_min = ${(rmin * d).toFixed(1)} фм`, X(0) + rmin * scale + 6, Y(0) + 14, token('ink-muted'));
    g.save(); g.strokeStyle = token('rule-strong'); g.beginPath(); g.moveTo(X(-view), Y(b)); g.lineTo(X(-view + 0.8), Y(b)); g.stroke(); g.restore();
    text(g, `b = ${(b * d).toFixed(1)} фм`, X(-view) + 4, Y(b) - 12, token(SERIES.sel.color));
  }, [fan, sel, b, rmin, d]);

  return (
    <LabFrame
      n="8.1" kind="2D" title="Траектории в кулоновском поле"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'd = \\frac{zZe^2}{4\\pi\\varepsilon_0T}', value: d.toFixed(1), unit: 'фм' },
        { tex: '\\theta = 2\\operatorname{arctg}\\frac{d}{2b}', value: `${((theta * 180) / Math.PI).toFixed(1)}°` },
        { tex: 'r_{\\min}', value: (rmin * d).toFixed(1), unit: 'фм' },
      ]}
      status={{ tone: 'ok', text: s > 0 ? 'Одноимённые заряды: частица отталкивается и огибает ядро снаружи — гипербола, ядро во внешнем фокусе.' : 'Разноимённые: частица притягивается и заворачивает вокруг ядра — ядро во внутреннем фокусе. Угол рассеяния тот же — формула Резерфорда от знака не зависит.' }}
      controls={<>
        <Segmented label="Заряды частицы и ядра" value={sign} onChange={(v) => setSign(v as '1' | '-1')} options={[{ value: '1', label: 'q₁q₂ > 0' }, { value: '-1', label: 'q₁q₂ < 0' }]} />
        <Slider label="Прицельный параметр b/d" min={0.1} max={3} step={0.01} value={b} onChange={setB} />
        <Select label="Ядро" value={Z} onChange={setZ} options={TARGETS} />
        <Slider label="Энергия α-частицы T" min={2} max={10} step={0.1} value={T} unit="МэВ" onChange={setT} />
      </>}
      caption="Рис. 8.1. Задача 4.1. Масштаб — в единицах $d$, расстояния лобового сближения: картина одинакова для любой энергии и ядра, меняется только $d$ в фм. Чем ближе пролёт, тем больше угол: $\operatorname{tg}(\theta/2) = d/2b$. Пунктирная окружность — минимальное расстояние до ядра на выбранной траектории."
    >
      <canvas ref={ref} role="img" aria-label={`b = ${(b * d).toFixed(1)} фм, θ = ${((theta * 180) / Math.PI).toFixed(0)}°`} />
    </LabFrame>
  );
}
