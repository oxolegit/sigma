import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry, Vector3, type BufferAttribute } from 'three';
import { Button, LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { energy } from '../../lib/format';
import { LabScene, webglAvailable } from '../../lib/three';
import { energyForKR, hardSphere, scatteredCoefficients } from './quantum';

/** Части сцены: по этой таблице красятся объекты и строится легенда. */
const PARTS = {
  crest: { label: 'гребни волны Re ψ > 0', color: 'accent', mark: 'bar' },
  trough: { label: 'впадины Re ψ < 0', color: 'signal', mark: 'bar' },
  nucleus: { label: 'ядро радиуса R', color: 'ink', mark: 'ball' },
  beam: { label: 'направление пучка', color: 'ink-muted', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

type Mode = 'full' | 'scattered';
const SIZE = 14;
const SEGMENTS = 110;

/** Лаборатория 9.1: сечение волновой функции плоскостью через ось пучка — падающая и рассеянная волны. */
export default function WaveScattering3D() {
  const [kR, setKR] = useState(0.6);
  const [mode, setMode] = useState<Mode>('full');
  const [no3d, setNo3d] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const field = useRef<{ re: Float32Array; im: Float32Array } | null>(null);
  const hs = useMemo(() => hardSphere(kR), [kR]);
  const fb = hs.intensity(0) / Math.max(hs.intensity(Math.PI), 1e-12);

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const s = new LabScene(host.current, { camera: [-6, 9, 13], minDistance: 6, maxDistance: 30 });
    lab.current = s;
    const geo = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const count = geo.attributes.position!.count;
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(count * 3), 3));
    s.scene.add(new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })));
    s.scene.add(new Mesh(new SphereGeometry(1, 40, 28), s.mesh(PARTS.nucleus.color)));
    const beam = s.arrow(PARTS.beam.color, 0.06);
    beam.position.set(-SIZE / 2 - 0.6, 0.8, 0);
    beam.set(new Vector3(1, 0, 0), 2.2);
    s.scene.add(beam);

    const base = new Color(), crest = new Color(), trough = new Color(), tmp = new Color();
    const recolor = () => { base.copy(s.color('surface-2')); crest.copy(s.color(PARTS.crest.color)); trough.copy(s.color(PARTS.trough.color)); };
    recolor();
    s.onRecolor(recolor);

    s.animate((_, t) => {
      const f = field.current;
      if (!f) return;
      const w = 2.2, c = Math.cos(w * t), sn = Math.sin(w * t);
      const pos = geo.attributes.position as BufferAttribute;
      const col = geo.attributes.color as BufferAttribute;
      for (let v = 0; v < count; v++) {
        const val = f.re[v]! * c + f.im[v]! * sn;
        pos.setY(v, 0.42 * Math.max(-2.2, Math.min(2.2, val)));
        const k = Math.max(-1, Math.min(1, val / 1.6));
        tmp.copy(base).lerp(k >= 0 ? crest : trough, Math.abs(k));
        col.setXYZ(v, tmp.r, tmp.g, tmp.b);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
    });
    return () => { s.dispose(); lab.current = null; };
  }, []);

  // Пересчёт комплексного поля в узлах сетки при смене kR или режима.
  useEffect(() => {
    const amp = scatteredCoefficients(kR);
    const n = (SEGMENTS + 1) ** 2;
    const re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 0; i <= SEGMENTS; i++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        const x = -SIZE / 2 + (SIZE * j) / SEGMENTS, z = -SIZE / 2 + (SIZE * i) / SEGMENTS;
        const [a, b] = amp(x, z, mode === 'scattered');
        const k = i * (SEGMENTS + 1) + j;
        re[k] = mode === 'scattered' ? 3 * a : a;
        im[k] = mode === 'scattered' ? 3 * b : b;
      }
    }
    field.current = { re, im };
    lab.current?.render();
  }, [kR, mode]);

  return (
    <LabFrame
      n="9.1" kind="3D" title="Волна рассеивается на ядре"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={Object.values(PARTS)}
      readout={[
        { tex: '\\sigma/\\pi R^2', value: `= ${hs.sigma.toFixed(2)}` },
        { label: 'парциальных волн', value: String(hs.waves) },
        { label: 'энергия для ²³⁸U', value: energy(energyForKR(kR)) },
        { label: 'вперёд / назад', value: fb.toFixed(2) },
      ]}
      controls={<>
        <Slider label="kR = R/ƛ" min={0.2} max={5} step={0.05} value={kR} format={(v) => v.toFixed(2)} onChange={setKR} />
        <Segmented label="Что показывать" value={mode} onChange={(v) => setMode(v as Mode)} options={[{ value: 'full', label: 'Вся волна' }, { value: 'scattered', label: 'Рассеянная ×3' }]} />
      </>}
      caption="Рис. 9.1. Сечение волновой функции плоскостью, проходящей через ось пучка: высота и цвет — мгновенное значение Re ψ, пучок идёт слева направо. При $kR < 1$ рассеянная волна почти сферическая — работает одна s-волна. С ростом $kR$ за ядром появляется тень, а рассеяние вытягивается вперёд. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl."
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Рассеяние волны на ядре при kR = ${kR.toFixed(2)}: σ = ${hs.sigma.toFixed(2)} πR²`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Числа под рисунком считаются как обычно.</p>}
      </div>
    </LabFrame>
  );
}
