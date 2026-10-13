import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, InstancedMesh, Matrix4, Mesh, SphereGeometry, Vector3 } from 'three';
import { Button, LabFrame, Segmented, Select, type LegendItem } from '../../components';
import { isotropic, mulberry32 } from '../../lib/rng';
import { LabScene, webglAvailable } from '../../lib/three';
import { sampleNu } from './fission';
import { CHANNEL_NAMES, channels, NUCLEI, sampleChannel, type Channel, type NucleusId } from './quantum';

/** Частицы сцены: по этой таблице красятся объекты и строится легенда. */
const PARTS = {
  proton: { label: 'протоны ядра', color: 'signal', mark: 'ball' },
  neutronIn: { label: 'нейтроны ядра', color: 'accent', mark: 'ball' },
  neutron: { label: 'налетающий и вылетающие нейтроны', color: 'ink', mark: 'ball' },
  gamma: { label: 'γ-кванты (мелкие)', color: 'ink-muted', mark: 'ball' },
} as const satisfies Record<string, LegendItem>;

const DESCRIPTION: Record<Channel, { tone: 'ok' | 'warn' | 'bad'; text: string }> = {
  el: { tone: 'ok', text: 'Упругое рассеяние: нейтрон отскочил, ядро осталось в основном состоянии.' },
  in: { tone: 'warn', text: 'Неупругое рассеяние: ядро осталось возбуждённым и испустило γ-квант, нейтрон ушёл с меньшей энергией.' },
  cap: { tone: 'bad', text: 'Радиационный захват: составное ядро сбросило энергию γ-квантами, нейтрон исчез.' },
  fis: { tone: 'warn', text: 'Деление: составное ядро разорвалось на два осколка, вылетели мгновенные нейтроны и γ-кванты.' },
  alpha: { tone: 'bad', text: '¹⁰B(n, α)⁷Li: вылетела α-частица (крупный шарик), ядро лития отдачи летит в противоположную сторону.' },
};

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Лаборатория 9.5: исход каждого столкновения разыгрывается по сечениям каналов; статистика — свойство ансамбля. */
export default function ReactionChannels3D() {
  const [nucleus, setNucleus] = useState<NucleusId>('u235');
  const [energy, setEnergy] = useState<'thermal' | 'fast'>('thermal');
  const [counts, setCounts] = useState<Partial<Record<Channel, number>>>({});
  const [status, setStatus] = useState<{ tone: 'ok' | 'warn' | 'bad'; text: string }>({ tone: 'warn', text: 'Нажмите «Запустить 1 нейтрон».' });
  const [no3d, setNo3d] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<LabScene | null>(null);
  const play = useRef<(ch: Channel) => void>(() => {});
  const build = useRef<(id: NucleusId) => void>(() => {});
  const rng = useRef(mulberry32(1939));
  // Анимация живёт в эффекте первого рендера — текущее ядро она читает через ref.
  const current = useRef(nucleus);
  current.current = nucleus;
  const list = useMemo(() => channels(nucleus, energy), [nucleus, energy]);
  const N = Object.values(counts).reduce((s, v) => s + (v ?? 0), 0);

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) { setNo3d(true); return; }
    const s = new LabScene(host.current, { camera: [0, 3, 8.5], minDistance: 3, maxDistance: 20 });
    lab.current = s;
    const nucleonGeo = new SphereGeometry(0.2, 14, 10);
    const protonMat = s.mesh(PARTS.proton.color, { emissiveIntensity: 0 });
    const neutronMat = s.mesh(PARTS.neutronIn.color, { emissiveIntensity: 0 });
    const glowSync = () => { protonMat.emissive.copy(s.color('accent')); neutronMat.emissive.copy(s.color('accent')); };
    glowSync();
    s.onRecolor(glowSync);
    let halves: Group[] = [];
    let radius = 0.2;

    build.current = (id) => {
      halves.forEach((h) => s.scene.remove(h));
      const { A, Z } = NUCLEI[id];
      radius = A === 1 ? 0.2 : 0.21 * Math.cbrt(A);
      const r = mulberry32(A);
      const pts: { p: Vector3; proton: boolean }[] = [];
      for (let i = 0; i < A; i++) {
        let x = 0, y = 0, z = 0;
        if (A > 1) do { x = (r() * 2 - 1) * radius; y = (r() * 2 - 1) * radius; z = (r() * 2 - 1) * radius; } while (x * x + y * y + z * z > radius * radius);
        pts.push({ p: new Vector3(x, y, z), proton: i < Z });
      }
      // Две половины ядра — чтобы при делении разлететься осколками.
      halves = [0, 1].map((side) => {
        const g = new Group();
        const mine = pts.filter((q) => (q.p.x < 0 ? 0 : 1) === side);
        for (const [proton, mat] of [[true, protonMat], [false, neutronMat]] as const) {
          const sel = mine.filter((q) => q.proton === proton);
          if (!sel.length) continue;
          const im = new InstancedMesh(nucleonGeo, mat, sel.length);
          sel.forEach((q, i) => im.setMatrixAt(i, new Matrix4().makeTranslation(q.p.x, q.p.y, q.p.z)));
          im.instanceMatrix.needsUpdate = true;
          g.add(im);
        }
        s.scene.add(g);
        return g;
      });
      s.render();
    };

    const neutronMesh = (r: number) => new Mesh(new SphereGeometry(r, 16, 12), s.mesh(PARTS.neutron.color));
    const incoming = neutronMesh(0.17);
    const outgoing = Array.from({ length: 6 }, () => neutronMesh(0.12));
    const gammas = Array.from({ length: 3 }, () => new Mesh(new SphereGeometry(0.08, 10, 8), s.mesh(PARTS.gamma.color)));
    const alpha = neutronMesh(0.26);
    const movers = [incoming, ...outgoing, ...gammas, alpha];
    s.scene.add(...movers);
    const velocity = new Map<Mesh | Group, Vector3>();
    const hideAll = () => { movers.forEach((m) => { m.visible = false; }); velocity.clear(); halves.forEach((h) => h.position.set(0, 0, 0)); protonMat.emissiveIntensity = neutronMat.emissiveIntensity = 0; };
    const launch = (m: Mesh, speed: number, dir: [number, number, number] = isotropic(rng.current)) => { m.visible = true; m.position.set(0, 0, 0); velocity.set(m, new Vector3(...dir).multiplyScalar(speed)); };

    let raf = 0, last = 0, t = 0, phase: 'in' | 'out' = 'in', channel: Channel = 'el';
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      if (phase === 'in') {
        incoming.position.x += dt * 8;
        if (incoming.position.x >= -radius - 0.1) {
          phase = 'out'; t = 0;
          if (channel === 'el') launch(incoming, NUCLEI[current.current].A === 1 ? 5 : 7);
          else if (channel === 'in') { launch(incoming, 3.5); launch(gammas[0]!, 6); protonMat.emissiveIntensity = neutronMat.emissiveIntensity = 0.5; }
          else {
            incoming.visible = false;
            protonMat.emissiveIntensity = neutronMat.emissiveIntensity = 0.7;
            if (channel === 'cap') gammas.slice(0, 2).forEach((g) => launch(g, 6));
            if (channel === 'fis') { const nu = Math.max(1, sampleNu(rng.current)); outgoing.slice(0, nu).forEach((n) => launch(n, 5)); gammas.forEach((g) => launch(g, 6.5)); }
            if (channel === 'alpha') { const d = isotropic(rng.current); launch(alpha, 4, d); velocity.set(halves[0]!, new Vector3(...d).multiplyScalar(-1.2)); velocity.set(halves[1]!, new Vector3(...d).multiplyScalar(-1.2)); }
          }
        }
      } else {
        for (const [m, v] of velocity) m.position.addScaledVector(v, dt);
        if (channel === 'fis') { halves[0]!.position.x = -t * 1.8; halves[1]!.position.x = t * 1.5; }
        const fade = Math.max(0, protonMat.emissiveIntensity - dt * 0.5);
        protonMat.emissiveIntensity = neutronMat.emissiveIntensity = fade;
        if (t > 1.6) { hideAll(); s.render(); raf = 0; return; }
      }
      s.render();
      raf = requestAnimationFrame(tick);
    };

    play.current = (ch) => {
      cancelAnimationFrame(raf);
      hideAll();
      channel = ch; phase = 'in'; t = 0;
      incoming.visible = true;
      incoming.position.set(-6, (rng.current() - 0.5) * 0.3 * radius, (rng.current() - 0.5) * 0.3 * radius);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    hideAll();
    build.current(nucleus);
    return () => { cancelAnimationFrame(raf); s.dispose(); lab.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Новое ядро или энергия — новая статистика и новое ядро в сцене.
  useEffect(() => {
    setCounts({});
    setStatus({ tone: 'warn', text: 'Нажмите «Запустить 1 нейтрон».' });
    build.current(nucleus);
  }, [nucleus, energy]);

  const one = () => {
    const ch = sampleChannel(list, rng.current);
    setCounts((c) => ({ ...c, [ch]: (c[ch] ?? 0) + 1 }));
    setStatus(DESCRIPTION[ch]);
    if (!no3d && !reducedMotion()) play.current(ch);
  };
  const many = () => setCounts((c) => {
    const next = { ...c };
    for (let i = 0; i < 1000; i++) { const ch = sampleChannel(list, rng.current); next[ch] = (next[ch] ?? 0) + 1; }
    return next;
  });

  return (
    <LabFrame
      n="9.5" kind="3D" title="Что происходит при столкновении"
      actions={<Button variant="ghost" size="sm" onClick={() => lab.current?.resetView()} disabled={no3d}>Сбросить вид</Button>}
      legend={Object.values(PARTS)}
      readout={[{ label: 'столкновений', value: N.toLocaleString('ru-RU') }]}
      table={
        <ul className="sg-channels" aria-label="Доли каналов реакции">
          {list.map(({ channel, p }) => {
            const obs = N ? (counts[channel] ?? 0) / N : 0;
            const err = N ? Math.sqrt(Math.max(p * (1 - p), 1e-12) / N) : 0;
            return (
              <li key={channel}>
                <span className="sg-channel-name">{CHANNEL_NAMES[channel]}</span>
                <span className="sg-channel-nums">ожидание {p < 0.001 ? p.toExponential(1) : `${(100 * p).toFixed(1)} %`} · наблюдение {N ? `${(100 * obs).toFixed(1)} %` : '—'}</span>
                <span className="sg-channel-bar" aria-hidden="true">
                  <span className="sg-channel-fill" style={{ width: `${100 * obs}%` }} />
                  {N > 0 && <span className="sg-channel-err" style={{ left: `${100 * Math.max(0, obs - err)}%`, width: `${100 * (Math.min(1, obs + err) - Math.max(0, obs - err))}%` }} />}
                  <span className="sg-channel-expect" style={{ left: `${100 * p}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      }
      status={status}
      controls={<>
        <Select label="Ядро-мишень" value={nucleus} onChange={(v) => setNucleus(v as NucleusId)} options={Object.entries(NUCLEI).map(([value, n]) => ({ value, label: n.label }))} />
        <Segmented label="Энергия нейтрона" value={energy} onChange={(v) => setEnergy(v as 'thermal' | 'fast')} options={[{ value: 'thermal', label: '0.0253 эВ' }, { value: 'fast', label: '2 МэВ' }]} />
        <div className="sg-lab-buttons">
          <Button variant="primary" size="sm" onClick={one}>Запустить 1 нейтрон</Button>
          <Button size="sm" onClick={many}>+1000 без анимации</Button>
          <Button variant="ghost" size="sm" onClick={() => setCounts({})}>Сбросить статистику</Button>
        </div>
      </>}
      caption="Рис. 9.5. Каждый нейтрон выбирает исход случайно, с вероятностями $\sigma_i/\sigma_t$; сечения — свойство ансамбля, увидеть их можно, только набрав статистику. Полоса — наблюдаемая доля, светлый отрезок — погрешность ±1σ, риска — ожидаемое $\sigma_i/\sigma_t$. Сечения округлены: тепловые — из приложений пособия, при 2 МэВ — приближённые оценённые. Попробуйте ¹⁰B: почти каждый тепловой нейтрон даёт (n, α), поэтому бор — поглотитель в СУЗ и в счётчиках нейтронов."
    >
      <div ref={host} className="sg-scene" role="img" aria-label={`Ядро ${NUCLEI[nucleus].label}, нейтрон ${energy === 'thermal' ? 'тепловой' : '2 МэВ'}; столкновений ${N}`}>
        {no3d && <p className="sg-no3d">3D-сцена недоступна: браузер не поддерживает WebGL. Статистика каналов считается как обычно.</p>}
      </div>
    </LabFrame>
  );
}
