import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { energy, sci, sup } from '../../lib/format';
import { plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { energyClass, INTERNUCLEAR, nuclearRadius, reducedWavelength, speed, waveOrParticle } from './neutron';

/** Серии рисунка: по этой таблице рисуется шкала и строится легенда. */
const SERIES = {
  lambda: { label: 'приведённая длина волны ƛ', color: 'accent', mark: 'line' },
  radius: { label: 'радиус ядра R', color: 'ink', mark: 'dash' },
  between: { label: 'расстояние между ядрами', color: 'signal', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

const LO = -14; // 10⁻¹⁴ см
const HI = -6;  // 10⁻⁶ см

/** Лаборатория 1.1: где оказывается ƛ относительно ядра и межъядерного расстояния. */
export default function WavelengthScale() {
  const [logE, setLogE] = useState(Math.log10(0.0253));
  const [A, setA] = useState(238);
  const E = 10 ** logE;
  const lam = reducedWavelength(E);
  const R = nuclearRadius(A);
  const verdict = waveOrParticle(E, A);

  const ref = useCanvas((g, w, h) => {
    const l = 24, r = w - 24, y = Math.round(h * 0.62);
    const X = (v: number) => l + ((Math.log10(v) - LO) / (HI - LO)) * (r - l);
    const clampX = (v: number) => Math.min(Math.max(X(v), l), r);
    const muted = token('ink-muted');

    // Полоса межъядерных расстояний.
    const c = token(SERIES.between.color);
    g.fillStyle = c;
    g.globalAlpha = 0.22;
    g.fillRect(X(INTERNUCLEAR), y - 70, X(3 * INTERNUCLEAR) - X(INTERNUCLEAR), 70);
    g.globalAlpha = 1;
    g.font = plotFont(600, 12);
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('между ядрами', (X(INTERNUCLEAR) + X(3 * INTERNUCLEAR)) / 2, y - 76);

    // Ось.
    g.strokeStyle = muted;
    g.fillStyle = muted;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(l, y + 0.5); g.lineTo(r, y + 0.5); g.stroke();
    g.font = plotFont();
    g.textBaseline = 'top';
    for (let e = LO; e <= HI; e++) {
      const x = Math.round(X(10 ** e)) + 0.5;
      g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke();
      if (w > 480 || e % 2 === 0) g.fillText(`10${sup(e)}`, x, y + 10);
    }
    g.textAlign = 'right';
    g.fillText('длина, см', r, y + 30);

    // Радиус ядра — пунктир.
    const xr = Math.round(clampX(R)) + 0.5;
    g.strokeStyle = token(SERIES.radius.color);
    g.fillStyle = token(SERIES.radius.color);
    g.lineWidth = 1.5;
    g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(xr, y - 70); g.lineTo(xr, y); g.stroke();
    g.setLineDash([]);
    g.font = plotFont(600, 12);
    g.textAlign = xr < l + 40 ? 'left' : 'center';
    g.textBaseline = 'bottom';
    g.fillText('R', xr, y - 76);

    // ƛ — сплошная линия с наконечником, подпись со значением.
    const xl = clampX(lam);
    const a = token(SERIES.lambda.color);
    g.strokeStyle = a;
    g.fillStyle = a;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(xl, y - 110); g.lineTo(xl, y - 10); g.stroke();
    g.beginPath(); g.moveTo(xl, y); g.lineTo(xl - 6, y - 11); g.lineTo(xl + 6, y - 11); g.closePath(); g.fill();
    g.font = plotFont(600, 13);
    g.textAlign = xl > w * 0.75 ? 'right' : xl < w * 0.25 ? 'left' : 'center';
    g.fillText(`ƛ = ${sci(lam, 3)} см`, xl, y - 116);
  }, [lam, R]);

  return (
    <LabFrame
      n="1.1" kind="2D" title="Масштабы длины волны"
      legend={Object.values(SERIES)}
      readout={[
        { tex: '\\bar\\lambda', value: `= ${sci(lam, 3)}`, unit: 'см' },
        { label: 'скорость', value: sci(speed(E) / 100, 3), unit: 'м/с' },
        { label: 'радиус ядра', value: sci(R, 2), unit: 'см' },
        { label: 'класс', value: energyClass(E) },
      ]}
      status={{ tone: verdict.tone, text: `${verdict.interaction} ${verdict.field}` }}
      controls={<>
        <Slider label="Энергия нейтрона" min={-5} max={7.3} step={0.01} value={logE} format={(v) => energy(10 ** v)} onChange={setLogE} />
        <Slider label="Массовое число ядра A" min={1} max={240} step={1} value={A} onChange={setA} />
      </>}
      caption="Рис. 1.1. Логарифмическая шкала длин. Для акта взаимодействия $\bar\lambda$ сравнивают с радиусом ядра, для описания поля в среде — с расстоянием между ядрами."
    >
      <canvas ref={ref} role="img" aria-label={`Шкала длин: ƛ = ${sci(lam, 3)} см при энергии ${energy(E)}, радиус ядра ${sci(R, 2)} см`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
