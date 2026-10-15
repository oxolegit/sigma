import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useState } from 'react';
import { $answers, resetAnswers, score } from '../../lib/exam';
import { FIXED_VARIANTS, makeVariant } from '../../labs/stats/variants';
import { Button } from '../Button';
import { Progress } from '../Progress';
import { Score } from '../Score';
import SrTask from './SrTask';

/**
 * Вариант самостоятельной: по задаче на каждую тему, числа разыграны от номера варианта.
 * Варианты 1–4 одинаковы у всех — их удобно решать вместе и сверять; «Случайный» даёт новый набор чисел.
 */
export default function SrVariant({ work }: { work: number }) {
  const [variant, setVariant] = useState(1);
  const tasks = useMemo(() => makeVariant(work, variant), [work, variant]);
  const { answered, correct } = score(useStore($answers));
  // Счёт — только этого варианта.
  useEffect(() => { resetAnswers(); }, [variant]);

  const random = () => setVariant(FIXED_VARIANTS + 1 + Math.floor(Math.random() * 9000));
  const label = variant <= FIXED_VARIANTS ? `Вариант ${variant}` : `Случайный вариант № ${variant}`;

  return (
    <div className="sg-variant">
      <div className="sg-exam-sticky">
        <div className="sg-exam-score sg-variant-bar">
          <div className="sg-variant-pick" role="radiogroup" aria-label="Вариант">
            {Array.from({ length: FIXED_VARIANTS }, (_, i) => i + 1).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={v === variant} className={v === variant ? 'is-active' : undefined} onClick={() => setVariant(v)}>
                Вариант {v}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={random}>Случайный</Button>
          </div>
          <div className="sg-exam-score-main"><Score correct={correct} answered={answered} total={tasks.length} /></div>
          <div className="sg-exam-score-bar"><Progress value={answered} total={tasks.length} label="Отвечено" compact /></div>
        </div>
      </div>
      <h2 className="sg-variant-title" aria-live="polite">{label}</h2>
      {tasks.map((t, i) => (
        <SrTask key={`${variant}-${i}`} n={`${i + 1}`} title={t.topic} q={t.q} answers={t.answers} answer={t.answer} hint={t.hint} />
      ))}
    </div>
  );
}
