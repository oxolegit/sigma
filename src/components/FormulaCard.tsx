import type { ReactNode } from 'react';
import { Rich } from './Rich';
import { TeX } from './TeX';

export interface FormulaCardProps { n?: string; title: string; tex: string; ref?: string; note?: ReactNode }

/** Формула в шпаргалке: номер, название, параграф, выносная формула, примечание. */
export function FormulaCard({ n, title, tex, ref, note }: FormulaCardProps) {
  return (
    <div className="rz-fcard">
      <div className="rz-fcard-head">
        {n && <span className="rz-fcard-n">{n}</span>}
        <span className="rz-fcard-title">{title}</span>
        {ref && <span className="rz-fcard-ref">{ref}</span>}
      </div>
      <TeX tex={tex} block />
      {note && <p className="rz-fcard-note"><Rich>{note}</Rich></p>}
    </div>
  );
}
