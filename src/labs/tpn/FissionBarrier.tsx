import { useState } from 'react';
import { LabFrame, Select, Slider } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { excitation, fissionVerdict, target, TARGETS, threshold } from './fission';
import { drawEnergyBars, drawPotential, ENERGY_SERIES } from './fissionPlot';

const LEGEND = [ENERGY_SERIES.excitation, ENERGY_SERIES.barrier, ENERGY_SERIES.potential, ENERGY_SERIES.levelE, ENERGY_SERIES.levelB];

/** Лаборатория 2.1: хватит ли энергии возбуждения составного ядра, чтобы перевалить через барьер деления. */
export default function FissionBarrier() {
  const [id, setId] = useState('u238');
  const [E, setE] = useState(0.3);
  const t = target(id);
  const Es = excitation(t, E);
  const verdict = fissionVerdict(t, E);
  const thr = threshold(t);

  // Сверху — баланс энергий столбцами, снизу — энергия деформации V(ε).
  const ref = useCanvas((g, w, h) => {
    const h1 = Math.round(h * 0.42);
    drawEnergyBars(g, 0, 0, w, h1, t, E);
    drawPotential(g, 0, h1, w, h - h1, t, Es);
  }, [id, E]);

  return (
    <LabFrame
      n="2.1" kind="2D" title="Хватит ли энергии для деления" stage="tall"
      legend={LEGEND}
      readout={[
        { tex: 'E_{\\text{св}}', value: `= ${t.eb.toFixed(2)}`, unit: 'МэВ' },
        { tex: 'E^*', value: `= ${Es.toFixed(2)}`, unit: 'МэВ' },
        { tex: 'U_{\\text{б}}', value: `= ${t.ub.toFixed(2)}`, unit: 'МэВ' },
        { tex: 'E^* - U_{\\text{б}}', value: `= ${(Es - t.ub).toFixed(2)}`, unit: 'МэВ' },
        { label: 'порог по E', value: thr > 0 ? thr.toFixed(2) : 'нет', unit: thr > 0 ? 'МэВ' : undefined },
      ]}
      status={{ tone: verdict.tone, text: verdict.text }}
      controls={<>
        <Select label="Ядро-мишень" value={id} onChange={setId} options={TARGETS.map((x) => ({ value: x.id, label: x.label }))} />
        <Slider label="Кинетическая энергия нейтрона" min={0} max={3} step={0.01} value={E} unit="МэВ" format={(v) => v.toFixed(2)} onChange={setE} />
      </>}
      caption="Рис. 2.1. Сверху — баланс энергий: энергия возбуждения составного ядра $E^* = E_{\text{св}} + E$ против барьера деления; отрезок между ними — сколько энергии не хватает или какой запас. Снизу — схематичная энергия деформации ядра-капли: растёт до барьера, за точкой разрыва резко падает — осколки расталкиваются кулоновскими силами. Энергии связи — из табл. 1.8 пособия, барьеры приближённые (5.5–6 МэВ); для ²³⁸U и ²³²Th подобраны так, чтобы порог совпал с пособием: ≈ 1 и ≈ 1.2 МэВ."
    >
      <canvas ref={ref} role="img" aria-label={`${t.compound}: E* = ${t.eb.toFixed(2)} + ${E.toFixed(2)} = ${Es.toFixed(2)} МэВ, барьер ${t.ub} МэВ, ${Es >= t.ub ? `запас ${(Es - t.ub).toFixed(2)}` : `не хватает ${(t.ub - Es).toFixed(2)}`} МэВ`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
