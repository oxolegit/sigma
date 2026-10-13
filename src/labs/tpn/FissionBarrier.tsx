import { useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, plotFont, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import { deformationEnergy, excitation, fissionVerdict, SADDLE, target, TARGETS, threshold } from './fission';

/** Серии рисунка: по этой таблице рисуется график и строится легенда. */
const SERIES = {
  potential: { label: 'энергия деформации V(ε)', color: 'ink', mark: 'line' },
  excitation: { label: 'энергия возбуждения E*', color: 'accent', mark: 'line' },
  barrier: { label: 'барьер деления Uб', color: 'signal', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

/** Лаборатория 2.1: хватит ли энергии возбуждения составного ядра, чтобы перевалить через барьер деления. */
export default function FissionBarrier() {
  const [id, setId] = useState('u238');
  const [E, setE] = useState(0.3);
  const t = target(id);
  const Es = excitation(t, E);
  const verdict = fissionVerdict(t, E);
  const thr = threshold(t);

  const ref = useCanvas((g, w, h) => {
    const f = drawFrame(
      g, w, h,
      { min: 0, max: 1, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], format: (v) => v.toFixed(1), label: 'деформация ε' },
      { min: -4, max: 10, ticks: [-4, -2, 0, 2, 4, 6, 8, 10], label: 'V, МэВ' },
    );
    // Барьер — пунктир на высоте Uб.
    g.save();
    g.strokeStyle = token(SERIES.barrier.color);
    g.fillStyle = token(SERIES.barrier.color);
    g.setLineDash([5, 5]);
    g.lineWidth = 1.5;
    const yb = Math.round(f.Y(t.ub)) + 0.5;
    g.beginPath(); g.moveTo(f.left, yb); g.lineTo(f.left + f.width, yb); g.stroke();
    g.setLineDash([]);
    g.font = plotFont(600, 12);
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(`Uб = ${t.ub.toFixed(2)} МэВ`, f.X(SADDLE), yb - 6);
    g.restore();

    const pts: [number, number][] = [];
    for (let k = 0; k <= 200; k++) pts.push([f.X(k / 200), f.Y(deformationEnergy(k / 200, t.ub))]);
    f.clip(() => strokeCurve(g, pts, token(SERIES.potential.color), 2));

    // E* — сплошная линия accent с подписью.
    const ye = Math.round(f.Y(Es)) + 0.5;
    g.strokeStyle = token(SERIES.excitation.color);
    g.fillStyle = token(SERIES.excitation.color);
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(f.left, ye); g.lineTo(f.left + f.width, ye); g.stroke();
    g.font = plotFont(600, 12);
    g.textAlign = 'left';
    g.textBaseline = Es > t.ub ? 'bottom' : 'top';
    g.fillText(`E* = ${Es.toFixed(2)} МэВ`, f.left + 6, ye + (Es > t.ub ? -6 : 6));
  }, [id, E]);

  return (
    <LabFrame
      n="2.1" kind="2D" title="Хватит ли энергии для деления"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'E_{\\text{св}}', value: `= ${t.eb.toFixed(2)}`, unit: 'МэВ' },
        { tex: 'E^*', value: `= ${Es.toFixed(2)}`, unit: 'МэВ' },
        { tex: 'U_{\\text{б}}', value: `= ${t.ub.toFixed(2)}`, unit: 'МэВ' },
        { label: 'порог по E', value: thr > 0 ? thr.toFixed(2) : 'нет', unit: thr > 0 ? 'МэВ' : undefined },
      ]}
      status={{ tone: verdict.tone, text: verdict.text }}
      controls={<>
        <Select label="Ядро-мишень" value={id} onChange={setId} options={TARGETS.map((x) => ({ value: x.id, label: x.label }))} />
        <Slider label="Кинетическая энергия нейтрона" min={0} max={3} step={0.01} value={E} unit="МэВ" format={(v) => v.toFixed(2)} onChange={setE} />
      </>}
      caption="Рис. 2.1. Схематичная энергия деформации ядра-капли: растёт до барьера деления, за точкой разрыва резко падает — осколки расталкиваются кулоновскими силами. Энергии связи — из табл. 1.8 пособия, барьеры приближённые (5.5–6 МэВ); для ²³⁸U и ²³²Th подобраны так, чтобы порог совпал с пособием: ≈ 1 и ≈ 1.2 МэВ."
    >
      <canvas ref={ref} role="img" aria-label={`Энергия деформации ядра ${t.compound}: барьер ${t.ub} МэВ, энергия возбуждения ${Es.toFixed(2)} МэВ`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
