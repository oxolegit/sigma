import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Rich } from './Rich';
import { TeX } from './TeX';

export interface StepsProps { title?: string; lead?: ReactNode; steps: { note?: ReactNode; tex?: string }[]; initial?: number }

/** Пошаговый вывод: шаги открываются по одному. Пояснения могут содержать `$…$` и `**…**`.
 *  С initial={0} решение скрыто целиком до кнопки «Показать решение» — так в задачах контрольной. */
export function Steps({ title = 'Вывод', lead, steps, initial = 1 }: StepsProps) {
  const start = Math.min(initial, steps.length);
  const [shown, setShown] = useState(start);
  return (
    <section className="rz-steps">
      <div className="rz-steps-head">
        <span className="rz-steps-title">{title}</span>
        <span className="rz-steps-count">{shown} / {steps.length}</span>
      </div>
      {lead && <div className="rz-steps-lead"><Rich>{lead}</Rich></div>}
      {shown > 0 && (
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
      )}
      <div className="rz-steps-actions">
        {shown < steps.length ? (
          <>
            <Button variant="primary" size="sm" onClick={() => setShown(shown + 1)}>{shown === 0 ? 'Показать решение' : 'Следующий шаг'}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShown(steps.length)}>Показать все</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShown(start)}>Свернуть</Button>
        )}
      </div>
    </section>
  );
}
