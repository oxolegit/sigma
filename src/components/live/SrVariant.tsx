import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useState } from 'react';
import { $answers, resetAnswers, score } from '../../lib/exam';
import { FIXED_VARIANTS } from '../../lib/variants';
import { makeVariant } from '../../labs/variants';
import { Button } from '../Button';
import { Score } from '../Score';
import SrTask from './SrTask';

/**
 * Вариант самостоятельной: по задаче на каждую тему, числа разыграны от номера варианта.
 * Варианты 1–4 одинаковы у всех — их удобно решать вместе и сверять; «Случайный» даёт новый набор чисел.
 */
export default function SrVariant({ course, work }: { course: string; work: number }) {
  const [variant, setVariant] = useState(1);
  const tasks = useMemo(() => makeVariant(course, work, variant), [course, work, variant]);
  const { answered, correct } = score(useStore($answers));
  // Счёт — только этого варианта.
  useEffect(() => { resetAnswers(); }, [variant]);

  const random = () => setVariant(FIXED_VARIANTS + 1 + Math.floor(Math.random() * 9000));
  const label = variant <= FIXED_VARIANTS ? `Вариант ${variant}` : `Случайный вариант № ${variant}`;

  return (
    <div className="sg-variant">
      <div className="sg-exam-sticky">
        <div className="sg-exam-score sg-variant-bar">
          <div className="sg-variant-pick">
            <span className="sg-variant-label" aria-hidden="true">Вариант</span>
            <div className="sg-variant-seg" role="radiogroup" aria-label="Вариант">
              {Array.from({ length: FIXED_VARIANTS }, (_, i) => i + 1).map((v) => (
                <button key={v} type="button" role="radio" aria-label={`Вариант ${v}`} aria-checked={v === variant} className={v === variant ? 'is-active' : undefined} onClick={() => setVariant(v)}>
                  {v}
                </button>
              ))}
            </div>
            <Button variant={variant > FIXED_VARIANTS ? 'primary' : 'ghost'} size="sm" onClick={random}>Случайный</Button>
          </div>
          <Score correct={correct} answered={answered} total={tasks.length} />
        </div>
      </div>
      <h2 className="sg-variant-title" aria-live="polite">{label}</h2>
      {tasks.map((t, i) => (
        <SrTask key={`${variant}-${i}`} n={`${i + 1}`} title={t.topic} q={t.q} answers={t.answers} answer={t.answer} hint={t.hint} />
      ))}
    </div>
  );
}
