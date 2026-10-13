import { useEffect, useRef, useState } from 'react';
import {
  BoxGeometry, BufferGeometry, ConeGeometry, EdgesGeometry, Float32BufferAttribute, Group, LineSegments, Mesh, Points, Vector3,
} from 'three';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { mulberry32 } from '../../lib/rng';
import { LabScene, webglAvailable } from '../../lib/three';
import { emptyTally, slabHistory, tally, type Fate, type History, type SlabTally } from './freePath';

const W = 2.4; // ширина пластины в сцене, независимо от толщины в λ
const MAX_TRACKS = 160;

/**
 * Единственный источник смысла цветов: по этой таблице красятся треки в сцене
 * и рисуется легенда. Форма (пунктир, точка) дублирует цвет.
 */
export const FATES: readonly { fate: Fate; label: string; color: string; mark: NonNullable<LegendItem['mark']>; opacity: number }[] = [
  // Без столкновений — прямые вдоль пучка: пучок с сечением даёт видимый пучок параллельных линий.
  { fate: 'uncollided', label: 'прошли без столкновений', color: 'accent', mark: 'line', opacity: 1 },
  // accent и accent-strong в светлой теме почти не различимы — рассеянные рисуем чернилами, знак — ломаная.
  { fate: 'scattered', label: 'прошли после рассеяний', color: 'ink', mark: 'zigzag', opacity: 0.85 },
  { fate: 'reflected', label: 'отразились назад', color: 'signal', mark: 'dash', opacity: 1 },
  { fate: 'absorbed', label: 'поглотились', color: 'ink-muted', mark: 'dot', opacity: 0.6 },
];

/** Радиус сечения пучка в сцене. */
const BEAM_R = 0.3;

const fmt = (d: number) => (v: number) => v.toFixed(d);
const share = (k: number, n: number) => (n ? (k / n).toFixed(3) : '–');

/** Лаборатория 4.3: полное Монте-Карло пучка на пластину — свободный пробег, изотропное рассеяние, поглощение. */
export default function SlabMC3D() {
  const [X, setX] = useState(1.5);
  const [c, setC] = useState(0.8);
  const [t, setT] = useState<SlabTally>(emptyTally);
  const [hidden, setHidden] = useState<ReadonlySet<Fate>>(new Set());
  const [no3d, setNo3d] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const draw = useRef<() => void>(() => {});
  const layers = useRef<Partial<Record<Fate, Group>>>({});
  const tracks = useRef<History[]>([]);
  const rng = useRef(mulberry32(1957));
  const thick = useRef(X);
  thick.current = X;

  const run = (n: number, keep: boolean, from: SlabTally = t) => {
    let next = from;
    const k = W / thick.current;
    for (let i = 0; i < n; i++) {
      // Точка входа равномерно по кругу радиусом BEAM_R в единицах сцены (в λ — BEAM_R / k).
      const r = (BEAM_R / k) * Math.sqrt(rng.current());
      const a = 2 * Math.PI * rng.current();
      const h = slabHistory(thick.current, c, rng.current, keep, [r * Math.cos(a), r * Math.sin(a)]);
      next = tally(next, h.fate);
      if (keep) tracks.current.push(h);
    }
    tracks.current = tracks.current.slice(-MAX_TRACKS);
    setT(next);
  };

  // Сцена создаётся один раз; данные перерисовываются через draw.current.
  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const s = new LabScene(host.current, { camera: [3.4, 2.4, 5.4], minDistance: 3, maxDistance: 18 });
    lab.current = s;

    const slab = new Group();
    slab.add(
      new Mesh(new BoxGeometry(1, 2.6, 2.6), s.mesh('surface-1', { transparent: true, opacity: 0.35, depthWrite: false })),
      new LineSegments(new EdgesGeometry(new BoxGeometry(1, 2.6, 2.6)), s.line('rule-strong')),
    );
    slab.scale.x = W;
    s.scene.add(slab);

    // Падающий пучок: ось и контур сечения на входной грани.
    const beam = new LineSegments(
      new BufferGeometry().setFromPoints([new Vector3(-W / 2 - 1.6, 0, 0), new Vector3(-W / 2 - 0.12, 0, 0)]),
      s.line('ink'),
    );
    const ring: Vector3[] = [];
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * 2 * Math.PI, a1 = ((i + 1) / 48) * 2 * Math.PI;
      ring.push(new Vector3(-W / 2, BEAM_R * Math.cos(a0), BEAM_R * Math.sin(a0)), new Vector3(-W / 2, BEAM_R * Math.cos(a1), BEAM_R * Math.sin(a1)));
    }
    s.scene.add(new LineSegments(new BufferGeometry().setFromPoints(ring), s.line('ink')));
    const head = new Mesh(new ConeGeometry(0.06, 0.18, 16), s.mesh('ink'));
    head.rotation.z = -Math.PI / 2;
    head.position.set(-W / 2 - 0.1, 0, 0);
    s.scene.add(beam, head);

    // Слой на каждый исход: свой материал цвета из таблицы FATES.
    for (const f of FATES) {
      const g = new Group();
      const look = { transparent: f.opacity < 1, opacity: f.opacity };
      const material = f.mark === 'dash' ? s.dashed(f.color, look) : s.line(f.color, look);
      g.add(new LineSegments(new BufferGeometry(), material));
      if (f.mark === 'dot') g.add(new Points(new BufferGeometry(), s.points(f.color)));
      layers.current[f.fate] = g;
      s.scene.add(g);
    }

    draw.current = () => {
      const k = W / thick.current;
      // Ось x пучка — горизонталь сцены; поперечные координаты: y → z сцены, z → y сцены.
      const p = (q: [number, number, number]) => [q[0] * k - W / 2, q[2] * k, q[1] * k];
      for (const f of FATES) {
        const pos: number[] = [];
        const ends: number[] = [];
        for (const h of tracks.current) {
          if (h.fate !== f.fate) continue;
          for (let i = 1; i < h.path.length; i++) pos.push(...p(h.path[i - 1]!), ...p(h.path[i]!));
          ends.push(...p(h.path[h.path.length - 1]!));
        }
        const [lines, dots] = layers.current[f.fate]!.children as [LineSegments, Points?];
        lines.geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
        lines.geometry.computeBoundingSphere();
        if (f.mark === 'dash') lines.computeLineDistances();
        if (dots) {
          dots.geometry.setAttribute('position', new Float32BufferAttribute(ends, 3));
          dots.geometry.computeBoundingSphere();
        }
      }
      s.render();
    };
    draw.current();
    return () => { s.dispose(); lab.current = null; };
  }, []);

  // Новая геометрия или состав среды — начинаем заново с 300 треками.
  useEffect(() => {
    tracks.current = [];
    run(300, true, emptyTally());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [X, c]);

  useEffect(() => draw.current(), [t]);

  useEffect(() => {
    for (const f of FATES) {
      const g = layers.current[f.fate];
      if (g) g.visible = !hidden.has(f.fate);
    }
    lab.current?.render();
  }, [hidden]);

  const toggle = (fate: Fate) => setHidden((h) => {
    const next = new Set(h);
    if (next.has(fate)) next.delete(fate); else next.add(fate);
    return next;
  });

  return (
    <LabFrame
      n="4.3" kind="3D" title="Пучок на пластину"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={FATES.map((f) => ({
        label: f.label, color: f.color, mark: f.mark,
        value: share(t[f.fate], t.n),
        hidden: hidden.has(f.fate),
        onToggle: () => toggle(f.fate),
      }))}
      readout={[
        { label: 'без столкновений: МК / теория', value: `${share(t.uncollided, t.n)} / ${Math.exp(-X).toFixed(3)}` },
        { label: 'прошли всего', value: share(t.uncollided + t.scattered, t.n) },
        { label: 'историй', value: t.n.toLocaleString('ru-RU') },
      ]}
      controls={<>
        <Slider label="Толщина пластины" min={0.2} max={5} step={0.1} value={X} unit="λ" format={fmt(1)} onChange={setX} />
        <Slider tex="\Sigma_s/\Sigma_t" label="— доля рассеяния" min={0} max={0.99} step={0.01} value={c} format={fmt(2)} onChange={setC} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={() => run(300, true)}>+ 300 нейтронов</Button>
          <Button size="sm" onClick={() => run(20000, false)}>+ 20 000 без треков</Button>
        </div>
      </>}
      caption="Рис. 4.3. Последние 160 треков; что означает каждый вид линии — в легенде под сценой, рядом доля таких исходов. Нажмите на пункт легенды, чтобы скрыть или показать эти треки. Закон $e^{-\Sigma_t X}$ описывает только нейтроны без столкновений; детектор за пластиной видит и рассеянные, поэтому «прошли всего» больше. При $\Sigma_s/\Sigma_t = 0$ обе доли совпадают — чистый поглотитель. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl."
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Треки нейтронов в пластине толщиной ${X.toFixed(1)} λ; прошли без столкновений ${share(t.uncollided, t.n)}, всего ${share(t.uncollided + t.scattered, t.n)}`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Числа под рисунком считаются как обычно.</p>}
      </div>
    </LabFrame>
  );
}
