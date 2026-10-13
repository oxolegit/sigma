import { useEffect, useRef, useState } from 'react';
import { Mesh, SphereGeometry, Vector3, type BufferAttribute } from 'three';
import { Button, LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { isotropic, mulberry32 } from '../../lib/rng';
import { LabScene, webglAvailable } from '../../lib/three';
import { cassiniRadius, excitation, SADDLE, sampleNu, target, TARGETS, turningDeformation, volumeScale } from './fission';
import { drawPotential, ENERGY_SERIES } from './fissionPlot';

/** Частицы сцены: по этой таблице красятся объекты и строится легенда. */
const PARTS = {
  nucleus: { label: 'ядро-капля', color: 'accent', mark: 'ball' },
  fragment: { label: 'осколки деления', color: 'signal', mark: 'ball' },
  neutron: { label: 'нейтроны', color: 'ink', mark: 'ball' },
  gamma: { label: 'γ-кванты', color: 'ink-muted', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const LEGEND = [...Object.values(PARTS), ENERGY_SERIES.potential, ENERGY_SERIES.levelE, ENERGY_SERIES.levelB, ENERGY_SERIES.state];

type Phase = 'idle' | 'in' | 'osc' | 'split';
type Status = { tone: 'ok' | 'warn' | 'bad'; text: string };

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Лаборатория 2.2: капельная модель — захват нейтрона, колебания и деление или радиационный захват. */
export default function FissionDrop3D() {
  const [id, setId] = useState('u238');
  const [E, setE] = useState(0.3);
  const [status, setStatus] = useState<Status>({ tone: 'warn', text: 'Выберите ядро и энергию нейтрона и запустите нейтрон.' });
  const [outcome, setOutcome] = useState('—');
  const [no3d, setNo3d] = useState(false);
  // Деформация капли сейчас — точка на кривой V(ε) рядом со сценой.
  const [deform, setDeform] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const launch = useRef<(Es: number, ub: number) => void>(() => {});
  const reset = useRef<() => void>(() => {});
  const t = target(id);
  const Es = excitation(t, E);

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const s = new LabScene(host.current, { camera: [0, 1.4, 6.6], minDistance: 3, maxDistance: 14 });
    lab.current = s;
    const rng = mulberry32(235);

    const geo = new SphereGeometry(1, 96, 64);
    const base = Float32Array.from(geo.attributes.position!.array);
    const nucleusMat = s.mesh(PARTS.nucleus.color, { emissiveIntensity: 0 });
    const glow = () => nucleusMat.emissive.copy(s.color('accent'));
    glow();
    s.onRecolor(glow);
    const nucleus = new Mesh(geo, nucleusMat);
    const frag1 = new Mesh(new SphereGeometry(Math.cbrt(95 / 236), 48, 32), s.mesh(PARTS.fragment.color));
    const frag2 = new Mesh(new SphereGeometry(Math.cbrt(139 / 236), 48, 32), s.mesh(PARTS.fragment.color));
    const neutronMat = s.mesh(PARTS.neutron.color);
    const incoming = new Mesh(new SphereGeometry(0.13, 20, 14), neutronMat);
    const out = Array.from({ length: 5 }, () => new Mesh(new SphereGeometry(0.1, 16, 12), neutronMat));
    const gammaMat = s.mesh(PARTS.gamma.color);
    const gammas = Array.from({ length: 3 }, () => new Mesh(new SphereGeometry(0.08, 12, 10), gammaMat));
    s.scene.add(nucleus, frag1, frag2, incoming, ...out, ...gammas);

    const setShape = (c: number) => {
      const pos = geo.attributes.position as BufferAttribute;
      const k = volumeScale(c);
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3]!, y = base[i * 3 + 1]!, z = base[i * 3 + 2]!;
        const r = cassiniRadius(Math.acos(Math.max(-1, Math.min(1, x))), c) * k;
        pos.setXYZ(i, x * r, y * r, z * r);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      setDeform(c);
    };

    const velocity = new Map<Mesh, Vector3>();
    const burst = (meshes: Mesh[], speed: number) => meshes.forEach((m) => {
      m.visible = true;
      m.position.set(0, 0, 0);
      velocity.set(m, new Vector3(...isotropic(rng)).multiplyScalar(speed));
    });

    let phase: Phase = 'idle', time = 0, c = 0, Es0 = 0, ub0 = 1, gammaOut = false, raf = 0, last = 0;

    reset.current = () => {
      cancelAnimationFrame(raf);
      phase = 'idle'; c = 0; gammaOut = false;
      setShape(0);
      nucleus.visible = true;
      nucleusMat.emissiveIntensity = 0;
      [frag1, frag2, incoming, ...out, ...gammas].forEach((m) => { m.visible = false; });
      s.render();
    };

    const finishFission = () => {
      phase = 'split'; time = 0;
      nucleus.visible = false;
      setDeform(1);
      frag1.visible = frag2.visible = true;
      frag1.position.set(-0.75, 0, 0);
      frag2.position.set(0.85, 0, 0);
      const nu = Math.max(2, Math.min(4, sampleNu(rng)));
      burst(out.slice(0, nu), 3.2);
      burst(gammas, 4.5);
      setOutcome(`деление, ν = ${nu}`);
      setStatus({ tone: 'ok', text: `Деление: $E^* = ${Es0.toFixed(2)}$ МэВ ≥ $U_{\\text{б}} = ${ub0.toFixed(2)}$ МэВ. Шейка разорвалась, осколки разлетаются под действием кулоновского отталкивания; вылетело ${nu} мгновенных нейтрона и γ-кванты.` });
    };
    const finishCapture = (ct: number) => {
      gammaOut = true;
      burst(gammas, 4.5);
      setOutcome('радиационный захват');
      setStatus({ tone: 'bad', text: `Радиационный захват: $E^* = ${Es0.toFixed(2)}$ МэВ < $U_{\\text{б}} = ${ub0.toFixed(2)}$ МэВ. Капля дошла лишь до деформации ε ≈ ${ct.toFixed(2)}, поколебалась и сбросила энергию γ-квантами.` });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const fissions = Es0 >= ub0;
      const ct = turningDeformation(Es0, ub0);
      if (phase === 'in') {
        incoming.position.x = -5 + (time / 0.7) * 4;
        if (time >= 0.7) { incoming.visible = false; phase = 'osc'; time = 0; nucleusMat.emissiveIntensity = 0.55; }
      } else if (phase === 'osc') {
        const w = 2 * Math.PI * 0.9;
        if (fissions) {
          if (time < 1.6) c = Math.min(ct, SADDLE) * 0.85 * Math.abs(Math.sin((w * time) / 2)) * Math.min(1, time);
          else c = Math.min(1, c + dt * 0.55);
          if (c >= 0.999) finishFission();
        } else {
          c = ct * Math.exp(-Math.max(0, time - 2.2) / 0.9) * Math.abs(Math.sin((w * time) / 2));
          nucleusMat.emissiveIntensity = 0.55 * Math.exp(-time / 2.5);
          if (time > 2.2 && !gammaOut) finishCapture(ct);
          if (time > 5) { phase = 'idle'; c = 0; nucleusMat.emissiveIntensity = 0; }
        }
        // finishFission() мог переключить фазу внутри этого же кадра.
        if ((phase as Phase) !== 'split') setShape(c);
      } else if (phase === 'split') {
        frag1.position.x = -0.75 - time * 1.6;
        frag2.position.x = 0.85 + time * 1.2;
        if (time > 2.6) phase = 'idle';
      }
      for (const [m, v] of velocity) {
        if (!m.visible) continue;
        m.position.addScaledVector(v, dt);
        if (m.position.length() > 7) m.visible = false;
      }
      s.render();
      if (phase !== 'idle') raf = requestAnimationFrame(tick);
    };

    launch.current = (es, ub) => {
      reset.current();
      Es0 = es; ub0 = ub;
      setOutcome('…');
      if (reducedMotion()) {
        // Без анимации — сразу итог.
        if (es >= ub) finishFission();
        else { setShape(turningDeformation(es, ub)); finishCapture(turningDeformation(es, ub)); }
        s.render();
        return;
      }
      setStatus({ tone: 'warn', text: 'Нейтрон летит к ядру…' });
      phase = 'in'; time = 0;
      incoming.visible = true;
      incoming.position.set(-5, 0.15, 0);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    reset.current();
    return () => { cancelAnimationFrame(raf); s.dispose(); lab.current = null; };
  }, []);

  // Новое ядро или энергия — сцена возвращается к исходной капле.
  useEffect(() => {
    reset.current();
    setOutcome('—');
    setStatus({ tone: 'warn', text: 'Выберите ядро и энергию нейтрона и запустите нейтрон.' });
  }, [id, E]);

  const pot = useCanvas((g, w, h) => drawPotential(g, 0, 0, w, h, t, Es, deform), [id, E, deform]);

  return (
    <LabFrame
      n="2.2" kind="3D" title="Ядро-капля после захвата нейтрона" stage="tall"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={LEGEND}
      readout={[
        { tex: 'E^*', value: `= ${Es.toFixed(2)}`, unit: 'МэВ' },
        { tex: 'U_{\\text{б}}', value: `= ${t.ub.toFixed(2)}`, unit: 'МэВ' },
        { label: 'исход', value: outcome },
      ]}
      status={status}
      controls={<>
        <Select label="Ядро-мишень" value={id} onChange={setId} options={TARGETS.map((x) => ({ value: x.id, label: x.label }))} />
        <Slider label="Энергия нейтрона" min={0} max={3} step={0.01} value={E} unit="МэВ" format={(v) => v.toFixed(2)} onChange={setE} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={() => (no3d ? setStatus({ tone: 'warn', text: 'Без WebGL анимации нет — исход показан в лаборатории 2.1.' }) : launch.current(Es, t.ub))}>Запустить нейтрон</Button>
        </div>
      </>}
      caption="Рис. 2.2. Капельная модель: форма ядра — овалы Кассини с сохранением объёма. После захвата нейтрона составное ядро возбуждено и колеблется. Если $E^* \ge U_{\text{б}}$, шейка вытягивается и рвётся; иначе капля сбрасывает энергию γ-квантами. Рядом — энергия деформации V(ε): точка показывает текущую форму капли и не поднимается выше уровня $E^*$ — перевалить через барьер она может, только если $E^*$ выше него. Сцену вращают мышью или пальцем, масштаб — колесом с Ctrl."
    >
      <div className="sg-split">
        <div ref={host} className="sg-scene" role="img" aria-label={`Ядро ${t.compound}: энергия возбуждения ${Es.toFixed(2)} МэВ, барьер ${t.ub} МэВ`}>
          {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL.</p>}
        </div>
        <canvas ref={pot} role="img" aria-label={`Энергия деформации ${t.compound}: E* = ${Es.toFixed(2)} МэВ, барьер ${t.ub} МэВ, деформация ${deform.toFixed(2)}`} />
      </div>
    </LabFrame>
  );
}
