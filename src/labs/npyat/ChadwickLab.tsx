import { useState } from 'react';
import { LabFrame, Rich, Segmented, Slider, TeX, type LegendItem } from '../../components';
import { parseAnswer } from '../../lib/answer';
import { useCanvas } from '../../lib/canvas';
import { drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, hband, hline, text } from '../stats/draw';
import { energyFromSpeed, massFromRatio, recoilRatio, speedFromRecoil } from './physics';

/** Измеренное отношение скоростей отдачи и допуск полосы. */
const MEASURED = 7.0;
const TOL = 0.05;
const M_MIN = 0.1, M_MAX = 5;

const SERIES = {
  curve: { label: 'отношение отдач (m + 14)/(m + 1)', color: 'accent', mark: 'line' },
  meas: { label: 'измерено 7.0 ± 5 %', color: 'signal', mark: 'dash' },
  now: { label: 'выбранная масса', color: 'accent', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const fmt2 = (v: number) => v.toFixed(2);
/** 3.3e9 → «3.3\cdot10^{9}» — число для TeX с тремя значащими цифрами. */
const texSci = (v: number) => {
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 4) return String(Number(v.toPrecision(3)));
  return `${Number((v / 10 ** e).toPrecision(3))}\\cdot10^{${e}}`;
};

/** Решение по шагам для измеренных скоростей. null — если данные не дают массы (u_H ≤ u_N или отношение ≥ 14). */
function solve(uH: number, uN: number) {
  if (!(uH > 0 && uN > 0)) return null;
  const r = uH / uN;
  const m = massFromRatio(r);
  if (!(m > 0) || !Number.isFinite(m)) return { r, m: NaN, steps: [] as { note: string; tex: string }[] };
  const v = speedFromRecoil(uH, m);
  const T = energyFromSpeed(m, v);
  const steps = [
    { note: 'Лобовой удар — ядро уходит с наибольшей скоростью. Для водорода и азота:', tex: 'u_H = \\frac{2mv}{m + 1},\\qquad u_N = \\frac{2mv}{m + 14}' },
    { note: 'Скорость частицы $v$ неизвестна, но в отношении она сокращается:', tex: `\\frac{u_H}{u_N} = \\frac{m + 14}{m + 1} = \\frac{${texSci(uH)}}{${texSci(uN)}} = ${r.toFixed(2)}` },
    { note: 'Линейное уравнение относительно $m$:', tex: `m = \\frac{14 - ${r.toFixed(2)}}{${r.toFixed(2)} - 1} = ${m.toFixed(2)}\\ \\text{а.е.м.}` },
    { note: 'Заодно скорость и энергия частицы:', tex: `v = \\frac{u_H(m + 1)}{2m} = ${texSci(v)}\\ \\text{см/с},\\qquad T = \\frac{mv^2}{2} \\approx ${T.toFixed(1)}\\ \\text{МэВ}` },
  ];
  return { r, m, steps };
}

/** Лаборатория 9.1: масса нейтральной частицы по отдаче водорода и азота — опыт Чедвика. */
export default function ChadwickLab() {
  const [mode, setMode] = useState<'fit' | 'data'>('fit');
  const [m, setM] = useState(3);
  const [uH, setUH] = useState('3.3e9');
  const [uN, setUN] = useState('4.7e8');

  const sol = mode === 'data' ? solve(parseAnswer(uH), parseAnswer(uN)) : null;
  const mShown = mode === 'fit' ? m : sol && Number.isFinite(sol.m) ? sol.m : NaN;
  const rShown = mode === 'fit' ? recoilRatio(m) : sol?.r ?? NaN;
  const inBand = Math.abs(recoilRatio(m) / MEASURED - 1) <= TOL;

  const ref = useCanvas((g, w, h) => {
    const xt = niceTicks(0, M_MAX, 5), yt = niceTicks(0, 14, 7);
    const f = drawFrame(g, w, h, { min: 0, max: M_MAX, ticks: xt, format: tickFormat(xt), label: 'm, а.е.м.' }, { min: 0, max: 14, ticks: yt, format: tickFormat(yt), label: 'uH / uN' });
    const meas = mode === 'fit' ? MEASURED : rShown;
    f.clip(() => {
      if (Number.isFinite(meas)) {
        hband(g, f, meas * (1 - TOL), meas * (1 + TOL), token(SERIES.meas.color), 0.16);
        hline(g, f, meas, token(SERIES.meas.color), mode === 'fit' ? 'измерено 7.0' : `измерено ${meas.toFixed(2)}`, [6, 5]);
      }
      const pts: [number, number][] = [];
      for (let i = 0; i <= 300; i++) { const x = M_MIN + ((M_MAX - M_MIN) * i) / 300; pts.push([f.X(x), f.Y(recoilRatio(x))]); }
      strokeCurve(g, pts, token(SERIES.curve.color), 2.4);
      if (Number.isFinite(mShown) && mShown <= M_MAX) {
        g.save(); g.strokeStyle = token('ink-muted'); g.setLineDash([3, 4]);
        g.beginPath(); g.moveTo(f.X(mShown), f.Y(0)); g.lineTo(f.X(mShown), f.Y(recoilRatio(mShown))); g.stroke(); g.restore();
        dot(g, f.X(mShown), f.Y(recoilRatio(mShown)), 7, token(SERIES.now.color));
        text(g, `m = ${mShown.toFixed(2)}`, f.X(mShown) + 10, f.Y(recoilRatio(mShown)) - 14, token('ink'));
      }
    });
  }, [mode, mShown, rShown]);

  const status: { tone: 'ok' | 'warn' | 'bad'; text: string } = mode === 'fit'
    ? inBand
      ? { tone: 'ok', text: `Это нейтрон: частица массой ${m.toFixed(2)} а.е.м. — почти как протон — даёт измеренное отношение. Чедвик получил 1.15 и оценил точность в 10 %.` }
      : { tone: 'warn', text: recoilRatio(m) > MEASURED * (1 + TOL)
        ? 'Отношение больше измеренного: такая лёгкая частица разгоняет водород намного сильнее азота. Увеличьте массу.'
        : 'Отношение меньше измеренного: тяжёлая частица разгоняет оба ядра почти одинаково. Уменьшите массу.' }
    : !sol
      ? { tone: 'bad', text: 'Не получилось прочитать скорости. Запись: 3.3e9, 3,3·10^9.' }
      : !Number.isFinite(sol.m)
        ? { tone: 'bad', text: 'Решения нет: при положительной массе отношение $u_H/u_N$ лежит между 1 и 14.' }
        : { tone: Math.abs(sol.m - 1) < 0.3 ? 'ok' : 'warn', text: Math.abs(sol.m - 1) < 0.3
          ? `$m = ${sol.m.toFixed(2)}$ а.е.м. — масса порядка протонной, а заряда у частицы нет: это нейтрон.`
          : `$m = ${sol.m.toFixed(2)}$ а.е.м. — с массой протона не сходится. Проверьте порядок скоростей.` };

  return (
    <LabFrame
      n="9.1" id="lab-chadwick" title="Взвесь невидимую частицу"
      legend={Object.values(SERIES)}
      readout={[
        { tex: 'm', value: Number.isFinite(mShown) ? fmt2(mShown) : '–', unit: 'а.е.м.' },
        { tex: '\\frac{m + 14}{m + 1}', value: Number.isFinite(rShown) ? fmt2(rShown) : '–' },
        { label: 'до измеренного 7.0', value: mode === 'fit' ? `${((recoilRatio(m) / MEASURED - 1) * 100).toFixed(1)} %` : '–' },
      ]}
      status={status}
      controls={<>
        <Segmented label="Режим" value={mode} onChange={(v) => setMode(v as 'fit' | 'data')} options={[{ value: 'fit', label: 'подобрать m' }, { value: 'data', label: 'по данным' }]} />
        {mode === 'fit'
          ? <Slider label="Масса частицы m" min={M_MIN} max={M_MAX} step={0.01} value={m} unit="а.е.м." format={fmt2} onChange={setM} />
          : <>
              <label className="sg-lab-text">
                <span>Скорость протонов отдачи <TeX tex="u_H" />, см/с</span>
                <input type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={uH} onChange={(e) => setUH(e.target.value)} />
              </label>
              <label className="sg-lab-text">
                <span>Скорость ядер азота отдачи <TeX tex="u_N" />, см/с</span>
                <input type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={uN} onChange={(e) => setUN(e.target.value)} />
              </label>
            </>}
      </>}
      table={mode === 'data' && sol && sol.steps.length > 0 ? (
        <ol className="rz-steps-list">
          {sol.steps.map((s, i) => (
            <li key={i} className="rz-step">
              <span className="rz-step-n">{i + 1}</span>
              <div className="rz-step-body">
                <p className="rz-step-note"><Rich>{s.note}</Rich></p>
                <TeX tex={s.tex} block />
              </div>
            </li>
          ))}
        </ol>
      ) : undefined}
      caption="Рис. 9.1. Неизвестная частица массы $m$ ударяет лобово ядро массы $M$ и сообщает ему скорость $u = 2mv/(m + M)$. Скорость $v$ никто не измерял, но в отношении отдач водорода и азота она сокращается — остаётся функция одной массы. В режиме «по данным» введите скорости Чедвика ($3.3\cdot10^9$ и $4.7\cdot10^8$ см/с) или свои."
    >
      <canvas ref={ref} role="img" aria-label={`Кривая отношения скоростей отдачи от массы; m = ${Number.isFinite(mShown) ? mShown.toFixed(2) : 'нет решения'}`} />
    </LabFrame>
  );
}
