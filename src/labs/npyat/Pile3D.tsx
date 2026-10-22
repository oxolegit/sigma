import { useEffect, useRef, useState } from 'react';
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, type MeshStandardMaterial } from 'three';
import { Button, LabFrame, Segmented, Slider, type LegendItem } from '../../components';
import { LabScene, webglAvailable } from '../../lib/three';
import { LAYER_CM, criticalLayer, kPile, nonLeakage } from './physics';

const LAYERS = 57;
/** Сцена: единица — ширина бруска (4⅛ дюйма), всё уменьшено в SCALE раз. */
const SCALE = 0.05;
/** Экваториальный радиус кладки в брусках (≈ 12.5 фута) и центр «эллипсоида» по высоте. */
const R_EQ = 36, Z_C = 30, A_Z = 38;
/** Блок в сцене — пара брусков 2×4 ширины: сетка грубее настоящей, рисунок легче для телефона. */
const BW = 2, BL = 4;
/** Шаг урановых «псевдосфер» в слое с ураном (в брусках) и доля радиуса, занятая ураном. */
const U_STEP = 4, U_FRAC = 0.78;
/** Слой с кадмиевым стержнем. */
const ROD_LAYER = 28;

/** Одна таблица на материалы сцены и легенду: цвет — токен, форма знака дублирует его. */
const PARTS = {
  graphite: { label: 'графит', color: 'rule-strong', mark: 'bar' },
  loaded: { label: 'графит с ураном — слой через один', color: 'ink-muted', mark: 'bar' },
  uranium: { label: 'уран', color: 'accent', mark: 'ball' },
  hot: { label: 'уран — кладка критична', color: 'signal', mark: 'ball' },
  rod: { label: 'кадмиевый стержень', color: 'ink', mark: 'line' },
} as const satisfies Record<string, LegendItem>;

/** Радиус слоя i — сплюснутый эллипсоид, снизу и сверху уже, но не меньше половины экватора. */
const layerRadius = (i: number) => R_EQ * Math.max(0.55, Math.sqrt(Math.max(0, 1 - ((i + 0.5 - Z_C) / A_Z) ** 2)));

interface Block { layer: number; x: number; z: number; along: 'x' | 'z' }
interface Lump { layer: number; x: number; z: number }

/** Все блоки и урановые вставки 57 слоёв: слои чередуют направление брусков, уран — в нечётных. */
function buildPile() {
  const blocks: Block[] = [], lumps: Lump[] = [];
  for (let i = 0; i < LAYERS; i++) {
    const r = layerRadius(i);
    const along = i % 2 ? 'z' : 'x';
    // Вдоль «along» блок длиной BL, поперёк — BW.
    for (let a = -r; a < r; a += BL) for (let c = -r; c < r; c += BW) {
      const ca = a + BL / 2, cc = c + BW / 2;
      if (ca * ca + cc * cc > r * r) continue;
      blocks.push(along === 'x' ? { layer: i, x: ca, z: cc, along } : { layer: i, x: cc, z: ca, along });
    }
    if (i % 2) {
      const ru = r * U_FRAC;
      for (let x = -ru; x <= ru; x += U_STEP) for (let z = -ru; z <= ru; z += U_STEP) if (x * x + z * z <= ru * ru) lumps.push({ layer: i, x, z });
    }
  }
  return { blocks, lumps };
}

/** Срез четверти: блоки с x > 0 и z > 0 скрыты — видно уран и стержень внутри. */
const cutAway = (x: number, z: number) => x > 0 && z > 0;

/** Лаборатория 19.3: кладка CP-1 слой за слоем и упрощённая оценка k — утечка падает с ростом кладки. */
export default function Pile3D() {
  const [n, setN] = useState(40);
  const [rods, setRods] = useState<'in' | 'out'>('out');
  const [cut, setCut] = useState(true);
  const [no3d, setNo3d] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const draw = useRef<(n: number, cut: boolean, rodsIn: boolean, hot: boolean) => void>(() => {});

  const k = kPile(n, rods === 'in');
  const hot = k >= 1;
  const crit = criticalLayer();

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const s = new LabScene(host.current, { camera: [4.2, 3.6, 5.2], target: [0, 1.3, 0], minDistance: 2.5, maxDistance: 16 });
    lab.current = s;
    const { blocks, lumps } = buildPile();

    const box = new BoxGeometry(1, 1, 1);
    const mGraphite = s.mesh(PARTS.graphite.color, { roughness: 0.9 });
    const mLoaded = s.mesh(PARTS.loaded.color, { roughness: 0.9 });
    const plain = new InstancedMesh(box, mGraphite, blocks.length);
    const loaded = new InstancedMesh(box, mLoaded, blocks.length);
    const mUranium = s.mesh(PARTS.uranium.color, { roughness: 0.45, metalness: 0.2 });
    const mHot = s.mesh(PARTS.hot.color, { roughness: 0.45, emissiveIntensity: 0.35 });
    const onHot = () => (mHot as MeshStandardMaterial).emissive.copy(s.color(PARTS.hot.color));
    onHot();
    s.onRecolor(onHot);
    const uranium = new InstancedMesh(new IcosahedronGeometry(0.55, 0), mUranium, lumps.length);
    for (const im of [plain, loaded, uranium]) im.frustumCulled = false; // число экземпляров меняется — границы не пересчитываем
    s.scene.add(plain, loaded, uranium);

    // Кадмиевый стержень — горизонтально через центр слоя ROD_LAYER, вдоль x.
    const rodLen = 2 * R_EQ + 16;
    const rod = new Mesh(new CylinderGeometry(0.6 * SCALE, 0.6 * SCALE, rodLen * SCALE, 16), s.mesh(PARTS.rod.color, { metalness: 0.5, roughness: 0.3 }));
    rod.rotation.z = Math.PI / 2;
    s.scene.add(rod);

    const m = new Matrix4(), q = new Quaternion(), p = new Vector3(), sc = new Vector3();
    draw.current = (layers, isCut, rodsIn, isHot) => {
      let a = 0, b = 0, c = 0;
      for (const bl of blocks) {
        if (bl.layer >= layers || (isCut && cutAway(bl.x, bl.z))) continue;
        p.set(bl.x * SCALE, (bl.layer + 0.5) * SCALE, bl.z * SCALE);
        // Зазор 4 % между блоками — видна кладка.
        sc.set((bl.along === 'x' ? BL : BW) * 0.96 * SCALE, 0.96 * SCALE, (bl.along === 'x' ? BW : BL) * 0.96 * SCALE);
        m.compose(p, q, sc);
        if (bl.layer % 2) loaded.setMatrixAt(b++, m); else plain.setMatrixAt(a++, m);
      }
      for (const u of lumps) {
        if (u.layer >= layers) continue;
        p.set(u.x * SCALE, (u.layer + 0.5) * SCALE, u.z * SCALE);
        sc.setScalar(SCALE);
        m.compose(p, q, sc);
        uranium.setMatrixAt(c++, m);
      }
      plain.count = a; loaded.count = b; uranium.count = c;
      plain.instanceMatrix.needsUpdate = loaded.instanceMatrix.needsUpdate = uranium.instanceMatrix.needsUpdate = true;
      uranium.material = isHot ? mHot : mUranium;
      // Стержень виден, только когда кладка до него доросла; выдвинутый — внутренний конец у края кладки.
      rod.visible = layers > ROD_LAYER;
      rod.position.set((rodsIn ? 8 : layerRadius(ROD_LAYER) + rodLen / 2 - 4) * SCALE, (ROD_LAYER + 0.5) * SCALE, 0);
      s.render();
    };
    return () => { s.dispose(); lab.current = null; };
  }, []);

  useEffect(() => draw.current(n, cut, rods === 'in', hot), [n, cut, rods, hot]);

  const legend = [PARTS.graphite, PARTS.loaded, hot ? PARTS.hot : PARTS.uranium, PARTS.rod];
  return (
    <LabFrame
      n="19.3" id="lab-pile-3d" kind="3D" title="Собери поленницу"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={legend}
      readout={[
        { label: 'высота кладки', value: (n * LAYER_CM / 100).toFixed(2), unit: 'м' },
        { label: 'не вылетает', value: nonLeakage(n).toFixed(3) },
        { tex: 'k_{\\text{эф}}', value: k.toFixed(4) },
        { label: 'критика без кадмия', value: crit ? `${crit} слой` : '–' },
      ]}
      status={hot
        ? { tone: 'warn', text: `Кладка критична: ${n} слоёв, k = ${k.toFixed(4)}. Утечка стала меньше избытка размножения — цепная реакция поддерживает себя. На CP-1 это случилось на 57-м слое; кадмиевые стержни держали кладку подкритичной, пока её достраивали.` }
        : rods === 'in' && kPile(n) >= 1
          ? { tone: 'ok', text: `Без кадмия было бы k = ${kPile(n).toFixed(4)} — критика. Вставленные стержни отнимают 0.04, и кладка остаётся подкритичной: так её и достраивали.` }
          : { tone: 'ok', text: `Подкритика: k = ${k.toFixed(4)}. Из кладки вылетает ${((1 - nonLeakage(n)) * 100).toFixed(1)} % нейтронов — с каждым слоем меньше.` }}
      controls={<>
        <Slider label="Слоёв уложено" min={1} max={LAYERS} step={1} value={n} onChange={setN} />
        <Segmented label="Кадмиевые стержни" value={rods} onChange={(v) => setRods(v as 'in' | 'out')} options={[{ value: 'in', label: 'вставлены' }, { value: 'out', label: 'выдвинуты' }]} />
        <Segmented label="Вид" value={cut ? 'cut' : 'full'} onChange={(v) => setCut(v === 'cut')} options={[{ value: 'cut', label: 'в разрезе' }, { value: 'full', label: 'целиком' }]} />
      </>}
      caption="Рис. 19.3. Схема кладки: 57 слоёв графитовых брусков 4⅛ дюйма, направление брусков чередуется, уран — в каждом втором слое (в разрезе видны вставки). Оценка $k$ — упрощённая модель, не расчёт CP-1: кладка считается цилиндром радиуса 3 м и высоты $n\cdot10.5$ см, $k = k_\infty/(1 + M^2B^2)$ с $M^2 = 600$ см² и $B^2 = (2.405/R)^2 + (\pi/H)^2$, а $k_\infty$ подобрано так, чтобы 57 слоёв дали 1.0006, как в записях пуска. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl."
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Кладка из ${n} слоёв, k = ${k.toFixed(4)}${hot ? ', критична' : ''}`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Числа под рисунком считаются как обычно.</p>}
      </div>
    </LabFrame>
  );
}
