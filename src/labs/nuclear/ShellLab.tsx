import { useState } from 'react';
import { LabFrame, Select, Slider, type LegendItem } from '../../components';
import { useCanvas } from '../../lib/canvas';
import { plotFont } from '../../lib/plot';
import { token } from '../../lib/theme';
import { ELEMENTS } from './nuclides';
import { MAGIC, SHELL_LEVELS, levelLabel, levelOf, nuclide, shellModel } from './physics';

/** Ядра задач 3.11–3.13 и пара «трудных» — где простая модель ошибается. */
const PRESETS: [number, number][] = [[3, 1], [7, 3], [13, 6], [25, 12], [29, 14], [39, 19], [45, 21], [63, 29], [2, 1], [6, 3], [10, 5], [14, 7], [22, 11], [26, 13], [17, 8], [23, 11], [55, 25], [107, 47], [235, 92]];

const SERIES = {
  full: { label: 'нуклоны в парах', color: 'ink-muted', mark: 'ball' },
  odd: { label: 'неспаренный нуклон', color: 'accent', mark: 'ball' },
  empty: { label: 'свободное место', color: 'rule-strong', mark: 'dot' },
} as const satisfies Record<string, LegendItem>;

const frac = (j: number) => (Number.isInteger(j) ? String(j) : `${Math.round(2 * j)}/2`);
/** «5/2» → 2.5. */
const jNum = (s: string) => { const [a, b] = s.split('/').map(Number); return b ? a! / b : a!; };
const sign = (P: number) => (P > 0 ? '+' : '−');

/** Сколько уровней рисовать: до конца оболочки, где сидит последний нуклон, и ещё один. */
function levelsToShow(k: number) {
  const { index } = levelOf(Math.max(k, 1));
  let filled = 0, last = index;
  for (let i = 0; i < SHELL_LEVELS.length; i++) {
    filled += 2 * SHELL_LEVELS[i]!.j + 1;
    if (i >= index && MAGIC.includes(filled)) { last = i; break; }
  }
  return Math.min(SHELL_LEVELS.length, last + 2);
}

/** Лаборатория 6.1: заполнить уровни протонами и нейтронами — спин и чётность даёт неспаренный нуклон. */
export default function ShellLab() {
  const [Z, setZ] = useState(19);
  const [N, setN] = useState(20);
  const A = Z + N;
  const r = shellModel(A, Z);
  const tab = nuclide(A, Z);
  const count = Math.max(levelsToShow(Z), levelsToShow(N));

  const ref = useCanvas((g, w, h) => {
    const cols = [{ k: Z, name: `протоны · Z = ${Z}` }, { k: N, name: `нейтроны · N = ${N}` }];
    // Высота уровня и разрывы между оболочками.
    let gaps = 0, acc = 0;
    const gapAfter: boolean[] = [];
    for (let i = 0; i < count; i++) { acc += 2 * SHELL_LEVELS[i]!.j + 1; const m = MAGIC.includes(acc); gapAfter.push(m); if (m && i < count - 1) gaps++; }
    const top = 30, bottom = h - 12;
    const step = (bottom - top) / (count + gaps * 0.8);
    const ys: number[] = [];
    let y = bottom;
    for (let i = 0; i < count; i++) { ys.push(y); y -= step; if (gapAfter[i]) y -= step * 0.8; }
    // Кружки — по самому ёмкому видимому уровню, чтобы на телефоне не мельчить.
    const maxCap = Math.max(...SHELL_LEVELS.slice(0, count).map((L) => 2 * L.j + 1));
    g.save();
    g.font = plotFont(600, 12);
    cols.forEach((c, ci) => {
      const x0 = ci === 0 ? 8 : w / 2 + 8, x1 = ci === 0 ? w / 2 - 8 : w - 8;
      g.fillStyle = token('ink'); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(c.name, (x0 + x1) / 2, 4);
      let filled = 0;
      for (let i = 0; i < count; i++) {
        const L = SHELL_LEVELS[i]!, cap = 2 * L.j + 1, yy = ys[i]!;
        const occ = Math.max(0, Math.min(cap, c.k - filled));
        filled += cap;
        g.fillStyle = token('ink-muted'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = plotFont(500, 11);
        g.fillText(levelLabel(L), x0, yy);
        const sx = x0 + 46, slot = Math.min(18, (x1 - sx - 8) / maxCap);
        g.strokeStyle = token('rule-strong'); g.lineWidth = 1; g.beginPath(); g.moveTo(sx - 4, yy + slot * 0.55); g.lineTo(sx + cap * slot, yy + slot * 0.55); g.stroke();
        for (let s = 0; s < cap; s++) {
          const cx = sx + s * slot + slot / 2;
          const oddOne = s === occ - 1 && occ % 2 === 1;
          g.beginPath(); g.arc(cx, yy, Math.max(2.5, slot * 0.32), 0, 2 * Math.PI);
          if (s < occ) { g.fillStyle = token(oddOne ? SERIES.odd.color : SERIES.full.color); g.fill(); }
          else { g.strokeStyle = token(SERIES.empty.color); g.stroke(); }
        }
        if (gapAfter[i]) { g.fillStyle = token('signal'); g.textAlign = 'right'; g.font = plotFont(600, 11); g.fillText(String(filled), x1, yy - step * 0.9); }
      }
    });
    g.restore();
  }, [Z, N, count]);

  const model = r.kind === 'even' ? '0⁺' : r.kind === 'odd' ? `${frac(r.J)}${sign(r.P)}` : `${frac(r.Jmin)}…${frac(r.Jmax)}, P = ${sign(r.P)}`;
  const tableJP = tab ? `${tab.J}${sign(tab.P)}` : '—';
  const agree = tab && (r.kind === 'even' ? tab.J === '0' : r.kind === 'odd' ? tab.J === frac(r.J) && tab.P === r.P : jNum(tab.J) >= r.Jmin && jNum(tab.J) <= r.Jmax);
  return (
    <LabFrame
      n="6.1" kind="2D" title="Оболочки: спин и чётность ядра" stage="tall"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'ядро', value: `${A}${ELEMENTS[Z] ?? '?'}` },
        { tex: 'J^P', value: model },
        ...(r.kind === 'odd' ? [{ tex: '\\mu_{\\text{Шмидт}}', value: r.mu.toFixed(3), unit: 'μN' }] : []),
        { label: 'по таблице', value: tab ? `${tableJP}${tab.mu !== undefined ? `, μ = ${tab.mu}` : ''}` : 'нет в таблице' },
      ]}
      status={!tab ? undefined : agree ? { tone: 'ok', text: 'Модель угадала спин и чётность основного состояния.' } : { tone: 'warn', text: 'Модель ошиблась: порядок уровней внутри оболочки у этого ядра другой (или ядро деформировано) — так бывает, задачи сборника подобраны там, где модель работает.' }}
      controls={<>
        <Select label="Ядро из задач" value={`${A}-${Z}`} onChange={(v) => { const [a, z] = v.split('-').map(Number) as [number, number]; setZ(z); setN(a - z); }} options={[...(PRESETS.some(([a, z]) => a === A && z === Z) ? [] : [{ value: `${A}-${Z}`, label: `${A}${ELEMENTS[Z] ?? '?'} (своё)` }]), ...PRESETS.map(([a, z]) => ({ value: `${a}-${z}`, label: `${a}${ELEMENTS[z]}` }))]} />
        <Slider label="Протонов Z" min={1} max={92} step={1} value={Z} onChange={setZ} />
        <Slider label="Нейтронов N" min={0} max={146} step={1} value={N} onChange={setN} />
      </>}
      caption="Рис. 6.1. Уровни — как на рис. 3.1 сборника, числа справа — магические 2, 8, 20, 28, 50, 82, 126. Нуклоны одного сорта садятся парами с противоположными моментами, пара даёт ноль. Поэтому спин нечётного ядра — момент $j$ последнего непарного нуклона, чётность — $(-1)^l$. Магнитный момент по Шмидту: $\mu = gj$, $g = g_l \pm (g_s - g_l)/(2l + 1)$."
    >
      <canvas ref={ref} role="img" aria-label={`${A}${ELEMENTS[Z] ?? ''}: J^P = ${model}`} />
    </LabFrame>
  );
}
