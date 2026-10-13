import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Rich } from './Rich';
import { TeX } from './TeX';

export interface Readout { label?: string; tex?: string; value: ReactNode; unit?: string }
export interface LabFrameProps {
  n?: string; title: string; kind?: '2D' | '3D';
  readout?: Readout[]; controls?: ReactNode; actions?: ReactNode; caption?: ReactNode; children: ReactNode;
}

/** Рамка лаборатории: метка, заголовок, сцена, строка чисел (объявляется скринридером), ручки, подпись. */
export function LabFrame({ n, title, kind, readout, controls, actions, caption, children }: LabFrameProps) {
  return (
    <figure className={cx('rz-lab', kind === '3D' && 'rz-lab-3d')}>
      <figcaption className="rz-lab-head">
        <span className="rz-lab-tag">{'Лаборатория' + (n ? ` ${n}` : '') + (kind ? ` · ${kind}` : '')}</span>
        <span className="rz-lab-title">{title}</span>
        {actions && <span className="rz-lab-actions">{actions}</span>}
      </figcaption>
      <div className="rz-lab-stage">{children}</div>
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
      {controls && <div className="rz-lab-controls">{controls}</div>}
      {caption && <p className="rz-lab-caption"><Rich>{caption}</Rich></p>}
    </figure>
  );
}
