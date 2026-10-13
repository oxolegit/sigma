import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Rich } from './Rich';
import { TeX } from './TeX';

export interface StepsProps { title?: string; lead?: ReactNode; steps: { note?: ReactNode; tex?: string }[]; initial?: number }

/** Пошаговый вывод: шаги открываются по одному. Пояснения могут содержать `$…$`. */
export function Steps({ title = 'Вывод', lead, steps, initial = 1 }: StepsProps) {
  const [shown, setShown] = useState(Math.min(initial, steps.length));
  return (
    <section className="rz-steps">
      <div className="rz-steps-head">
        <span className="rz-steps-title">{title}</span>
        <span className="rz-steps-count">{shown} / {steps.length}</span>
      </div>
      {lead && <div className="rz-steps-lead"><Rich>{lead}</Rich></div>}
      <ol className="rz-steps-list">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i} className="rz-step">
            <span className="rz-step-n">{i + 1}</span>
            <div className="rz-step-body">
              {s.note && <p className="rz-step-note"><Rich>{s.note}</Rich></p>}
              {s.tex && <TeX tex={s.tex} block />}
            </div>
          </li>
        ))}
      </ol>
      <div className="rz-steps-actions">
        {shown < steps.length ? (
          <>
            <Button variant="primary" size="sm" onClick={() => setShown(shown + 1)}>Следующий шаг</Button>
            <Button variant="ghost" size="sm" onClick={() => setShown(steps.length)}>Показать все</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShown(1)}>Свернуть</Button>
        )}
      </div>
    </section>
  );
}
