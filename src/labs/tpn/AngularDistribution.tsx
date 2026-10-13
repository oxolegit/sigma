import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { angularShape, oneSided, physical } from './field';

/** Серии рисунка: по этой таблице рисуется диаграмма и строится легенда. */
const SERIES = {
  positive: { label: 'угловой поток Φ(μ) ≥ 0', color: 'accent', mark: 'line' },
  negative: { label: 'Φ(μ) < 0 — нефизично', color: 'signal', mark: 'dash' },
  isotropic: { label: 'изотропное поле', color: 'ink-muted', mark: 'dash' },
  current: { label: 'ток вдоль оси z', color: 'ink', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 5.2: полярная диаграмма линейно-анизотропного поля Φ(μ) = Φ/4π · (1 + 3bμ). */
export default function AngularDistribution() {
  const [b, setB] = useState(0.15);
  const s = oneSided(b);
  const ok = physical(b);
  const back = angularShape(b, -Math.sign(b) || -1);

  const ref = useCanvas((g, w, h) => {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.2;
    // Ось z вверх.
    arrow(g, cx, cy + R * 2.2, cx, cy - R * 2.3, token('rule-strong'), 1, 8);
    g.fillStyle = token('ink-muted');
    g.font = plotFont(500, 12);
    g.fillText('z', cx + 6, cy - R * 2.2);

    // Изотропное поле — окружность.
    g.save();
    g.strokeStyle = token(SERIES.isotropic.color);
    g.setLineDash([3, 4]);
    g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke();
    g.restore();

    // Длина луча ∝ Φ(θ); отрицательные значения рисуются пунктиром в противоположную сторону.
    const lobe = (sign: 1 | -1, color: string, dash: number[]) => {
      g.save();
      g.strokeStyle = color;
      g.lineWidth = 2.4;
      g.setLineDash(dash);
      g.beginPath();
      let started = false;
      for (let k = 0; k <= 360; k++) {
        const th = (k * Math.PI) / 180;
        const r = angularShape(b, Math.cos(th));
        if (sign * r < 0) { started = false; continue; }
        const L = Math.abs(r) * R;
        const x = cx + sign * L * Math.sin(th), y = cy - sign * L * Math.cos(th);
        if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
      }
      g.stroke();
      g.restore();
    };
    lobe(1, token(SERIES.positive.color), []);
    lobe(-1, token(SERIES.negative.color), [5, 4]);

    if (Math.abs(b) > 0.005) arrow(g, cx, cy, cx, cy - Math.sign(b) * Math.min(R * 2.1, Math.abs(b) * R * 6), token(SERIES.current.color), 3, 11);
  }, [b]);

  return (
    <LabFrame
      n="5.2" kind="2D" title="Угловое распределение"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'i_z^{+}/\\Phi', value: `= ${s.plus.toFixed(3)}` },
        { tex: 'i_z^{-}/\\Phi', value: `= ${s.minus.toFixed(3)}` },
        { tex: 'i_z/\\Phi', value: `= ${s.net.toFixed(3)}` },
        { label: 'Φ назад, в долях Φ/4π', value: back.toFixed(2) },
      ]}
      status={ok
        ? { tone: 'ok', text: 'Угловой поток везде неотрицателен: линейная анизотропия (P₁) допустима.' }
        : { tone: 'bad', text: '$|b| > 1/3$: в части направлений $\\Phi(\\vec\\Omega) < 0$. Слишком сильная анизотропия для диффузионного (P₁) описания.' }}
      controls={<Slider label="Анизотропия b = i/Φ" min={-0.5} max={0.5} step={0.01} value={b} format={(v) => v.toFixed(2)} onChange={setB} />}
      caption="Рис. 5.2. Полярная диаграмма: длина луча пропорциональна $\Phi(\vec\Omega)$ в этом направлении, ось $z$ — вверх. При $|b| > 1/3$ линейная аппроксимация даёт отрицательный угловой поток в части направлений. Диффузионное приближение годится только для слабой анизотропии."
    >
      <canvas ref={ref} role="img" aria-label={`Полярная диаграмма углового потока при b = ${b.toFixed(2)}: ${ok ? 'везде неотрицателен' : 'есть отрицательные направления'}`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
