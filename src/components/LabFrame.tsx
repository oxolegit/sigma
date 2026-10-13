import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Rich } from './Rich';
import { TeX } from './TeX';

export interface Readout { label?: string; tex?: string; value: ReactNode; unit?: string }

/** Пункт легенды. Цвет — имя токена, тот же, которым нарисована серия; форма знака дублирует цвет. */
export interface LegendItem {
  label: ReactNode;
  /** Имя токена без «--»: 'accent', 'signal', 'ink-muted'… */
  color: string;
  /** Форма знака повторяет форму серии: прямая, пунктир, ломаная, линия с точкой на конце, столбец, шарик (частица). */
  mark?: 'line' | 'dash' | 'zigzag' | 'dot' | 'bar' | 'ball';
  value?: ReactNode;
  /** Если задан — пункт становится кнопкой «показать / скрыть серию». */
  onToggle?: () => void;
  hidden?: boolean;
}

export interface LabFrameProps {
  n?: string; title: string; kind?: '2D' | '3D';
  readout?: Readout[]; legend?: LegendItem[]; controls?: ReactNode; actions?: ReactNode; caption?: ReactNode; children: ReactNode;
  /** Вывод из чисел словами: «ƛ ≥ R — нейтрон ведёт себя как волна». Тон — знаком и словом, не только цветом. */
  status?: { tone: 'ok' | 'warn' | 'bad'; text: ReactNode };
}

const STATUS_MARK = { ok: '✓', warn: '!', bad: '✕' } as const;

function Swatch({ color, mark = 'line' }: Pick<LegendItem, 'color' | 'mark'>) {
  const stroke = { stroke: `var(--${color})` } as CSSProperties;
  return (
    <svg className={`rz-legend-mark is-${mark}`} viewBox="0 0 22 12" data-token={color} aria-hidden="true">
      {mark === 'bar' && <rect x="4" y="1" width="14" height="10" style={{ ...stroke, fill: `var(--${color})`, fillOpacity: 0.22 }} />}
      {mark === 'zigzag' && <polyline points="1,9 6,3 11,9 16,3 21,9" style={stroke} />}
      {(mark === 'line' || mark === 'dot') && <line x1="1" y1="6" x2={mark === 'dot' ? 17 : 21} y2="6" style={stroke} />}
      {mark === 'dash' && <line x1="1" y1="6" x2="21" y2="6" strokeDasharray="4 3" style={stroke} />}
      {mark === 'dot' && <circle cx="18" cy="6" r="3" style={{ ...stroke, fill: `var(--${color})` }} />}
      {mark === 'ball' && <circle cx="11" cy="6" r="4.5" style={{ ...stroke, fill: `var(--${color})` }} />}
    </svg>
  );
}

/** Рамка лаборатории: метка, заголовок, сцена, легенда, строка чисел (объявляется скринридером), ручки, подпись. */
export function LabFrame({ n, title, kind, readout, legend, controls, actions, caption, children, status }: LabFrameProps) {
  return (
    <figure className={cx('rz-lab', kind === '3D' && 'rz-lab-3d')}>
      <figcaption className="rz-lab-head">
        <span className="rz-lab-tag">{'Лаборатория' + (n ? ` ${n}` : '') + (kind ? ` · ${kind}` : '')}</span>
        <span className="rz-lab-title">{title}</span>
        {actions && <span className="rz-lab-actions">{actions}</span>}
      </figcaption>
      <div className="rz-lab-stage">{children}</div>
      {legend && (
        <ul className="rz-lab-legend" aria-label="Легенда">
          {legend.map((it, i) => {
            const body = <>
              <Swatch color={it.color} mark={it.mark} />
              <span className="rz-legend-label">{it.label}</span>
              {it.value !== undefined && <span className="rz-legend-value">{it.value}</span>}
            </>;
            return (
              <li key={i}>
                {it.onToggle ? (
                  <button type="button" className={cx('rz-legend-item', it.hidden && 'is-hidden')} aria-pressed={!it.hidden} onClick={it.onToggle}>{body}</button>
                ) : (
                  <span className="rz-legend-item">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {readout && (
        <div className="rz-lab-readout" aria-live="polite">
          {readout.map((r, i) => (
            <span key={i} className="rz-readout">
              <span className="rz-readout-k">{r.tex ? <TeX tex={r.tex} /> : r.label}</span>
              <span className="rz-readout-v">{r.value}</span>
              {r.unit && <span className="rz-readout-u">{r.unit}</span>}
            </span>
          ))}
        </div>
      )}
      {status && (
        <p className={`rz-lab-status is-${status.tone}`} role="status">
          <span className="rz-lab-status-mark" aria-hidden="true">{STATUS_MARK[status.tone]}</span>
          <span><Rich>{status.text}</Rich></span>
        </p>
      )}
      {controls && <div className="rz-lab-controls">{controls}</div>}
      {caption && <p className="rz-lab-caption"><Rich>{caption}</Rich></p>}
    </figure>
  );
}
