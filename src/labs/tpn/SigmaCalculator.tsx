import { useState } from 'react';
import { LabFrame, Select, Slider, type Readout } from '../../components';
import { sci } from '../../lib/format';
import { macroscopic, material, MATERIAL_OPTIONS } from './crossSections';

const NU_235 = 2.442;

/** Лаборатория 3.2: макросечения материала в тепловой точке по микросечениям нуклидов. */
export default function SigmaCalculator() {
  const [id, setId] = useState('uo2');
  const [enrichment, setEnrichment] = useState(4);
  const m = material(id, enrichment / 100);
  const r = macroscopic(m);

  const readout: Readout[] = [
    { tex: '\\Sigma_t', value: `= ${sci(r.St, 3)}`, unit: 'см⁻¹' },
    { tex: '\\lambda = 1/\\Sigma_t', value: `= ${sci(1 / r.St, 3)}`, unit: 'см' },
    { tex: '\\Sigma_s/\\Sigma_a', value: `= ${sci(r.Ss / r.Sa, 3)}` },
  ];
  if (r.Sf > 0) readout.push({ tex: '\\nu\\Sigma_f', value: `= ${sci(NU_235 * r.Sf, 3)}`, unit: 'см⁻¹' });

  return (
    <LabFrame
      n="3.2" kind="2D" title="Калькулятор Σ" stage="table"
      readout={readout}
      status={{
        tone: r.Sa > r.Ss ? 'warn' : 'ok',
        // У кадмия вывод про диффузию уже есть в примечании материала.
        text: r.Sa > r.Ss && id !== 'cd' ? `${m.note} Здесь $\\Sigma_a > \\Sigma_s$ — диффузионное приближение в чистом материале неприменимо.` : m.note,
      }}
      controls={<>
        <Select label="Материал" value={id} onChange={setId} options={MATERIAL_OPTIONS} />
        {id === 'uo2' && (
          <Slider label="Обогащение по ²³⁵U (масс.)" min={0.711} max={20} step={0.01} value={enrichment} unit="%" format={(v) => v.toFixed(2)} onChange={setEnrichment} />
        )}
      </>}
      caption={`Тепловая точка 0.0253 эВ, микросечения из приложений 1–2 пособия; ρ = ${m.rho} г/см³, M = ${m.M.toFixed(2)} г/моль${r.Sf > 0 ? `, ν(²³⁵U) = ${NU_235}` : ''}.`}
    >
      <table>
        <caption className="sg-visually-hidden">Макросечения по нуклидам: {m.label}</caption>
        <thead>
          <tr><th scope="col">Нуклид</th><th scope="col">N, см⁻³</th><th scope="col">σa, б</th><th scope="col">σs, б</th><th scope="col">Σa, см⁻¹</th><th scope="col">Σs, см⁻¹</th>{r.Sf > 0 && <th scope="col">Σf, см⁻¹</th>}</tr>
        </thead>
        <tbody>
          {r.rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td><td>{sci(row.N, 4)}</td><td>{sci(row.sa, 4)}</td><td>{sci(row.ss, 3)}</td>
              <td>{sci(row.Sa, 3)}</td><td>{sci(row.Ss, 3)}</td>{r.Sf > 0 && <td>{row.Sf ? sci(row.Sf, 3) : '—'}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td>Сумма</td><td /><td /><td /><td>{sci(r.Sa, 3)}</td><td>{sci(r.Ss, 3)}</td>{r.Sf > 0 && <td>{sci(r.Sf, 3)}</td>}</tr>
        </tfoot>
      </table>
    </LabFrame>
  );
}
