import { useEffect, useRef, useState } from 'react';
import {
  BoxGeometry, BufferGeometry, ConeGeometry, EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh,
  Points, PointsMaterial, Vector3,
} from 'three';
import { Button, LabFrame, Slider } from '../../components';
import { mulberry32 } from '../../lib/rng';
import { LabScene, webglAvailable } from '../../lib/three';
import { emptyTally, slabHistory, tally, type Fate, type History, type SlabTally } from './freePath';

const W = 2.4; // ширина пластины в сцене, независимо от толщины в λ
const MAX_TRACKS = 160;
const FATE_TOKEN: Record<Fate, string> = {
  uncollided: 'accent', scattered: 'accent-strong', reflected: 'signal', absorbed: 'ink-muted',
};
const fmt = (d: number) => (v: number) => v.toFixed(d);
const share = (k: number, n: number) => (n ? (k / n).toFixed(3) : '–');

/** Лаборатория 4.3: полное Монте-Карло пучка на пластину — свободный пробег, изотропное рассеяние, поглощение. */
export default function SlabMC3D() {
  const [X, setX] = useState(1.5);
  const [c, setC] = useState(0.8);
  const [t, setT] = useState<SlabTally>(emptyTally);
  const [no3d, setNo3d] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const draw = useRef<() => void>(() => {});
  const tracks = useRef<History[]>([]);
  const rng = useRef(mulberry32(1957));
  const thick = useRef(X);
  thick.current = X;

  const run = (n: number, keep: boolean) => {
    let next = t;
    for (let i = 0; i < n; i++) {
      const h = slabHistory(X, c, rng.current, keep);
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
    const face = new Mesh(new BoxGeometry(1, 2.6, 2.6), s.mesh('surface-1', { transparent: true, opacity: 0.35, depthWrite: false }));
    const edges = new LineSegments(new EdgesGeometry(new BoxGeometry(1, 2.6, 2.6)), s.line('rule-strong'));
    slab.add(face, edges);
    slab.scale.x = W;
    s.scene.add(slab);

    const beamGeo = new BufferGeometry().setFromPoints([new Vector3(-W / 2 - 1.6, 0, 0), new Vector3(-W / 2 - 0.12, 0, 0)]);
    const beam = new LineSegments(beamGeo, s.line('ink'));
    const head = new Mesh(new ConeGeometry(0.06, 0.18, 16), s.mesh('ink'));
    head.rotation.z = -Math.PI / 2;
    head.position.set(-W / 2 - 0.1, 0, 0);
    s.scene.add(beam, head);

    // Цвет треков — в вершинах (по исходу), поэтому базовый цвет материала белый: вершинный цвет умножается на него.
    const lines = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
    const ends = new Points(new BufferGeometry(), new PointsMaterial({ size: 0.07 }));
    s.scene.add(lines, ends);

    draw.current = () => {
      const k = W / thick.current;
      const pos: number[] = [];
      const col: number[] = [];
      const dots: number[] = [];
      for (const { fate, path } of tracks.current) {
        const cc = s.color(FATE_TOKEN[fate]);
        // Ось x пучка — горизонталь сцены, поперечные координаты: y → z сцены, z → y сцены.
        const p = (q: [number, number, number]) => [q[0] * k - W / 2, q[2] * k, q[1] * k];
        for (let i = 1; i < path.length; i++) {
          pos.push(...p(path[i - 1]!), ...p(path[i]!));
          col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
        }
        if (fate === 'absorbed') dots.push(...p(path[path.length - 1]!));
      }
      lines.geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
      lines.geometry.setAttribute('color', new Float32BufferAttribute(col, 3));
      lines.geometry.computeBoundingSphere();
      ends.geometry.setAttribute('position', new Float32BufferAttribute(dots, 3));
      ends.geometry.computeBoundingSphere();
      (ends.material as PointsMaterial).color.copy(s.color('ink'));
      s.render();
    };
    s.onRecolor(() => draw.current());
    draw.current();
    return () => { s.dispose(); lab.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Новая геометрия или состав среды — начинаем заново с 300 треками.
  useEffect(() => {
    tracks.current = [];
    const rngNow = rng.current;
    let next = emptyTally();
    for (let i = 0; i < 300; i++) {
      const h = slabHistory(X, c, rngNow, true);
      next = tally(next, h.fate);
      tracks.current.push(h);
    }
    tracks.current = tracks.current.slice(-MAX_TRACKS);
    setT(next);
  }, [X, c]);

  useEffect(() => draw.current(), [t]);

  return (
    <LabFrame
      n="4.3" kind="3D" title="Пучок на пластину"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      readout={[
        { label: 'без столкновений: МК / теория', value: `${share(t.uncollided, t.n)} / ${Math.exp(-X).toFixed(3)}` },
        { label: 'прошли всего', value: share(t.uncollided + t.scattered, t.n) },
        { label: 'отразились', value: share(t.reflected, t.n) },
        { label: 'поглотились', value: share(t.absorbed, t.n) },
      ]}
      controls={<>
        <Slider label="Толщина пластины" min={0.2} max={5} step={0.1} value={X} unit="λ" format={fmt(1)} onChange={setX} />
        <Slider tex="\Sigma_s/\Sigma_t" label="— доля рассеяния" min={0} max={0.99} step={0.01} value={c} format={fmt(2)} onChange={setC} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={() => run(300, true)}>+ 300 нейтронов</Button>
          <Button size="sm" onClick={() => run(20000, false)}>+ 20 000 без треков</Button>
          <span className="sg-lab-count">историй: {t.n.toLocaleString('ru-RU')}</span>
        </div>
      </>}
      caption="Рис. 4.3. Последние 160 треков: мандариновые прошли без столкновений, тёмно-мандариновые — после рассеяний, фиолетовые отразились назад, серые поглотились (точка — место поглощения). Закон $e^{-\Sigma_t X}$ описывает только нейтроны без столкновений; детектор за пластиной видит и рассеянные, поэтому «прошли всего» больше. При $\Sigma_s/\Sigma_t = 0$ обе доли совпадают — чистый поглотитель. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl."
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Треки нейтронов в пластине толщиной ${X.toFixed(1)} λ; прошли без столкновений ${share(t.uncollided, t.n)}, всего ${share(t.uncollided + t.scattered, t.n)}`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Числа под рисунком считаются как обычно.</p>}
      </div>
    </LabFrame>
  );
}
