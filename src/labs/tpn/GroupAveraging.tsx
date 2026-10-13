import { useMemo, useState } from 'react';
import { LabFrame, Segmented, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { energy, sci } from '../../lib/format';
import { decadeLabel, decadeTicks, drawFrame, plotFont, strokeCurve } from '../../lib/plot';
import { token } from '../../lib/theme';
import {
  CROSS_SECTIONS, GROUP_STRUCTURES, groupAverages, groupGrid, kT, SPECTRA,
  type CrossSectionId, type SpectrumId, type Structure,
} from './groups';

/** Серии рисунка: по этой таблице рисуются оба графика и строится легенда. */
const SERIES = {
  sigma: { label: 'σ(E)', color: 'ink-muted', mark: 'line' },
  weighted: { label: 'σg с весом Φ(E)', color: 'accent', mark: 'line' },
  plain: { label: 'простое среднее σ по E', color: 'signal', mark: 'dash' },
  spectrum: { label: 'спектр на единицу летаргии EΦ(E)', color: 'ink', mark: 'bar' },
} as const satisfies Record<string, LegendItem>;

const E_MIN = 1e-5;
const E_MAX = 1.05e7;

/** Лаборатория 6.1: то же, что делает JANIS, — свёртка σ(E) со спектром по каждой группе. */
export default function GroupAveraging() {
  const [xs, setXs] = useState<CrossSectionId>('u238c');
  const [spec, setSpec] = useState<SpectrumId>('thermal');
  const [structure, setStructure] = useState<Structure>('5');
  const [T, setT] = useState(350);
  const grid = useMemo(groupGrid, []);
  const bounds = GROUP_STRUCTURES[structure];
  const r = useMemo(
    () => groupAverages(grid, bounds, CROSS_SECTIONS[xs].sigma, (E) => SPECTRA[spec].phi(E, kT(T))),
    [grid, bounds, xs, spec, T],
  );

  const ref = useCanvas((g, w, h) => {
    const h1 = Math.round(h * 0.6);
    const xAxis = { min: E_MIN, max: E_MAX, ticks: decadeTicks(E_MIN, E_MAX, w < 480 ? 5 : 7), format: decadeLabel, label: 'E, эВ', log: true };
    const [ymin, ymax] = CROSS_SECTIONS[xs].range;

    // Верхний график: σ(E), групповые и простые средние ступеньками.
    const f = drawFrame(g, w, h1, xAxis, { min: ymin, max: ymax, ticks: decadeTicks(ymin, ymax, 5), format: decadeLabel, label: 'σ, барн', log: true });
    const step = Math.max(1, Math.floor(grid.length / 5000));
    const sig: [number, number][] = [];
    for (let i = 0; i < grid.length; i += step) sig.push([f.X(grid[i]!), f.Y(Math.max(r.sigma[i]!, ymin * 1e-3))]);
    const stairs = (key: 'weighted' | 'plain') => r.rows.flatMap((row) => [[f.X(row.hi), f.Y(Math.max(row[key], ymin * 1e-3))], [f.X(row.lo), f.Y(Math.max(row[key], ymin * 1e-3))]] as [number, number][]);
    f.clip(() => {
      strokeCurve(g, sig, token(SERIES.sigma.color), 1);
      strokeCurve(g, stairs('plain'), token(SERIES.plain.color), 2, [6, 4]);
      strokeCurve(g, stairs('weighted'), token(SERIES.weighted.color), 2.6);
    });

    // Нижний график: EΦ(E), нормированный, и границы групп с номерами.
    g.save();
    g.translate(0, h1);
    const f2 = drawFrame(g, w, h - h1, xAxis, { min: 0, max: 1.08, ticks: [0, 0.5, 1], format: (v) => v.toFixed(1), label: 'EΦ(E), отн.' });
    let smax = 0;
    for (let i = 0; i < grid.length; i++) smax = Math.max(smax, grid[i]! * r.phi[i]!);
    const spectrum: [number, number][] = [];
    for (let i = 0; i < grid.length; i += step) spectrum.push([f2.X(grid[i]!), f2.Y((grid[i]! * r.phi[i]!) / (smax || 1))]);
    f2.clip(() => {
      const c = token(SERIES.spectrum.color);
      g.fillStyle = c;
      g.globalAlpha = 0.22;
      g.beginPath();
      g.moveTo(spectrum[0]![0], f2.Y(0));
      spectrum.forEach(([x, y]) => g.lineTo(x, y));
      g.lineTo(spectrum[spectrum.length - 1]![0], f2.Y(0));
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
      strokeCurve(g, spectrum, c, 1.6);
      g.strokeStyle = token('rule-strong');
      g.setLineDash([3, 3]);
      for (const b of bounds.slice(1, -1)) { const x = Math.round(f2.X(b)) + 0.5; g.beginPath(); g.moveTo(x, f2.top); g.lineTo(x, f2.top + f2.height); g.stroke(); }
      g.setLineDash([]);
      if (r.rows.length <= 6) {
        g.fillStyle = token('ink-muted');
        g.font = plotFont(600, 12);
        g.textAlign = 'center';
        g.textBaseline = 'top';
        r.rows.forEach((row) => g.fillText(String(row.g), (f2.X(row.hi) + f2.X(row.lo)) / 2, f2.top + 2));
      }
    });
    g.restore();
  }, [r, xs, structure]);

  const totalFlux = r.rows.reduce((s, row) => s + row.flux, 0);

  return (
    <LabFrame
      n="6.1" kind="2D" title="Усреднение сечения по спектру" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'одногрупповое σ̄', value: sci(r.oneGroup, 3), unit: 'б' },
        { label: 'проверка Σσg·Φg / ∫σΦ dE', value: r.conservation.toFixed(4) },
      ]}
      table={
        <table>
          <thead><tr><th scope="col">g</th><th scope="col">границы</th><th scope="col">доля потока</th><th scope="col">σg, вес Φ</th><th scope="col">простое среднее</th><th scope="col">отношение</th></tr></thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.g}>
                <td>{row.g}</td><td>{energy(row.lo)} – {energy(row.hi)}</td>
                <td>{((100 * row.flux) / totalFlux).toFixed(1)} %</td><td>{sci(row.weighted, 3)}</td><td>{sci(row.plain, 3)}</td>
                <td>{row.plain > 0 ? (row.weighted / row.plain).toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      controls={<>
        <Select label="Сечение" value={xs} onChange={(v) => setXs(v as CrossSectionId)} options={Object.entries(CROSS_SECTIONS).map(([value, c]) => ({ value, label: c.label }))} />
        <Select label="Спектр" value={spec} onChange={(v) => setSpec(v as SpectrumId)} options={Object.entries(SPECTRA).map(([value, s]) => ({ value, label: s.label }))} />
        <Segmented label="Число групп" value={structure} onChange={(v) => setStructure(v as Structure)} options={['1', '2', '5', '26']} />
        <Slider label="Температура газа T" min={293} max={900} step={1} value={T} unit="K" format={(v) => v.toFixed(0)} onChange={setT} />
      </>}
      caption="Рис. 6.1. Попробуйте «Резонансный захват ²³⁸U» и 5 групп: в группе 100 эВ – 10 кэВ взвешенное и простое средние отличаются в разы. Затем поменяйте спектр на «Быстрый реактор»: одногрупповое сечение того же ядра падает на порядки. Это и есть ответ на вопрос «$\Sigma_f = 0.1$ см⁻¹ — при каком спектре?». 5 групп — как в конспекте, 26 — система БНАБ."
    >
      <canvas ref={ref} role="img" aria-label={`Сечение и групповые средние, ${structure} групп; одногрупповое сечение ${sci(r.oneGroup, 3)} б`} style={{ display: 'block', width: '100%', height: '100%' }} />
    </LabFrame>
  );
}
