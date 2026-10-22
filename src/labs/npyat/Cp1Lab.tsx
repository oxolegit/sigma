import { useEffect, useId, useRef, useState } from 'react';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { parseAnswer } from '../../lib/answer';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, markerLine, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, hline, text } from '../stats/draw';
import { K_SCRAM, criticalRod, extrapolateCritical, kOfRod, period, plateau, stepCount } from './physics';

/** Ускорение времени: секунда на экране — 20 секунд реактора. */
const SPEED = 20;
/** Окно графика счёта, с реактора. */
const WINDOW = 600;
/** Уставка автоматической защиты: при таком счёте падает аварийный стержень. */
const TRIP = 1e5;
/** Счёт при полностью вставленном стержне — от него считается 1/M. */
const N0 = plateau(kOfRod(0));
/** Плато достигнуто: счёт отличается от равновесного меньше чем на 2 %. */
const PLATEAU_TOL = 0.02;
/** Сколько стержень должен простоять на месте, чтобы точка записалась, с реактора (1.5 с на экране). */
const SETTLE = 30;

const SERIES = {
  count: { label: 'скорость счёта', color: 'accent', mark: 'line' },
  trip: { label: 'уставка защиты', color: 'signal', mark: 'dash' },
  points: { label: '1/M на плато — блокнот Ферми', color: 'accent', mark: 'ball' },
  fit: { label: 'прямая по двум последним точкам', color: 'ink-muted', mark: 'dash' },
  mine: { label: 'ваш прогноз', color: 'signal', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

type Phase = 'sub' | 'crit' | 'super' | 'scram';

interface Sim { N: number; t: number; hist: [number, number][]; scram: boolean; trip: boolean }
const fresh = (): Sim => ({ N: N0, t: 0, hist: [[0, N0]], scram: false, trip: false });

const fmtP = (v: number) => v.toFixed(1);
const show = (N: number) => (N >= 1e4 ? `${(N / 1e3).toFixed(0)} тыс.` : N >= 100 ? N.toFixed(0) : N.toFixed(1));

/**
 * Лаборатория 19.1: пуск CP-1 — стержень выдвигают шагами, на каждом плато записывают 1/M
 * и по прямой предсказывают положение, при котором реактор станет критическим.
 */
export default function Cp1Lab() {
  const inputId = useId();
  const [p, setP] = useState(0);
  const [, setFrame] = useState(0);
  const [points, setPoints] = useState<[number, number][]>([[0, 1]]);
  const [guess, setGuess] = useState('');
  const [mine, setMine] = useState<number | null>(null);
  /** Итог первого входа в надкритику: с прогнозом или вслепую. */
  const [verdict, setVerdict] = useState<{ tone: 'ok' | 'warn' | 'bad'; text: string } | null>(null);
  const sim = useRef<Sim>(fresh());
  const rod = useRef(p);
  rod.current = p;
  /** Когда стержень последний раз двигали (время реактора): точку пишем, только если он постоял. */
  const moved = useRef(0);
  const crossed = useRef(false);
  const mineRef = useRef(mine);
  mineRef.current = mine;
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => { moved.current = sim.current.t; }, [p]);

  const k = sim.current.scram ? K_SCRAM : kOfRod(p);
  const pc = criticalRod();

  // Шаг модели — в каждом кадре, пока лаборатория на экране; перерисовка — 15 раз в секунду.
  useEffect(() => {
    let raf = 0, last = 0, acc = 0, visible = false;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      const s = sim.current;
      const kk = s.scram ? K_SCRAM : kOfRod(rod.current);
      const h = dt * SPEED;
      s.N = Math.max(stepCount(s.N, kk, h), 1e-3);
      s.t += h;
      s.hist.push([s.t, s.N]);
      while (s.hist.length > 2 && s.hist[0]![0] < s.t - WINDOW) s.hist.shift();
      if (!s.scram && s.N > TRIP) { s.scram = true; s.trip = true; }
      if (kk > 1 && !crossed.current) {
        crossed.current = true;
        const m = mineRef.current;
        const fermi = extrapolateCritical(pointsRef.current);
        setVerdict(m !== null
          ? Math.abs(m - pc) <= 1
            ? { tone: 'ok', text: `Прогноз ${fmtP(m)} % сбылся: критика на ${fmtP(pc)} %. Так Ферми и вёл пуск — каждый шаг стержня только после новой точки на графике.` }
            : { tone: 'warn', text: `Прогноз ${fmtP(m)} %, а критика на ${fmtP(pc)} %. Ближе к критике точки 1/M ложатся точнее — экстраполируйте по последним двум.` }
          : { tone: 'bad', text: `Вошли в надкритику без прогноза${fermi ? ` — хотя по точкам выходило ${fmtP(fermi)} %` : ''}. Ферми так не делал: сначала точка на графике, потом шаг.` });
      }
      // Плато: подкритика, счёт у равновесного значения — точка в блокнот (одна на положение).
      if (!s.scram && kk < 1) {
        const eq = plateau(kk);
        if (Math.abs(s.N / eq - 1) < PLATEAU_TOL && s.t - moved.current > SETTLE) {
          const pos = rod.current;
          const list = pointsRef.current;
          if (!list.some(([x]) => x === pos)) {
            const next = [...list, [pos, N0 / s.N] as [number, number]].sort((a, b) => a[0] - b[0]);
            pointsRef.current = next;
            setPoints(next);
          }
        }
      }
      acc += dt;
      if (acc > 1 / 15) { acc = 0; setFrame((f) => f + 1); }
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      else if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [pc]);

  const s = sim.current;
  const fermi = extrapolateCritical(points);
  const phase: Phase = s.scram ? 'scram' : Math.abs(k - 1) < 2e-4 ? 'crit' : k > 1 ? 'super' : 'sub';
  const eq = plateau(k);
  const onPlateau = phase === 'sub' && Math.abs(s.N / eq - 1) < PLATEAU_TOL;

  const ref = useCanvas((g, w, h) => {
    const half = h * 0.5;
    // Верх: счёт от времени, логарифмическая шкала.
    const t1 = Math.max(WINDOW, s.t), t0 = t1 - WINDOW;
    const yt = decadeTicks(1, 1e6, 7), xt = niceTicks(t0, t1, 5);
    const f = drawFrame(g, w, half, { min: t0, max: t1, ticks: xt, format: tickFormat(xt), label: 't, с' }, { min: 1, max: 1e6, ticks: yt, format: decadeLabel, label: 'счёт, имп/с', log: true }, { l: 44, r: 16, t: 26, b: 30 });
    f.clip(() => {
      hline(g, f, TRIP, token(SERIES.trip.color), 'уставка защиты', [6, 5]);
      strokeCurve(g, s.hist.map(([t, N]) => [f.X(t), f.Y(Math.max(N, 1))]), token(SERIES.count.color), 2.2);
    });
    // Низ: блокнот Ферми — 1/M от положения стержня.
    g.save();
    g.translate(0, half);
    const xt2 = niceTicks(0, 100, 5), yt2 = niceTicks(0, 1, 5);
    const b = drawFrame(g, w, h - half, { min: -3, max: 105, ticks: xt2, format: (v) => `${v} %`, label: 'выдвижение стержня' }, { min: 0, max: 1.05, ticks: yt2, format: tickFormat(yt2), label: '1/M' }, { l: 44, r: 16, t: 26, b: 30 });
    b.clip(() => {
      if (fermi !== null && points.length >= 2) {
        const [x1, y1] = points[points.length - 2]!;
        g.save(); g.strokeStyle = token(SERIES.fit.color); g.lineWidth = 1.5; g.setLineDash([6, 5]);
        g.beginPath(); g.moveTo(b.X(x1), b.Y(y1)); g.lineTo(b.X(fermi), b.Y(0)); g.stroke(); g.restore();
        text(g, `≈ ${fmtP(fermi)} %`, b.X(Math.min(fermi, 100)) - 6, b.Y(0) - 12, token('ink'), 'right');
      }
      if (mine !== null) markerLine(g, b, mine, 'прогноз', token(SERIES.mine.color));
      for (const [x, y] of points) dot(g, b.X(x), b.Y(y), 5, token(SERIES.points.color));
      // Где стержень сейчас.
      g.save(); g.strokeStyle = token('ink-muted'); g.setLineDash([2, 4]);
      g.beginPath(); g.moveTo(b.X(p), b.top); g.lineTo(b.X(p), b.top + b.height); g.stroke(); g.restore();
    });
    g.restore();
  }, [s.t, s.N, points, fermi, mine, p]);

  const status: { tone: 'ok' | 'warn' | 'bad'; text: string } = phase === 'scram'
    ? { tone: 'bad', text: s.trip ? 'Заглушен: счёт дошёл до уставки, и автоматическая защита сбросила стержень — как в 11:30 2 декабря, когда уставку поставили слишком низко.' : 'Заглушен: аварийный стержень ZIP сброшен, k = 0.90 — счёт падает. «Заново» — вернуть стержни.' }
    : verdict && phase === 'super' ? verdict
    : phase === 'super' ? { tone: 'warn', text: `Надкритика: k = ${k.toFixed(4)}, счёт растёт экспоненциально с периодом ${period(k).toFixed(0)} с. Источник больше не нужен — цепная реакция поддерживает себя сама.` }
    : phase === 'crit' ? { tone: 'warn', text: 'Критика: каждое поколение равно предыдущему, а источник добавляет нейтроны — счёт растёт линейно и не выходит на плато.' }
    : onPlateau ? { tone: 'ok', text: `Подкритика, счёт вышел на плато ${show(eq)} имп/с — точка ${fmtP(p)} % записана. Выдвиньте стержень дальше, но не за прогноз.` }
    : { tone: 'ok', text: `Подкритика: k = ${k.toFixed(4)}. Счёт идёт к плато $S\\ell/(1 - k)$ = ${show(eq)} имп/с — ждём, ближе к критике дольше.` };

  const reset = () => {
    sim.current = fresh();
    crossed.current = false;
    setP(0);
    setPoints([[0, 1]]);
    setVerdict(null);
    setMine(null);
    setGuess('');
  };
  const record = () => {
    const v = parseAnswer(guess.replace('%', ''));
    if (Number.isFinite(v) && v > 0 && v <= 100) setMine(v);
  };

  return (
    <LabFrame
      n="19.1" id="lab-cp1" title="Пуск CP-1" stage="tall"
      legend={Object.values(SERIES)}
      actions={<>
        <Button variant="primary" size="sm" onClick={() => { sim.current.scram = true; setFrame((f) => f + 1); }} disabled={s.scram}>ZIP</Button>
        <Button variant="ghost" size="sm" onClick={reset}>Заново</Button>
      </>}
      readout={[
        { tex: 'k_{\\text{эф}}', value: k.toFixed(4) },
        { label: 'счёт', value: show(s.N), unit: 'имп/с' },
        { label: 'прогноз по 1/M', value: fermi !== null ? fmtP(fermi) : '–', unit: fermi !== null ? '%' : undefined },
        { label: 'время', value: `${Math.floor(s.t / 60)}:${String(Math.floor(s.t % 60)).padStart(2, '0')}` },
      ]}
      status={status}
      controls={<>
        <Slider label="Выдвижение регулирующего стержня" min={0} max={100} step={0.5} value={p} unit="%" format={fmtP} onChange={setP} />
        <form className="sg-lab-text" onSubmit={(e) => { e.preventDefault(); record(); }}>
          <label htmlFor={inputId}>Мой прогноз критического положения, %{mine !== null && <small> — записан {fmtP(mine)} %</small>}</label>
          <input id={inputId} type="text" inputMode="decimal" autoComplete="off" placeholder="например, 97" value={guess} onChange={(e) => setGuess(e.target.value)} disabled={crossed.current} />
          <div className="sg-lab-buttons">
            <Button size="sm" type="submit" disabled={!guess.trim() || crossed.current}>Записать прогноз</Button>
          </div>
        </form>
      </>}
      caption="Рис. 19.1. Модель: $k_{\text{эф}} = 0.960 + 0.0406\,(p/100)^{1.6}$, кинетика $dN/dt = \frac{k - 1}{\ell}N + S$ с $\ell = 0.1$ с и источником $S = 2$; время ускорено в 20 раз. Вверху — счёт, внизу — блокнот Ферми: на каждом плато точка $1/M = N_0/N$, где $N_0$ — счёт при вставленном стержне. В подкритике $N = S\ell/(1 - k)$, поэтому $1/M \propto 1 - k$ и обращается в ноль в критике. Ведите стержень шагами, ждите плато, запишите прогноз — и только потом входите в критику."
    >
      <canvas ref={ref} role="img" aria-label={`Счёт ${show(s.N)} имп/с, k = ${k.toFixed(4)}, точек 1/M: ${points.length}`} />
    </LabFrame>
  );
}
