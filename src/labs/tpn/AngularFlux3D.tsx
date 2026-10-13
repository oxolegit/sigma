import { useEffect, useRef, useState } from 'react';
import {
  BufferGeometry, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, LineSegments, Mesh, MeshStandardMaterial,
  SphereGeometry, TorusGeometry, Vector3, type BufferAttribute,
} from 'three';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { LabScene, webglAvailable } from '../../lib/three';
import { direction, dot, oneSided } from './field';

/** Части сцены: по этой таблице красятся объекты и строится легенда. */
const PARTS = {
  plus: { label: 'направления с (Ω·n) > 0 — дают i⁺', color: 'accent', mark: 'bar' },
  minus: { label: '(Ω·n) < 0 — дают i⁻', color: 'signal', mark: 'bar' },
  current: { label: 'вектор тока i', color: 'ink', mark: 'line' },
  normal: { label: 'площадка и нормаль n', color: 'ink-muted', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Градусы — без пробела перед знаком. */
const deg = (v: number) => `${v.toFixed(0)}°`;

/** Лаборатория 5.3: поверхность Φ(Ω) по всем направлениям и площадка, которую можно повернуть в пространстве. */
export default function AngularFlux3D() {
  const [b, setB] = useState(0.2);
  const [ti, setTi] = useState(30);
  const [tn, setTn] = useState(0);
  const [pn, setPn] = useState(0);
  const [no3d, setNo3d] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const draw = useRef<() => void>(() => {});
  const state = useRef({ b, ti, tn, pn });
  state.current = { b, ti, tn, pn };

  const iv = direction(ti, 0);
  const nv = direction(tn, pn);
  const cg = dot(iv, nv);
  const s = oneSided(b, cg);
  const angle = (Math.acos(Math.max(-1, Math.min(1, cg))) * 180) / Math.PI;

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const sc = new LabScene(host.current, { camera: [4.2, 3.2, 4.6], minDistance: 3, maxDistance: 14 });
    lab.current = sc;

    const geo = new SphereGeometry(1, 72, 48);
    const base = Float32Array.from(geo.attributes.position!.array);
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(geo.attributes.position!.count * 3), 3));
    const surface = new Mesh(geo, new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, opacity: 0.8, side: DoubleSide, depthWrite: false }));
    const disc = new Mesh(new CircleGeometry(0.85, 48), sc.mesh(PARTS.normal.color, { transparent: true, opacity: 0.3, side: DoubleSide, depthWrite: false }));
    const ring = new Mesh(new TorusGeometry(0.85, 0.015, 8, 64), sc.mesh(PARTS.normal.color));
    const nArrow = sc.arrow(PARTS.normal.color, 0.03);
    const iArrow = sc.arrow(PARTS.current.color, 0.055);
    const axes = new LineSegments(
      new BufferGeometry().setAttribute('position', new Float32BufferAttribute([-2.2, 0, 0, 2.2, 0, 0, 0, -2.2, 0, 0, 2.2, 0, 0, 0, -2.2, 0, 0, 2.2], 3)),
      sc.line('rule-strong', { transparent: true, opacity: 0.6 }),
    );
    sc.scene.add(surface, disc, ring, nArrow, iArrow, axes);

    const zAxis = new Vector3(0, 0, 1);
    const plus = new Color(), minus = new Color(), mixed = new Color();
    draw.current = () => {
      const { b: bb, ti: t1, tn: t2, pn: p2 } = state.current;
      const i = direction(t1, 0), n = direction(t2, p2);
      plus.copy(sc.color(PARTS.plus.color));
      minus.copy(sc.color(PARTS.minus.color));
      const pos = geo.attributes.position as BufferAttribute;
      const col = geo.attributes.color as BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        const v = [base[k * 3]!, base[k * 3 + 1]!, base[k * 3 + 2]!] as const;
        const r = (1 + 3 * bb * dot(v, i)) * 1.1;
        pos.setXYZ(k, v[0] * r, v[1] * r, v[2] * r);
        // Узкая полоса смешения у экватора площадки, дальше — чистые цвета полусфер.
        mixed.copy(minus).lerp(plus, Math.max(0, Math.min(1, 0.5 + dot(v, n) * 4)));
        col.setXYZ(k, mixed.r, mixed.g, mixed.b);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      geo.computeVertexNormals();
      const nVec = new Vector3(...n);
      disc.quaternion.setFromUnitVectors(zAxis, nVec);
      ring.quaternion.copy(disc.quaternion);
      nArrow.set(nVec, 2.3);
      iArrow.set(new Vector3(...i), bb > 0.005 ? 0.6 + bb * 6 : 0);
      sc.render();
    };
    sc.onRecolor(() => draw.current());
    draw.current();
    return () => { sc.dispose(); lab.current = null; };
  }, []);

  useEffect(() => draw.current(), [b, ti, tn, pn]);

  return (
    <LabFrame
      n="5.3" kind="3D" title="Угловой поток и площадка в пространстве"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={Object.values(PARTS)}
      readout={[
        { tex: 'i^{+}/\\Phi', value: `= ${s.plus.toFixed(3)}` },
        { tex: 'i^{-}/\\Phi', value: `= ${s.minus.toFixed(3)}` },
        { tex: 'i_n/\\Phi', value: `= ${s.net.toFixed(3)}` },
        { label: 'угол между i и n', value: `${Math.round(angle)}°` },
      ]}
      controls={<>
        <Slider label="Анизотропия |i|/Φ" min={0} max={0.33} step={0.01} value={b} format={(v) => v.toFixed(2)} onChange={setB} />
        <Slider label="Ток: полярный угол" min={0} max={180} step={1} value={ti} format={deg} onChange={setTi} />
        <Slider label="Нормаль: полярный угол" min={0} max={180} step={1} value={tn} format={deg} onChange={setTn} />
        <Slider label="Нормаль: азимут" min={0} max={359} step={1} value={pn} format={deg} onChange={setPn} />
      </>}
      caption="Рис. 5.3. Поверхность — $\Phi(\vec\Omega)$ по всем направлениям, цвет — в какую полусферу относительно площадки летят нейтроны. Поверните нормаль перпендикулярно току: $i_n = 0$, $i^+ = i^- = \Phi/4$, хотя поле анизотропно. Ток через площадку зависит только от проекции $\vec i$ на нормаль: $i^\pm = \Phi/4 \pm (\vec i\cdot\vec n)/2$. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl."
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Угловой поток с анизотропией ${b.toFixed(2)}; угол между током и нормалью ${Math.round(angle)}°, ток через площадку ${s.net.toFixed(3)} Φ`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Числа под рисунком считаются как обычно.</p>}
      </div>
    </LabFrame>
  );
}
