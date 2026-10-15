import { useState } from 'react';
import { LabFrame, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { hline, text } from '../stats/draw';
import { fermiGas } from './physics';

const SERIES = {
  dos: { label: 'плотность состояний dN/dT ∝ √T', color: 'accent', mark: 'line' },
  filled: { label: 'занятые состояния (T ≤ T_F)', color: 'accent', mark: 'bar' },
  levels: { label: 'дно ямы и уровень Ферми', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 7.2: нуклоны — вырожденный ферми-газ в яме глубиной U = T_F + ε. */
export default function FermiGasLab() {
  const [r0, setR0] = useState(1.4);
  const [eps, setEps] = useState(8);
  const fg = fermiGas(r0, eps);
  const U = fg.T + eps;

  const ref = useCanvas((g, w, h) => {
    const yMin = -Math.ceil((U + 6) / 10) * 10, yMax = 6;
    const yt = niceTicks(yMin, yMax, 6), xt = [0, 0.5, 1];
    const f = drawFrame(g, w, h, { min: 0, max: 1.15, ticks: xt, format: tickFormat(xt), label: 'dN/dT, отн.' }, { min: yMin, max: yMax, ticks: yt, format: tickFormat(yt), label: 'E, МэВ' });
    f.clip(() => {
      const norm = Math.sqrt(fg.T);
      const pts: [number, number][] = [];
      g.save();
      g.fillStyle = token(SERIES.filled.color); g.globalAlpha = 0.2;
      g.beginPath(); g.moveTo(f.X(0), f.Y(-U));
      for (let i = 0; i <= 100; i++) { const T = (fg.T * i) / 100; g.lineTo(f.X(Math.sqrt(T) / norm), f.Y(T - U)); }
      g.lineTo(f.X(0), f.Y(-eps)); g.closePath(); g.fill();
      g.restore();
      for (let i = 0; i <= 140; i++) { const T = ((fg.T + eps + 6) * i) / 140; pts.push([f.X(Math.sqrt(T) / norm), f.Y(T - U)]); }
      strokeCurve(g, pts, token(SERIES.dos.color), 2.2);
      hline(g, f, -U, token(SERIES.levels.color), `дно ямы −U = −${U.toFixed(0)} МэВ`);
      hline(g, f, -eps, token(SERIES.levels.color), `уровень Ферми −ε = −${eps} МэВ`);
      hline(g, f, 0, token('ink-muted'), 'свободный нуклон, E = 0');
      const x = f.X(0.08);
      arrow(g, x, f.Y(-U), x, f.Y(-eps) + 4, token('ink'), 1.4, 8);
      text(g, `T_F = ${fg.T.toFixed(1)} МэВ`, x + 8, f.Y(-(U + eps) / 2), token('ink'));
    });
  }, [r0, eps]);

  return (
    <LabFrame
      n="7.2" kind="2D" title="Ферми-газ нуклонов в ядре"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'p_Fc = \\frac{\\hbar c}{r_0}\\left(\\frac{9\\pi}{8}\\right)^{1/3}', value: fg.pc.toFixed(0), unit: 'МэВ' },
        { tex: 'T_F = \\frac{(p_Fc)^2}{2m_Nc^2}', value: fg.T.toFixed(1), unit: 'МэВ' },
        { tex: 'U = T_F + \\varepsilon', value: U.toFixed(1), unit: 'МэВ' },
        { tex: '\\langle T\\rangle = \\tfrac35T_F', value: fg.mean.toFixed(1), unit: 'МэВ' },
      ]}
      status={{ tone: 'ok', text: `Нуклоны носятся по ядру с импульсами до ${fg.pc.toFixed(0)} МэВ/c — это ${(fg.pc / Math.sqrt(fg.pc ** 2 + 938.9 ** 2)).toFixed(2)} c, газ почти нерелятивистский.` }}
      controls={<>
        <Slider label="r₀" min={1} max={1.5} step={0.01} value={r0} unit="фм" onChange={setR0} />
        <Slider label="Энергия связи последнего нуклона ε" min={5} max={10} step={0.5} value={eps} unit="МэВ" onChange={setEps} />
      </>}
      caption="Рис. 7.2. По принципу Паули в каждом состоянии — один нуклон, поэтому даже в основном состоянии ядра нуклоны движутся. Протоны и нейтроны по $A/2$ занимают все состояния до импульса Ферми. Самый энергичный нуклон всё ещё связан на $\varepsilon \approx 8$ МэВ — отсюда глубина ямы. Ответ сборника (32, 40 и 19 МэВ) соответствует $r_0 \approx 1.2$ фм, а при $r_0 = 1.4$ фм выходит 24.5 МэВ."
    >
      <canvas ref={ref} role="img" aria-label={`r₀ = ${r0} фм: T_F = ${fg.T.toFixed(1)} МэВ, U = ${U.toFixed(0)} МэВ`} />
    </LabFrame>
  );
}
