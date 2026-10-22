import { useState } from 'react';
import { LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, hline, text } from '../stats/draw';
import { MN14_MEV, MP_MEV, comptonEdge, neutralFromRecoils, photonForRecoil, transferMax } from './physics';

type Hyp = 'gamma' | 'neutron';

/** Одна таблица на кривые, уровни и легенду: водород — accent сплошной, азот — signal пунктир. */
const SERIES = {
  H: { label: 'отдача протона', color: 'accent', mark: 'line' },
  N: { label: 'отдача ядра азота', color: 'signal', mark: 'dash' },
  meas: { label: 'измеренные энергии отдачи', color: 'ink-muted', mark: 'dash' },
  hit: { label: 'нужная энергия излучения', color: 'ink', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const fmt1 = (v: number) => v.toFixed(1);
const fmt2 = (v: number) => v.toFixed(2);

/** Лаборатория 9.2: одно излучение — две мишени. γ-квант требует двух разных энергий, нейтрон — одной. */
export default function GammaLab() {
  const [hyp, setHyp] = useState<Hyp>('gamma');
  const [TH, setTH] = useState(5.7);
  const [TN, setTN] = useState(1.2);

  const EH = photonForRecoil(TH, MP_MEV);
  const EN = photonForRecoil(TN, MN14_MEV);
  const fit = neutralFromRecoils(TH, TN);
  const okFit = fit.m > 0 && Number.isFinite(fit.m);

  // Ось X — энергия излучения: для γ до 150 МэВ, для нейтрона до 15 МэВ. Ось Y — наибольшая энергия отдачи.
  const ref = useCanvas((g, w, h) => {
    const xmax = hyp === 'gamma' ? 150 : 15;
    const xt = niceTicks(0, xmax, 6), yt = niceTicks(0, 10, 5);
    const f = drawFrame(g, w, h,
      { min: 0, max: xmax, ticks: xt, format: tickFormat(xt), label: hyp === 'gamma' ? 'энергия γ-кванта, МэВ' : 'энергия нейтрона, МэВ' },
      { min: 0, max: 10, ticks: yt, format: tickFormat(yt), label: 'T отдачи, МэВ' });
    const curve = (fn: (E: number) => number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 300; i++) { const E = (xmax * i) / 300; pts.push([f.X(E), f.Y(fn(E))]); }
      return pts;
    };
    const m = okFit ? fit.m : 1;
    const fH = hyp === 'gamma' ? (E: number) => comptonEdge(E, MP_MEV) : (E: number) => transferMax(m, 1) * E;
    const fN = hyp === 'gamma' ? (E: number) => comptonEdge(E, MN14_MEV) : (E: number) => transferMax(m, 14) * E;
    f.clip(() => {
      // Подписи уровней — слева, справа их перекрыла бы подпись оси.
      hline(g, f, TH, token(SERIES.meas.color), undefined, [3, 4]);
      hline(g, f, TN, token(SERIES.meas.color), undefined, [3, 4]);
      text(g, `протон ${fmt1(TH)} МэВ`, f.left + 6, f.Y(TH) - 9, token('ink-muted'), 'left', 'middle', 600, 11);
      text(g, `азот ${fmt1(TN)} МэВ`, f.left + 6, f.Y(TN) - 9, token('ink-muted'), 'left', 'middle', 600, 11);
      strokeCurve(g, curve(fH), token(SERIES.H.color), 2.4);
      strokeCurve(g, curve(fN), token(SERIES.N.color), 2.4, [7, 5]);
      if (hyp === 'gamma') {
        markerLine(g, f, EH, `${EH.toFixed(0)} МэВ`, token(SERIES.H.color), 0);
        markerLine(g, f, EN, `${EN.toFixed(0)} МэВ`, token(SERIES.N.color), 1);
        dot(g, f.X(EH), f.Y(TH), 6, token(SERIES.hit.color));
        dot(g, f.X(EN), f.Y(TN), 6, token(SERIES.hit.color));
      } else if (okFit) {
        markerLine(g, f, fit.T, `${fit.T.toFixed(1)} МэВ`, token(SERIES.hit.color), 0);
        dot(g, f.X(fit.T), f.Y(TH), 6, token(SERIES.hit.color));
        dot(g, f.X(fit.T), f.Y(TN), 6, token(SERIES.hit.color));
      }
    });
  }, [hyp, TH, TN, EH, EN, fit.m, fit.T, okFit]);

  const gap = EN / EH;
  return (
    <LabFrame
      n="9.2" id="lab-gamma" title="Гамма или нейтрон?"
      legend={Object.values(SERIES)}
      readout={hyp === 'gamma' ? [
        { label: 'γ для протона', tex: 'E_\\gamma^{H}', value: EH.toFixed(1), unit: 'МэВ' },
        { label: 'γ для азота', tex: 'E_\\gamma^{N}', value: EN.toFixed(1), unit: 'МэВ' },
        { tex: 'E_\\gamma^{N}/E_\\gamma^{H}', value: fmt2(gap) },
      ] : [
        { tex: 'm', value: okFit ? fmt2(fit.m) : '–', unit: 'а.е.м.' },
        { tex: 'T_n', value: okFit ? fmt1(fit.T) : '–', unit: 'МэВ' },
        { label: 'азот при m = 1', value: fmt2(transferMax(1, 14) * TH), unit: 'МэВ' },
      ]}
      status={hyp === 'gamma'
        ? Math.abs(gap - 1) > 0.1
          ? { tone: 'bad', text: `Противоречие: чтобы так толкнуть протон, нужен квант ${EH.toFixed(0)} МэВ, а чтобы так толкнуть азот — ${EN.toFixed(0)} МэВ. Излучение одно, энергий две — гипотеза γ-квантов не работает.` }
          : { tone: 'warn', text: 'При таких отдачах энергии квантов почти совпали — но измерения Чедвика дают протон 5.7 МэВ и азот около 1.2 МэВ.' }
        : okFit
          ? { tone: Math.abs(fit.m - 1) < 0.5 ? 'ok' : 'warn', text: Math.abs(fit.m - 1) < 0.5
            ? `Одна частица массой ${fmt2(fit.m)} а.е.м. и энергией ${fmt1(fit.T)} МэВ объясняет обе отдачи: обе кривые пересекают свои уровни при одной энергии.`
            : `Масса ${fmt2(fit.m)} а.е.м. далека от протонной — такие отдачи нейтроном не объяснить.` }
          : { tone: 'bad', text: 'Решения нет: азот не может получить больше энергии, чем протон, от лёгкой частицы.' }}
      controls={<>
        <Segmented label="Гипотеза" value={hyp} onChange={(v) => setHyp(v as Hyp)} options={[{ value: 'gamma', label: 'γ-квант' }, { value: 'neutron', label: 'нейтрон' }]} />
        <Slider label="Отдача протона" tex="T_p" min={2} max={9} step={0.1} value={TH} unit="МэВ" format={fmt1} onChange={setTH} />
        <Slider label="Отдача азота" tex="T_N" min={0.3} max={2.5} step={0.05} value={TN} unit="МэВ" format={fmt2} onChange={setTN} />
      </>}
      caption="Рис. 9.2. Кривые — наибольшая энергия, которую излучение может передать протону и ядру азота. Для γ-кванта это комптоновский край $T = 2E^2/(Mc^2 + 2E)$, откуда $E = \tfrac12\left(T + \sqrt{T^2 + 2TMc^2}\right)$; для частицы массы $m$ — доля $4mM/(m + M)^2$ её энергии. Точки — где кривая достигает измеренной отдачи. По пробегам Чедвик оценил азот в 1.2 МэВ, по скорости $4.7\cdot10^8$ см/с выходит 1.6 МэВ: масса нейтрона получается 0.8–1.2 а.е.м., а γ-гипотеза при любом из этих чисел требует двух разных квантов."
    >
      <canvas ref={ref} role="img" aria-label={hyp === 'gamma' ? `γ-гипотеза: ${EH.toFixed(0)} и ${EN.toFixed(0)} МэВ` : `нейтронная гипотеза: m = ${okFit ? fmt2(fit.m) : '–'}`} />
    </LabFrame>
  );
}
