import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { sci } from '../../lib/format';
import { plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { fickConditions, fickCurrents, muBar } from './fick';

/** Серии рисунка: по этой таблице рисуются столбцы и строится легенда. */
const SERIES = {
  plus: { label: 'i⁺/Φ — по оси z', color: 'accent', mark: 'bar' },
  minus: { label: 'i⁻/Φ — против оси z', color: 'signal', mark: 'bar' },
  net: { label: 'полный ток i/Φ', color: 'ink', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

const MARK = { ok: '✓', warn: '!', bad: '✕' } as const;

/** Лаборатория 7.1: выполняются ли условия закона Фика и что он даёт для односторонних токов. */
export default function FickCheck() {
  const [A, setA] = useState(12);
  const [logRatio, setLogRatio] = useState(-3);
  const [distance, setDistance] = useState(5);
  const [s, setS] = useState(-0.3);
  const ratio = 10 ** logRatio;
  const c = fickCurrents(s);
  const check = fickConditions(A, ratio, distance, s);

  const ref = useCanvas((g, w, h) => {
    const base = Math.round(h * 0.62) + 0.5;
    const scale = (h * 0.5) / 0.75;
    const bw = Math.min(80, w / 6);
    const bars = [
      { key: 'plus', value: c.plus, label: 'i⁺/Φ' },
      { key: 'minus', value: c.minus, label: 'i⁻/Φ' },
      { key: 'net', value: c.net, label: 'i/Φ' },
    ] as const;
    g.strokeStyle = token('rule-strong');
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(16, base); g.lineTo(w - 16, base); g.stroke();
    bars.forEach((b, k) => {
      const x = w * (0.22 + 0.28 * k);
      const y = base - b.value * scale;
      const color = token(SERIES[b.key].color);
      g.fillStyle = color;
      g.globalAlpha = 0.22;
      g.fillRect(x - bw / 2, Math.min(y, base), bw, Math.abs(y - base));
      g.globalAlpha = 1;
      g.strokeStyle = color;
      g.lineWidth = 1.5;
      // Отрицательный односторонний ток — пунктирный контур: такого тока не бывает.
      g.setLineDash(b.key !== 'net' && b.value < 0 ? [5, 4] : []);
      g.strokeRect(x - bw / 2, Math.min(y, base), bw, Math.abs(y - base));
      g.setLineDash([]);
      g.fillStyle = token('ink');
      g.font = plotFont(600, 13);
      g.textAlign = 'center';
      g.textBaseline = b.value >= 0 ? 'bottom' : 'top';
      g.fillText(b.value.toFixed(3), x, b.value >= 0 ? y - 6 : y + 6);
      g.fillStyle = token('ink-muted');
      g.font = plotFont(500, 12);
      g.textBaseline = 'bottom';
      g.fillText(b.label, x, h - 8);
    });
  }, [s]);

  return (
    <LabFrame
      n="7.1" kind="2D" title="Применим ли закон Фика"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\bar\\mu = 2/(3A)', value: `= ${muBar(A).toFixed(3)}` },
        { tex: 'i^{+}/\\Phi', value: `= ${c.plus.toFixed(3)}` },
        { tex: 'i^{-}/\\Phi', value: `= ${c.minus.toFixed(3)}` },
      ]}
      table={
        <ul className="sg-checklist" aria-label="Условия закона Фика">
          {check.items.map((it, i) => (
            <li key={i} className={`is-${it.tone}`}><span className="sg-checklist-mark" aria-hidden="true">{MARK[it.tone]}</span>{it.text}</li>
          ))}
        </ul>
      }
      status={{
        tone: check.tone,
        text: check.tone === 'ok'
          ? `Закон Фика применим: $D = 1/(3\\Sigma_{tr})$, $\\Sigma_{tr} \\approx \\Sigma_s(1 - ${muBar(A).toFixed(3)}) + \\Sigma_a$.`
          : check.tone === 'warn'
            ? 'Закон Фика применим с оговорками: ожидайте заметную погрешность.'
            : 'Закон Фика здесь неприменим: нужна транспортная теория (уравнение Больцмана, гл. 7).',
      }}
      controls={<>
        <Slider label="Массовое число A" min={1} max={240} step={1} value={A} onChange={setA} />
        <Slider label="Σa/Σs" min={-4} max={0} step={0.05} value={logRatio} format={(v) => sci(10 ** v, 2)} onChange={setLogRatio} />
        <Slider label="До неоднородности" min={0} max={10} step={0.1} value={distance} unit="λ" format={(v) => v.toFixed(1)} onChange={setDistance} />
        <Slider label="Градиент s = λtr·Φ′/Φ" min={-2.5} max={2.5} step={0.05} value={s} format={(v) => v.toFixed(2)} onChange={setS} />
      </>}
      caption="Рис. 7.1. Односторонние токи по формуле (2.5): $i^\pm/\Phi = 1/4 \mp s/6$, где $s = \lambda_{tr}\,\Phi'/\Phi$. При $|s| > 1.5$ формула даёт отрицательный односторонний ток (пунктирный контур) — бессмыслица: поток меняется слишком сильно на длине пробега, и диффузия неприменима. Так бывает около источников и границ."
    >
      <canvas ref={ref} role="img" aria-label={`Односторонние токи при градиенте ${s.toFixed(2)}: i⁺/Φ = ${c.plus.toFixed(3)}, i⁻/Φ = ${c.minus.toFixed(3)}`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
