import { useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { ELEMENTS } from './nuclides';
import { deformation, intrinsicQ, qProjection, radius } from './physics';

/** Ядра задач 3.15–3.16 и пара сильно деформированных для сравнения: наблюдаемый ⟨Q⟩ в барнах. */
const NUCLEI = [
  { A: 36, Z: 17, J: 2, Q: -0.018 },
  { A: 55, Z: 25, J: 2.5, Q: 0.33 },
  { A: 39, Z: 19, J: 1.5, Q: 0.0585 },
  { A: 63, Z: 29, J: 1.5, Q: -0.211 },
  { A: 175, Z: 71, J: 3.5, Q: 3.49 },
  { A: 181, Z: 73, J: 3.5, Q: 3.17 },
];

const SERIES = {
  shape: { label: 'ядро — однородно заряженный эллипсоид', color: 'accent', mark: 'bar' },
  sphere: { label: 'шар того же среднего радиуса R̄', color: 'ink-muted', mark: 'dash' },
  axis: { label: 'ось симметрии (направление спина)', color: 'signal', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

const frac = (j: number) => (Number.isInteger(j) ? String(j) : `${Math.round(2 * j)}/2`);

/** Лаборатория 7.1: знак и величина квадрупольного момента — форма ядра. */
export default function QuadrupoleLab() {
  const [id, setId] = useState('1');
  const n = NUCLEI[Number(id)]!;
  const Q0fromData = intrinsicQ(n.Q, n.J);
  const [beta, setBeta] = useState(deformation(Q0fromData, n.Z, n.A));
  const R = radius(n.A);
  const b = R * (1 + beta / 2), a = R * (1 - beta / 2);
  const Q0 = (0.8 * n.Z * R * R * beta) / 100;
  const Qobs = Q0 * qProjection(n.J);

  const ref = useCanvas((g, w, h) => {
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) * 0.36) / (R * 1.25);
    g.save();
    g.strokeStyle = token(SERIES.sphere.color); g.setLineDash([6, 5]); g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, R * scale, 0, 2 * Math.PI); g.stroke();
    g.setLineDash([]);
    g.fillStyle = token(SERIES.shape.color); g.globalAlpha = 0.22;
    g.beginPath(); g.ellipse(cx, cy, a * scale, b * scale, 0, 0, 2 * Math.PI); g.fill();
    g.globalAlpha = 1; g.strokeStyle = token(SERIES.shape.color); g.lineWidth = 2.4; g.stroke();
    arrow(g, cx, cy + b * scale + 18, cx, cy - b * scale - 22, token(SERIES.axis.color), 1.8, 10);
    g.font = plotFont(600, 12); g.fillStyle = token('ink'); g.textBaseline = 'middle';
    g.textAlign = 'left'; g.fillText(`b = ${b.toFixed(2)} фм`, cx + 10, cy - b * scale * 0.55);
    g.textAlign = 'center'; g.fillText(`a = ${a.toFixed(2)} фм`, cx + (a * scale) / 2, cy + 14);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + a * scale, cy); g.strokeStyle = token('ink'); g.lineWidth = 1; g.stroke();
    g.restore();
  }, [beta, n.A]);

  const shape = Math.abs(beta) < 0.01 ? 'почти шар' : beta > 0 ? 'вытянуто вдоль оси (огурец), Q > 0' : 'сплюснуто вдоль оси (диск), Q < 0';
  return (
    <LabFrame
      n="7.1" kind="2D" title="Квадрупольный момент и форма ядра"
      legend={Object.values(SERIES)}
      status={{ tone: Math.abs(beta) > 0.2 ? 'warn' : 'ok', text: `Ядро ${shape}. ${Math.abs(beta) > 0.2 ? 'Это уже сильная деформация — такие ядра у редких земель и актинидов.' : ''}` }}
      readout={[
        { tex: '\\beta', value: beta.toFixed(3) },
        { tex: 'Q_0 = \\tfrac45 Z\\bar R^2\\beta', value: Q0.toFixed(3), unit: 'б' },
        { tex: '\\langle Q\\rangle', value: Qobs.toFixed(3), unit: 'б' },
        { label: 'измерено', value: `${n.Q} б` },
      ]}
      controls={<>
        <Select label="Ядро" value={id} onChange={(v) => { setId(v); const m = NUCLEI[Number(v)]!; setBeta(deformation(intrinsicQ(m.Q, m.J), m.Z, m.A)); }} options={NUCLEI.map((m, i) => ({ value: String(i), label: `${m.A}${ELEMENTS[m.Z]} · J = ${frac(m.J)} · ⟨Q⟩ = ${m.Q} б` }))} />
        <Slider label="Деформация β" min={-0.4} max={0.4} step={0.001} value={beta} onChange={setBeta} />
      </>}
      caption={`Рис. 7.1. Сферическое ядро квадрупольного момента не имеет. Вытянутое вдоль оси даёт $Q > 0$, сплюснутое — $Q < 0$. Измеряют проекцию на направление спина, она меньше собственного момента: $\\langle Q\\rangle = \\frac{J(2J - 1)}{(J + 1)(2J + 3)}Q_0$, для J = ${frac(n.J)} множитель ${qProjection(n.J).toFixed(3)}. При $J = 0$ и $J = 1/2$ он равен нулю — такие ядра квадруполь не покажут, даже если деформированы.`}
    >
      <canvas ref={ref} role="img" aria-label={`β = ${beta.toFixed(3)}: ${shape}`} />
    </LabFrame>
  );
}
