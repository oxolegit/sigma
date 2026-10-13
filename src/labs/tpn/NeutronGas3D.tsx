import { useEffect, useRef, useState } from 'react';
import {
  BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, EdgesGeometry, Float32BufferAttribute, LineSegments,
  Mesh, Points, TorusGeometry, Vector3,
} from 'three';
import { Button, LabFrame, Slider, type LegendItem } from '../../components';
import { sci } from '../../lib/format';
import { mulberry32 } from '../../lib/rng';
import { LabScene, webglAvailable } from '../../lib/three';
import { degeneracy, DISC, gasCurrents, HALF, kT, makeGas, SLOWER_THAN_VT, stepGas, T0, vT, type Gas } from './ensemble';

/** Части сцены: по этой таблице красятся объекты и строится легенда. */
const PARTS = {
  slow: { label: 'нейтрон медленнее наиболее вероятной скорости', color: 'accent', mark: 'dot' },
  fast: { label: 'нейтрон быстрее наиболее вероятной скорости', color: 'signal', mark: 'dot' },
  disc: { label: 'площадка, считающая пересечения', color: 'ink', mark: 'bar' },
  normal: { label: 'нормаль площадки: «+»', color: 'ink', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

const N = 700;
/** Скорость в единицах сцены за секунду при V = 2200 м/с — чтобы движение было видно глазом. */
const SCENE_SPEED = 0.9 / 2200;
const STEP = 1 / 60;

/** Частицы медленнее V_T — в начало массивов: тогда два облака точек разных цветов — два среза одних и тех же данных. */
function sortBySpeed(gas: Gas, vt: number): number {
  const idx = Array.from({ length: gas.p.length / 3 }, (_, i) => i);
  const speed = (i: number) => Math.hypot(gas.v[3 * i]!, gas.v[3 * i + 1]!, gas.v[3 * i + 2]!);
  idx.sort((a, b) => speed(a) - speed(b));
  const p = gas.p.slice(), v = gas.v.slice();
  idx.forEach((from, to) => { for (let a = 0; a < 3; a++) { gas.p[3 * to + a] = p[3 * from + a]!; gas.v[3 * to + a] = v[3 * from + a]!; } });
  return idx.filter((i) => speed(i) < vt).length;
}

/** Круглая точка вместо квадратной. */
function dotTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(16, 16, 14, 0, 2 * Math.PI); g.fill();
  return new CanvasTexture(c);
}

/** Лаборатория 10.3: газ из 700 нейтронов с максвелловскими скоростями; площадка в центре проверяет i± = Φ/4. */
export default function NeutronGas3D() {
  const [T, setT] = useState(T0);
  const [no3d, setNo3d] = useState(false);
  const [, setTick] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const state = useRef<{ gas: Gas; slow: number } | null>(null);
  const temp = useRef(T0);
  const sync = useRef<() => void>(() => {});

  if (!state.current) {
    const gas = makeGas(N, vT(T0) * SCENE_SPEED, mulberry32(1936));
    state.current = { gas, slow: sortBySpeed(gas, vT(T0) * SCENE_SPEED) };
  }

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const s = new LabScene(host.current, { camera: [6.2, 4.2, 7.4], minDistance: 5, maxDistance: 20 });
    lab.current = s;
    const g = state.current!.gas;
    s.scene.add(new LineSegments(new EdgesGeometry(new BoxGeometry(2 * HALF, 2 * HALF, 2 * HALF)), s.line('rule-strong')));
    const disc = new Mesh(new CircleGeometry(DISC, 48), s.mesh(PARTS.disc.color, { transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }));
    disc.rotation.y = Math.PI / 2;
    const ring = new Mesh(new TorusGeometry(DISC, 0.02, 8, 64), s.mesh(PARTS.disc.color));
    ring.rotation.y = Math.PI / 2;
    const normal = s.arrow(PARTS.normal.color, 0.025);
    normal.set(new Vector3(1, 0, 0), 1.2);
    s.scene.add(disc, ring, normal);

    // Два облака точек — срезы общего массива координат: медленные и быстрые.
    const tex = dotTexture();
    const pos = new Float32BufferAttribute(g.p, 3);
    const cloud = (from: number, to: number, color: string, size: number) => {
      const geo = new BufferGeometry();
      geo.setAttribute('position', pos);
      geo.setDrawRange(from, to - from);
      geo.boundingSphere = null;
      const pts = new Points(geo, s.points(color, { size, map: tex, alphaTest: 0.5 }));
      pts.frustumCulled = false;
      return pts;
    };
    s.scene.add(cloud(0, state.current!.slow, PARTS.slow.color, 0.13), cloud(state.current!.slow, N, PARTS.fast.color, 0.16));

    sync.current = () => { pos.needsUpdate = true; s.render(); };
    let acc = 0, since = 0;
    s.animate((dt) => {
      // Фиксированный шаг: счёт пересечений не зависит от частоты кадров.
      acc += dt;
      while (acc >= STEP) { stepGas(g, STEP); acc -= STEP; }
      pos.needsUpdate = true;
      since += dt;
      if (since > 0.5) { since = 0; setTick((x) => x + 1); }
    });
    return () => { s.dispose(); tex.dispose(); lab.current = null; };
  }, []);

  // Нагрев: все скорости растут в √(T/T') раз, распределение остаётся максвелловским, счёт — заново.
  useEffect(() => {
    const g = state.current!.gas;
    const f = Math.sqrt(T / temp.current);
    for (let i = 0; i < g.v.length; i++) g.v[i] = g.v[i]! * f;
    temp.current = T;
    g.plus = g.minus = g.time = 0;
    setTick((x) => x + 1);
  }, [T]);

  const simulate = () => {
    const g = state.current!.gas;
    for (let i = 0; i < 600; i++) stepGas(g, STEP);
    sync.current();
    setTick((x) => x + 1);
  };

  const g = state.current.gas;
  const vt = vT(T) * SCENE_SPEED;
  const cur = g.time > 0.5 ? gasCurrents(g, vt) : null;

  return (
    <LabFrame
      n="10.3" kind="3D" title="Нейтронный газ в ящике"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={Object.values(PARTS)}
      readout={[
        { tex: 'V_T', value: `= ${Math.round(vT(T)).toLocaleString('ru-RU')}`, unit: 'м/с' },
        { label: 'kT', value: kT(T).toFixed(4), unit: 'эВ' },
        { tex: 'i^+/\\Phi', value: cur ? `= ${cur.plus.toFixed(3)} (${g.plus})` : '–' },
        { tex: 'i^-/\\Phi', value: cur ? `= ${cur.minus.toFixed(3)} (${g.minus})` : '–' },
        { tex: 'n\\Lambda^3', value: `= ${sci(degeneracy(1e8, T), 2)}`, unit: 'при n = 10⁸ см⁻³' },
      ]}
      controls={<>
        <Slider label="Температура среды" min={100} max={1200} step={1} value={T} unit="К" format={(v) => v.toFixed(v === T0 ? 1 : 0)} onChange={setT} />
        <div className="sg-lab-buttons"><Button variant="primary" size="sm" onClick={simulate}>+10 с без анимации</Button></div>
      </>}
      caption={`Рис. 10.3. 700 нейтронов с максвелловскими скоростями отражаются от стенок; медленнее $V_T$ около ${Math.round(100 * SLOWER_THAN_VT)} % из них. Площадка в центре считает пересечения в каждую сторону. В изотропном газе $\\Phi = n\\bar V$, и оба односторонних тока стремятся к $\\Phi/4$, то есть к 0.25 — прямая проверка $i^\\pm = \\Phi/4$ из урока 5. Чем дольше счёт, тем ближе к 0.25: погрешность падает как $1/\\sqrt N$. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl.`}
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Нейтронный газ при T = ${Math.round(T)} К${cur ? `: i⁺/Φ = ${cur.plus.toFixed(3)}, i⁻/Φ = ${cur.minus.toFixed(3)}` : ''}`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Кнопка «+10 с без анимации» считает пересечения и без неё.</p>}
      </div>
    </LabFrame>
  );
}
