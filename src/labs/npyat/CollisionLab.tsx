import { useEffect, useRef, useState } from 'react';
import { Button, LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { arrow, drawFrame, niceTicks, strokeCurve, tickFormat } from '../../lib/plot';
import { token } from '../../lib/theme';
import { dot, text } from '../stats/draw';
import { TARGETS, collide, collisionsToSlow, transferAtAngle, transferMax, xi, type TargetId } from './physics';

const IDS = Object.keys(TARGETS) as TargetId[];
const OPTIONS = IDS.map((id) => ({ value: id, label: TARGETS[id].label }));

const SERIES = {
  neutron: { label: 'нейтрон', color: 'accent', mark: 'ball' },
  nucleus: { label: 'ядро отдачи', color: 'signal', mark: 'ball' },
  path: { label: 'пути до и после удара', color: 'ink-muted', mark: 'dash' },
  curve: { label: 'доля энергии от угла отдачи — выбранное ядро', color: 'accent', mark: 'line' },
  others: { label: 'другие ядра', color: 'rule-strong', mark: 'line' },
  now: { label: 'этот удар', color: 'signal', mark: 'dot' },
} as const satisfies Record<string, LegendItem>;

/** Радиус шара в сцене: нейтрон 1, ядро ∝ A^(1/3) — свинец в шесть раз больше. */
const radius = (A: number) => Math.cbrt(A);
/** Длительность анимации, с: подлёт и разлёт. */
const DURATION = 3.2;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const deg = (r: number) => (r * 180) / Math.PI;

/** Лаборатория 9.3: упругий удар нейтрона по ядру — сколько энергии уходит ядру при разных массах и прицельных параметрах. */
export default function CollisionLab() {
  const [id, setId] = useState<TargetId>('H');
  const [s, setS] = useState(0.35);
  const [t, setT] = useState(1);
  const [run, setRun] = useState(0);
  const raf = useRef(0);

  const A = TARGETS[id].A;
  const c = collide(1, A, s);
  const D = 1 + radius(A);

  // Анимация: t от 0 до 1 за DURATION секунд; без движения — сразу итоговый кадр.
  useEffect(() => {
    if (reducedMotion()) { setT(1); return; }
    let start = 0;
    const loop = (now: number) => {
      if (!start) start = now;
      const k = Math.min(1, (now - start) / 1000 / DURATION);
      setT(k);
      if (k < 1) raf.current = requestAnimationFrame(loop);
    };
    setT(0);
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [id, s, run]);

  const ref = useCanvas((g, w, h) => {
    // Верх — стол, низ — график доли энергии.
    const top = h * 0.56;
    const L = D + 6; // путь до удара
    const scale = Math.min(w / (2 * L + 2), top / (2 * D + 6));
    const ox = w * 0.5, oy = top * 0.5;
    const X = (x: number) => ox + x * scale, Y = (y: number) => oy - y * scale;

    // Время в единицах пути: до контакта нейтрон проходит L − √(D² − b²), после — ещё L.
    const b = s * D;
    const xc = -Math.sqrt(D * D - b * b);
    const t1 = xc + L, total = t1 + L;
    const tau = t * total;
    const nPos: [number, number] = tau < t1 ? [-L + tau, b] : [xc + c.neutron[0] * (tau - t1), b + c.neutron[1] * (tau - t1)];
    const kPos: [number, number] = tau < t1 ? [0, 0] : [c.nucleus[0] * (tau - t1), c.nucleus[1] * (tau - t1)];
    const after = Math.max(0, tau - t1);

    g.save();
    g.strokeStyle = token(SERIES.path.color);
    g.lineWidth = 1.5;
    g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(X(-L), Y(b)); g.lineTo(X(xc), Y(b)); g.stroke();
    g.beginPath(); g.moveTo(X(xc), Y(b)); g.lineTo(X(xc + c.neutron[0] * L), Y(b + c.neutron[1] * L)); g.stroke();
    g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(c.nucleus[0] * L), Y(c.nucleus[1] * L)); g.stroke();
    g.restore();
    // Прицельный параметр — скобка слева.
    if (b > 0.05) {
      g.save(); g.strokeStyle = token('ink-muted'); g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(-L + 0.6), Y(0)); g.lineTo(X(-L + 0.6), Y(b)); g.stroke(); g.restore();
      text(g, 'b', X(-L + 0.6) + 6, Y(b / 2), token('ink-muted'));
    }
    g.save(); g.strokeStyle = token('rule'); g.setLineDash([2, 4]);
    g.beginPath(); g.moveTo(X(-L), Y(0)); g.lineTo(X(L), Y(0)); g.stroke(); g.restore();

    dot(g, X(kPos[0]), Y(kPos[1]), radius(A) * scale, token(SERIES.nucleus.color));
    dot(g, X(nPos[0]), Y(nPos[1]), scale, token(SERIES.neutron.color));
    // Скорости после удара — стрелки длиной ∝ скорости.
    if (after > 0) {
      const v = 2.2;
      if (Math.hypot(...c.neutron) > 0.02) arrow(g, X(nPos[0]), Y(nPos[1]), X(nPos[0] + c.neutron[0] * v), Y(nPos[1] + c.neutron[1] * v), token(SERIES.neutron.color), 2);
      if (Math.hypot(...c.nucleus) > 0.02) arrow(g, X(kPos[0]), Y(kPos[1]), X(kPos[0] + c.nucleus[0] * v), Y(kPos[1] + c.nucleus[1] * v), token(SERIES.nucleus.color), 2);
    }

    // График: доля энергии ядру от угла отдачи φ.
    g.save();
    g.translate(0, top);
    const xt = [0, 15, 30, 45, 60, 75, 90], yt = niceTicks(0, 1, 5);
    const f = drawFrame(g, w, h - top, { min: 0, max: 90, ticks: xt, format: (v) => `${v}°`, label: 'угол отдачи ядра φ' }, { min: 0, max: 1, ticks: yt, format: tickFormat(yt), label: 'доля энергии' }, { l: 44, r: 16, t: 26, b: 30 });
    const curve = (M: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 90; i++) pts.push([f.X(i), f.Y(transferAtAngle(1, M, (i * Math.PI) / 180))]);
      return pts;
    };
    f.clip(() => {
      // Подписи соседних кривых (C и N почти совпадают) — со сдвигом по углу, вдоль самих кривых.
      IDS.forEach((o, i) => {
        if (o === id) return;
        const M = TARGETS[o].A, at = 4 + 9 * i;
        strokeCurve(g, curve(M), token(SERIES.others.color), 1.2);
        text(g, o, f.X(at), f.Y(transferAtAngle(1, M, (at * Math.PI) / 180)) - 9, token('ink-muted'), 'center', 'middle', 600, 11);
      });
      strokeCurve(g, curve(A), token(SERIES.curve.color), 2.4);
      dot(g, f.X(deg(c.phi)), f.Y(c.fraction), 6, token(SERIES.now.color));
    });
    g.restore();
  }, [id, s, t, A, D, c.fraction]);

  const thermal = collisionsToSlow(A);
  return (
    <LabFrame
      n="9.3" id="lab-collision" title="Бильярд ядер" stage="tall"
      legend={Object.values(SERIES)}
      actions={<Button variant="ghost" size="sm" onClick={() => setRun((r) => r + 1)}>Ударить снова</Button>}
      readout={[
        { tex: '\\frac{4mM}{(m + M)^2}', value: transferMax(1, A).toFixed(3) },
        { label: 'этот удар', value: `${(c.fraction * 100).toFixed(1)} %` },
        { label: 'нейтрон отклонился на', value: `${deg(Math.abs(c.psi)).toFixed(0)}°` },
        { label: 'ударов до тепловой', tex: '\\ln(E_0/E)/\\xi', value: thermal < 100 ? thermal.toFixed(0) : String(Math.round(thermal / 10) * 10) },
      ]}
      status={A <= 2
        ? { tone: 'ok', text: `Ядро почти такое же лёгкое, как нейтрон: в лобовом ударе ${A === 1 ? 'отдаётся вся энергия' : 'уходит 89 % энергии'}. Водородсодержащие вещества — вода, парафин — лучшие замедлители: до тепловой энергии около ${thermal.toFixed(0)} ударов.` }
        : A < 20
          ? { tone: 'ok', text: `Углерод и азот забирают не больше ${(transferMax(1, A) * 100).toFixed(0)} % за удар, ξ = ${xi(A).toFixed(3)}: до тепловой энергии ~${thermal.toFixed(0)} ударов. Медленнее воды, но графит почти не поглощает нейтроны — поэтому им замедляли в CP-1.` }
          : { tone: 'warn', text: `Свинец забирает меньше 2 % даже в лобовом ударе: нейтрон отскакивает, почти не теряя энергии. Замедлителем тяжёлое ядро быть не может — нужно ~${Math.round(thermal / 100) * 100} ударов.` }}
      controls={<>
        <Select label="Ядро-мишень" value={id} onChange={(v) => setId(v as TargetId)} options={OPTIONS} />
        <Slider label="Прицельный параметр b/(r + R)" min={0} max={0.98} step={0.01} value={s} format={(v) => v.toFixed(2)} onChange={setS} />
      </>}
      caption="Рис. 9.3. Упругий удар шаров: ядро уходит вдоль линии центров под углом $\varphi$, $\sin\varphi = b/(r + R)$, и уносит долю энергии $\frac{4mM}{(m + M)^2}\cos^2\varphi$. Внизу — эта доля для выбранного ядра и для остальных; при $b = 0$ — лобовой удар и максимум. Число ударов до тепловой энергии — от 2 МэВ до 0.025 эВ, через средний логарифмический декремент $\xi$."
    >
      <canvas ref={ref} role="img" aria-label={`${TARGETS[id].label}: ядру передано ${(c.fraction * 100).toFixed(1)} % энергии, угол отдачи ${deg(c.phi).toFixed(0)}°`} />
    </LabFrame>
  );
}
