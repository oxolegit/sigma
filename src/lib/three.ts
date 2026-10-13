import {
  AmbientLight, Color, ConeGeometry, CylinderGeometry, DirectionalLight, Group, LineBasicMaterial, LineDashedMaterial, Mesh,
  MeshStandardMaterial, PerspectiveCamera, PointsMaterial, Scene, Vector3, WebGLRenderer,
  type LineBasicMaterialParameters, type LineDashedMaterialParameters, type MeshStandardMaterialParameters,
  type PointsMaterialParameters,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { onThemeChange, token } from './theme';

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export interface LabSceneOptions {
  camera: [number, number, number];
  target?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
}

/**
 * 3D-сцена лаборатории по правилам системы:
 * - прозрачный фон — под сценой виден surface-2 рамки;
 * - вращение мышью и пальцем (OrbitControls), на сцене touch-action: none;
 * - колесо мыши масштабирует только с Ctrl, иначе прокручивается страница;
 * - цвета материалов — из токенов, перекрашиваются при смене темы;
 * - кадр рисуется только по требованию: после поворота, изменения данных, ресайза.
 */
export class LabScene {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  private readonly recolor: (() => void)[] = [];
  private readonly cleanup: (() => void)[] = [];
  private pending = 0;

  constructor(private readonly host: HTMLElement, o: LabSceneOptions) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    this.camera = new PerspectiveCamera(38, 1, 0.01, 500);
    this.camera.position.set(...o.camera);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(...(o.target ?? [0, 0, 0]));
    this.controls.enablePan = false;
    this.controls.minDistance = o.minDistance ?? 2;
    this.controls.maxDistance = o.maxDistance ?? 40;
    this.controls.update();
    this.controls.saveState();
    this.controls.addEventListener('change', () => this.render());

    // Колесо без Ctrl не доходит до OrbitControls (слушатель на холсте внутри host)
    // и прокручивает страницу; с Ctrl — масштаб сцены вместо масштаба браузера.
    const wheelGuard = (e: WheelEvent) => { if (!e.ctrlKey) e.stopPropagation(); };
    host.addEventListener('wheel', wheelGuard, { capture: true });
    this.cleanup.push(() => host.removeEventListener('wheel', wheelGuard, { capture: true }));

    this.scene.add(new AmbientLight(0xffffff, 1.6));
    const key = new DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 6, 5);
    this.scene.add(key);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(host);
    this.cleanup.push(() => ro.disconnect());
    this.cleanup.push(onThemeChange(() => { this.recolor.forEach((f) => f()); this.render(); }));
    this.resize();
  }

  /** Цвет токена: 'accent', 'signal', 'rule-strong'… */
  color(name: string): Color {
    return new Color(token(name) || '#888');
  }

  /** Материал поверхности, цвет которого следует за темой. */
  mesh(name: string, params: MeshStandardMaterialParameters = {}): MeshStandardMaterial {
    const m = new MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...params });
    const apply = () => m.color.copy(this.color(name));
    apply();
    this.recolor.push(apply);
    return m;
  }

  /** Материал линии, цвет которого следует за темой. */
  line(name: string, params: LineBasicMaterialParameters = {}): LineBasicMaterial {
    const m = new LineBasicMaterial(params);
    const apply = () => m.color.copy(this.color(name));
    apply();
    this.recolor.push(apply);
    return m;
  }

  /** Пунктирная линия цвета токена (после смены геометрии нужен computeLineDistances()). */
  dashed(name: string, params: LineDashedMaterialParameters = {}): LineDashedMaterial {
    return this.themed(new LineDashedMaterial({ dashSize: 0.08, gapSize: 0.06, ...params }), name);
  }

  /** Точки цвета токена; size — в единицах сцены. */
  points(name: string, params: PointsMaterialParameters = {}): PointsMaterial {
    return this.themed(new PointsMaterial({ size: 0.08, ...params }), name);
  }

  private themed<M extends { color: Color }>(m: M, name: string): M {
    const apply = () => m.color.copy(this.color(name));
    apply();
    this.recolor.push(apply);
    return m;
  }

  /** Объёмная стрелка цвета токена: set(направление, длина) поворачивает и растягивает её из начала координат. */
  arrow(name: string, radius = 0.03): Group & { set: (dir: Vector3, length: number) => void } {
    const m = this.mesh(name);
    const shaft = new Mesh(new CylinderGeometry(radius, radius, 1, 14), m);
    const head = new Mesh(new ConeGeometry(radius * 2.7, 1, 18), m);
    const g = new Group() as Group & { set: (dir: Vector3, length: number) => void };
    g.add(shaft, head);
    const up = new Vector3(0, 1, 0);
    g.set = (dir, length) => {
      const d = dir.clone().normalize();
      const h = Math.min(length * 0.4, radius * 9);
      shaft.scale.set(1, Math.max(length - h, 1e-3), 1);
      shaft.position.set(0, (length - h) / 2, 0);
      head.scale.set(1, h, 1);
      head.position.set(0, length - h / 2, 0);
      if (d.y < -0.9999) g.quaternion.set(1, 0, 0, 0);
      else g.quaternion.setFromUnitVectors(up, d);
      g.visible = length > 1e-3;
    };
    return g;
  }

  /** Своя перекраска при смене темы (например, цвета вершин треков). */
  onRecolor(fn: () => void) {
    this.recolor.push(fn);
  }

  resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  /** Перерисовать в ближайшем кадре (несколько вызовов подряд — один кадр). */
  render() {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      this.renderer.render(this.scene, this.camera);
    });
  }

  /**
   * Непрерывная анимация: tick(dt, t) и кадр — только пока сцена видна на экране, чтобы не тратить батарею.
   * При prefers-reduced-motion — один статичный кадр в момент t = 0.
   */
  animate(tick: (dt: number, t: number) => void) {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { tick(0, 0); this.render(); return; }
    let raf = 0, last = 0, t = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      tick(dt, t);
      this.renderer.render(this.scene, this.camera);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!e?.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(this.host);
    tick(0, 0);
    this.render();
    this.cleanup.push(() => { io.disconnect(); cancelAnimationFrame(raf); });
  }

  resetView() {
    this.controls.reset();
    this.render();
  }

  dispose() {
    cancelAnimationFrame(this.pending);
    this.cleanup.forEach((f) => f());
    this.controls.dispose();
    this.scene.traverse((obj) => {
      const o = obj as { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
      o.geometry?.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
